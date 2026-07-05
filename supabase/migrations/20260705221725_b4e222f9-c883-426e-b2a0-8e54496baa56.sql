CREATE TABLE public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID,
  signer_name TEXT NOT NULL,
  signer_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contract_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.contract_signatures TO authenticated;
GRANT ALL ON public.contract_signatures TO service_role;

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own signatures"
ON public.contract_signatures FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own signatures"
ON public.contract_signatures FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_contract_sig_target ON public.contract_signatures(target_type, target_id);