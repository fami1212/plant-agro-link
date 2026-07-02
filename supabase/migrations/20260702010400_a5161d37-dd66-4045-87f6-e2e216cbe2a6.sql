
-- ============================================================
-- Unified transaction engine (products / investments / vet services)
-- ============================================================

CREATE TYPE public.transaction_type AS ENUM (
  'PRODUCT_SALE', 'INVESTMENT', 'VET_SERVICE'
);

CREATE TYPE public.transaction_status AS ENUM (
  'DRAFT', 'NEGOTIATION', 'CONTRACT_PENDING', 'SIGNED',
  'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED'
);

CREATE TYPE public.milestone_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'
);

-- --------- transactions ------------------------------------
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'DRAFT',
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  title TEXT,
  description TEXT,
  -- Origin references (only one filled depending on type)
  listing_id UUID,
  opportunity_id UUID,
  booking_id UUID,
  -- Escrow
  escrow_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  amount_locked NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_released NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Contract
  contract_hash TEXT,
  contract_blockchain_tx TEXT,
  signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_initiator ON public.transactions(initiator_id);
CREATE INDEX idx_tx_receiver ON public.transactions(receiver_id);
CREATE INDEX idx_tx_status ON public.transactions(status);
CREATE INDEX idx_tx_type ON public.transactions(type);

GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties or admin can view transactions"
ON public.transactions FOR SELECT TO authenticated
USING (
  auth.uid() = initiator_id
  OR auth.uid() = receiver_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Parties can create their own transaction"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = initiator_id OR auth.uid() = receiver_id);

CREATE POLICY "Parties or admin can update transactions"
ON public.transactions FOR UPDATE TO authenticated
USING (
  auth.uid() = initiator_id
  OR auth.uid() = receiver_id
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------- milestones --------------------------------------
CREATE TABLE public.transaction_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  amount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.milestone_status NOT NULL DEFAULT 'PENDING',
  validator_role TEXT NOT NULL DEFAULT 'buyer',
  proof_url TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, order_index)
);

CREATE INDEX idx_ms_tx ON public.transaction_milestones(transaction_id);

GRANT SELECT, INSERT, UPDATE ON public.transaction_milestones TO authenticated;
GRANT ALL ON public.transaction_milestones TO service_role;

ALTER TABLE public.transaction_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties or admin view milestones"
ON public.transaction_milestones FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_id
    AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Parties or admin manage milestones"
ON public.transaction_milestones FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_id
    AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Parties or admin update milestones"
ON public.transaction_milestones FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.id = transaction_id
    AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid()
         OR public.has_role(auth.uid(), 'admin'))
));

CREATE TRIGGER trg_ms_updated_at
BEFORE UPDATE ON public.transaction_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------- helper: seed default milestones -----------------
CREATE OR REPLACE FUNCTION public.seed_default_milestones(_tx_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = _tx_id;
  IF tx IS NULL THEN RETURN; END IF;

  -- Idempotent: skip if milestones already exist
  IF EXISTS (SELECT 1 FROM public.transaction_milestones WHERE transaction_id = _tx_id) THEN
    RETURN;
  END IF;

  IF tx.type = 'PRODUCT_SALE' THEN
    INSERT INTO public.transaction_milestones (transaction_id, order_index, label, amount_percent, amount, validator_role) VALUES
      (_tx_id, 1, 'Accord sur le prix', 0, 0, 'seller'),
      (_tx_id, 2, 'Acompte payé (escrow)', 30, tx.amount * 0.30, 'buyer'),
      (_tx_id, 3, 'Livraison', 0, 0, 'seller'),
      (_tx_id, 4, 'Validation acheteur', 0, 0, 'buyer'),
      (_tx_id, 5, 'Paiement libéré', 70, tx.amount * 0.70, 'admin');

  ELSIF tx.type = 'INVESTMENT' THEN
    INSERT INTO public.transaction_milestones (transaction_id, order_index, label, amount_percent, amount, validator_role) VALUES
      (_tx_id, 1, 'Contrat signé', 0, 0, 'buyer'),
      (_tx_id, 2, 'Déblocage 1 — achat intrants', 30, tx.amount * 0.30, 'admin'),
      (_tx_id, 3, 'Déblocage 2 — mi-parcours', 40, tx.amount * 0.40, 'admin'),
      (_tx_id, 4, 'Déblocage 3 — récolte / vente', 30, tx.amount * 0.30, 'admin'),
      (_tx_id, 5, 'Remboursement + rendement', 0, 0, 'buyer');

  ELSIF tx.type = 'VET_SERVICE' THEN
    INSERT INTO public.transaction_milestones (transaction_id, order_index, label, amount_percent, amount, validator_role) VALUES
      (_tx_id, 1, 'Devis accepté', 0, 0, 'buyer'),
      (_tx_id, 2, 'Acompte (escrow)', 50, tx.amount * 0.50, 'buyer'),
      (_tx_id, 3, 'Intervention réalisée', 0, 0, 'seller'),
      (_tx_id, 4, 'Validation client', 0, 0, 'buyer'),
      (_tx_id, 5, 'Solde libéré', 50, tx.amount * 0.50, 'admin');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_default_milestones(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_default_milestones(UUID) TO authenticated;
