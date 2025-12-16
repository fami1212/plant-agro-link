-- Create escrow contracts table
CREATE TABLE public.escrow_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.marketplace_offers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  fees NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'funded', 'released', 'refunded', 'disputed')),
  blockchain_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  funded_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  auto_release_after_days INTEGER NOT NULL DEFAULT 7,
  require_delivery_confirmation BOOLEAN NOT NULL DEFAULT true,
  dispute_window_days INTEGER NOT NULL DEFAULT 3,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create blockchain transactions history table
CREATE TABLE public.blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('investment', 'harvest', 'traceability', 'repayment', 'vet_intervention', 'escrow_created', 'escrow_funded', 'escrow_released', 'escrow_refunded', 'delivery_confirmed')),
  escrow_id UUID REFERENCES public.escrow_contracts(id) ON DELETE SET NULL,
  user_id UUID,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create escrow events table for audit trail
CREATE TABLE public.escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.escrow_contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'funded', 'delivery_confirmed', 'released', 'refund_requested', 'refunded', 'disputed')),
  actor_id UUID NOT NULL,
  hash TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_events ENABLE ROW LEVEL SECURITY;

-- Escrow contracts policies
CREATE POLICY "Users can view their escrow contracts"
ON public.escrow_contracts FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create escrow contracts"
ON public.escrow_contracts FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update escrow contracts"
ON public.escrow_contracts FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all escrow contracts"
ON public.escrow_contracts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Blockchain transactions policies
CREATE POLICY "Users can view their blockchain transactions"
ON public.blockchain_transactions FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.escrow_contracts 
  WHERE escrow_contracts.id = blockchain_transactions.escrow_id 
  AND (escrow_contracts.buyer_id = auth.uid() OR escrow_contracts.seller_id = auth.uid())
));

CREATE POLICY "Users can create blockchain transactions"
ON public.blockchain_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all blockchain transactions"
ON public.blockchain_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Escrow events policies
CREATE POLICY "Users can view events for their escrows"
ON public.escrow_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.escrow_contracts 
  WHERE escrow_contracts.id = escrow_events.escrow_id 
  AND (escrow_contracts.buyer_id = auth.uid() OR escrow_contracts.seller_id = auth.uid())
));

CREATE POLICY "Participants can create escrow events"
ON public.escrow_events FOR INSERT
WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Admins can view all escrow events"
ON public.escrow_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_escrow_contracts_buyer ON public.escrow_contracts(buyer_id);
CREATE INDEX idx_escrow_contracts_seller ON public.escrow_contracts(seller_id);
CREATE INDEX idx_escrow_contracts_status ON public.escrow_contracts(status);
CREATE INDEX idx_blockchain_transactions_type ON public.blockchain_transactions(transaction_type);
CREATE INDEX idx_escrow_events_escrow ON public.escrow_events(escrow_id);