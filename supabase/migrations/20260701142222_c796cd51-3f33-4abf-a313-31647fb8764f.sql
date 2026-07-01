
CREATE TYPE public.kyc_status AS ENUM ('pending', 'submitted', 'approved', 'rejected');

CREATE TABLE public.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  role_requested public.app_role,
  full_name TEXT,
  birth_date DATE,
  id_type TEXT,
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  farm_name TEXT,
  farm_location TEXT,
  farm_size_ha NUMERIC,
  license_number TEXT,
  specialty TEXT,
  company_name TEXT,
  business_reg_number TEXT,
  investor_type TEXT,
  capital_range TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_verifications TO authenticated;
GRANT ALL ON public.kyc_verifications TO service_role;

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own KYC" ON public.kyc_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own KYC" ON public.kyc_verifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending KYC or admin any" ON public.kyc_verifications
  FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status IN ('pending', 'rejected'))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (auth.uid() = user_id AND status IN ('pending', 'submitted', 'rejected'))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_kyc_verifications_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kyc_verifications
    WHERE user_id = _user_id AND status = 'approved'
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'agriculteur');

  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  INSERT INTO public.kyc_verifications (user_id, role_requested, full_name, status)
  VALUES (NEW.id, _role, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

INSERT INTO public.kyc_verifications (user_id, role_requested, status)
SELECT p.user_id, (SELECT role FROM public.user_roles WHERE user_id = p.user_id LIMIT 1), 'pending'
FROM public.profiles p
LEFT JOIN public.kyc_verifications k ON k.user_id = p.user_id
WHERE k.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_verifications;
