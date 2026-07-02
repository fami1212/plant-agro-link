
-- 1) Detect duplicate KYC id_number across different users; alert admins
CREATE OR REPLACE FUNCTION public.notify_admins_kyc_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dup_user uuid;
  admin_rec RECORD;
BEGIN
  IF NEW.id_number IS NULL OR NEW.status NOT IN ('submitted','approved') THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO dup_user FROM public.kyc_verifications
  WHERE id_number = NEW.id_number
    AND user_id <> NEW.user_id
    AND status IN ('submitted','approved')
  LIMIT 1;

  IF dup_user IS NOT NULL THEN
    FOR admin_rec IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        admin_rec.user_id,
        'kyc_duplicate',
        '⚠️ Doublon KYC détecté',
        'Le numéro d''identité "' || NEW.id_number || '" est utilisé par plusieurs comptes.',
        jsonb_build_object(
          'id_number', NEW.id_number,
          'new_user_id', NEW.user_id,
          'existing_user_id', dup_user,
          'kyc_id', NEW.id
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kyc_duplicate_check ON public.kyc_verifications;
CREATE TRIGGER trg_kyc_duplicate_check
AFTER INSERT OR UPDATE OF status, id_number ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_kyc_duplicate();

-- 2) Helper for the app to fetch duplicate groups (admin only)
CREATE OR REPLACE FUNCTION public.get_kyc_duplicate_groups()
RETURNS TABLE(id_number text, user_ids uuid[], count int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id_number,
         array_agg(user_id) AS user_ids,
         count(*)::int AS count
  FROM public.kyc_verifications
  WHERE id_number IS NOT NULL
    AND status IN ('submitted','approved')
  GROUP BY id_number
  HAVING count(*) > 1;
$$;

REVOKE ALL ON FUNCTION public.get_kyc_duplicate_groups() FROM public;
GRANT EXECUTE ON FUNCTION public.get_kyc_duplicate_groups() TO authenticated;
