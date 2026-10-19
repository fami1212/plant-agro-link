DROP POLICY IF EXISTS "Verified members can view profiles" ON public.profiles;
CREATE OR REPLACE FUNCTION public.get_farmer_directory()
RETURNS TABLE(user_id uuid, full_name text, address text, avatar_url text, is_verified boolean, crops_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT p.user_id, COALESCE(NULLIF(p.full_name,''),'Utilisateur'), NULL::text, p.avatar_url,
 EXISTS(SELECT 1 FROM public.kyc_verifications k WHERE k.user_id=p.user_id AND k.status='approved'),
 (SELECT count(*)::integer FROM public.crops c WHERE c.user_id=p.user_id)
 FROM public.profiles p
 WHERE auth.uid() IS NOT NULL AND (public.is_user_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'))
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id AND r.role='agriculteur');
$$;
REVOKE ALL ON FUNCTION public.get_farmer_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_farmer_directory() TO authenticated, service_role;

CREATE TABLE public.production_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 field_id uuid NOT NULL REFERENCES public.fields(id),
 label text NOT NULL,
 category text NOT NULL DEFAULT 'autre',
 planned_amount numeric NOT NULL DEFAULT 0 CHECK(planned_amount>=0),
 actual_amount numeric NOT NULL DEFAULT 0 CHECK(actual_amount>=0),
 currency text NOT NULL DEFAULT 'XOF' CHECK(currency='XOF'),
 budget_date date NOT NULL DEFAULT CURRENT_DATE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_budgets TO authenticated;
GRANT ALL ON public.production_budgets TO service_role;
ALTER TABLE public.production_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage production budgets" ON public.production_budgets FOR ALL TO authenticated
USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.fields f WHERE f.id=field_id AND f.user_id=auth.uid()));
CREATE INDEX production_budgets_owner_field ON public.production_budgets(user_id,field_id);
CREATE TRIGGER production_budgets_updated BEFORE UPDATE ON public.production_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_budgets;

CREATE OR REPLACE FUNCTION public.validate_owned_sensor_config() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.min_value IS NOT NULL AND NEW.max_value IS NOT NULL AND NEW.min_value > NEW.max_value THEN
 RAISE EXCEPTION 'Le minimum ne peut pas dépasser le maximum'; END IF;
 IF NEW.device_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.iot_devices d WHERE d.id=NEW.device_id AND d.owner_id=NEW.user_id) THEN
 RAISE EXCEPTION 'Le capteur doit appartenir au propriétaire des seuils'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_owned_sensor_config BEFORE INSERT OR UPDATE ON public.iot_alert_configs FOR EACH ROW EXECUTE FUNCTION public.validate_owned_sensor_config();

CREATE OR REPLACE FUNCTION public.alert_on_sensor_reading() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid; cfg record; alert_id uuid; msg text;
BEGIN
 SELECT owner_id INTO owner FROM public.iot_devices WHERE id=NEW.device_id AND is_active=true;
 IF owner IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.device_id::text || ':' || NEW.metric,0));
 SELECT * INTO cfg FROM public.iot_alert_configs WHERE user_id=owner AND metric=NEW.metric AND is_enabled=true AND (device_id=NEW.device_id OR device_id IS NULL) ORDER BY device_id NULLS LAST, created_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN NEW; END IF;
 IF (cfg.min_value IS NOT NULL AND NEW.value < cfg.min_value) OR (cfg.max_value IS NOT NULL AND NEW.value > cfg.max_value) THEN
 SELECT id INTO alert_id FROM public.iot_alerts WHERE device_id=NEW.device_id AND user_id=owner AND metric=NEW.metric AND is_resolved=false ORDER BY created_at DESC LIMIT 1;
 msg := format('%s : %s %s — seuil dépassé', NEW.metric,NEW.value,COALESCE(NEW.unit,''));
 IF alert_id IS NULL THEN
 INSERT INTO public.iot_alerts(device_id,user_id,metric,threshold_min,threshold_max,current_value,severity,message,is_resolved)
 VALUES(NEW.device_id,owner,NEW.metric,cfg.min_value,cfg.max_value,NEW.value,'warning',msg,false) RETURNING id INTO alert_id;
 INSERT INTO public.notifications(user_id,title,message,type,link,metadata)
 VALUES(owner,'Alerte capteur',msg,'iot_alert','/iot',jsonb_build_object('device_id',NEW.device_id,'alert_id',alert_id));
 ELSE
 UPDATE public.iot_alerts SET current_value=NEW.value,threshold_min=cfg.min_value,threshold_max=cfg.max_value,message=msg WHERE id=alert_id;
 END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.alert_on_sensor_reading() FROM PUBLIC;
CREATE TRIGGER alert_on_sensor_reading AFTER INSERT ON public.device_data FOR EACH ROW EXECUTE FUNCTION public.alert_on_sensor_reading();