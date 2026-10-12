-- 1. Signup can never grant admin; unknown roles fall back to agriculteur
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _requested text := NEW.raw_user_meta_data->>'role';
  _role public.app_role;
BEGIN
  IF _requested IN ('agriculteur','investisseur','acheteur','veterinaire') THEN
    _role := _requested::public.app_role;
  ELSE
    _role := 'agriculteur';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (NEW.id, left(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 120),
          left(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone), 30), NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  INSERT INTO public.kyc_verifications (user_id, role_requested, full_name, status)
  VALUES (NEW.id, _role, left(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 120), 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. Users cannot approve themselves or touch review fields
CREATE OR REPLACE FUNCTION public.guard_kyc_user_changes()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.admin_notes := NULL;
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('pending','submitted') THEN
    RAISE EXCEPTION 'Seul un administrateur peut valider ou refuser une vérification';
  END IF;
  IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.role_requested IS DISTINCT FROM OLD.role_requested
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Champs réservés à l''administration';
  END IF;
  IF NEW.status = 'submitted' THEN NEW.submitted_at := now(); END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_kyc_user_changes ON public.kyc_verifications;
CREATE TRIGGER trg_guard_kyc_user_changes
BEFORE INSERT OR UPDATE ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.guard_kyc_user_changes();

-- 3. Only verified members can see other members' profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Verified members can view profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));