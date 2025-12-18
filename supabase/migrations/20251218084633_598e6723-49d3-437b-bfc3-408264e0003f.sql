-- Add dispute columns to escrow_contracts
ALTER TABLE public.escrow_contracts 
ADD COLUMN IF NOT EXISTS dispute_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dispute_opened_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz DEFAULT NULL;

-- Create escrow_disputes table for detailed dispute tracking
CREATE TABLE public.escrow_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id uuid REFERENCES public.escrow_contracts(id) ON DELETE CASCADE NOT NULL,
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  description text,
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  admin_id uuid DEFAULT NULL,
  admin_decision text DEFAULT NULL,
  admin_notes text DEFAULT NULL,
  buyer_refund_percent numeric DEFAULT 0,
  seller_payment_percent numeric DEFAULT 0,
  resolution_type text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL
);

-- Create dispute_messages table for communication
CREATE TABLE public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES public.escrow_disputes(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  attachments text[] DEFAULT '{}',
  is_admin_message boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for escrow_disputes
CREATE POLICY "Participants can view their disputes"
ON public.escrow_disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.escrow_contracts ec
    WHERE ec.id = escrow_disputes.escrow_id
    AND (ec.buyer_id = auth.uid() OR ec.seller_id = auth.uid())
  )
);

CREATE POLICY "Participants can create disputes"
ON public.escrow_disputes FOR INSERT
WITH CHECK (
  auth.uid() = opened_by AND
  EXISTS (
    SELECT 1 FROM public.escrow_contracts ec
    WHERE ec.id = escrow_id
    AND (ec.buyer_id = auth.uid() OR ec.seller_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all disputes"
ON public.escrow_disputes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all disputes"
ON public.escrow_disputes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for dispute_messages
CREATE POLICY "Participants can view dispute messages"
ON public.dispute_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.escrow_disputes ed
    JOIN public.escrow_contracts ec ON ec.id = ed.escrow_id
    WHERE ed.id = dispute_messages.dispute_id
    AND (ec.buyer_id = auth.uid() OR ec.seller_id = auth.uid())
  )
);

CREATE POLICY "Participants can send messages"
ON public.dispute_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.escrow_disputes ed
    JOIN public.escrow_contracts ec ON ec.id = ed.escrow_id
    WHERE ed.id = dispute_id
    AND (ec.buyer_id = auth.uid() OR ec.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Admins can view all messages"
ON public.dispute_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can send messages"
ON public.dispute_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_escrow_disputes_escrow_id ON public.escrow_disputes(escrow_id);
CREATE INDEX idx_escrow_disputes_status ON public.escrow_disputes(status);
CREATE INDEX idx_dispute_messages_dispute_id ON public.dispute_messages(dispute_id);

-- Update trigger for escrow_disputes
CREATE TRIGGER update_escrow_disputes_updated_at
BEFORE UPDATE ON public.escrow_disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();