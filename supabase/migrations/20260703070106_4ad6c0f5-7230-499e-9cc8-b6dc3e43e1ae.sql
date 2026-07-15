
-- =========================================================
-- 1. INVESTMENT REQUESTS (investor -> admin -> farmer)
-- =========================================================
CREATE TABLE public.investment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.investment_opportunities(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  message TEXT,
  expected_return NUMERIC,
  duration_months INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','admin_review','negotiating','approved','rejected','contract_created','cancelled')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  farmer_response TEXT,
  farmer_agreed BOOLEAN DEFAULT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_requests TO authenticated;
GRANT ALL ON public.investment_requests TO service_role;

ALTER TABLE public.investment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor creates own requests"
  ON public.investment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Parties and admin can view"
  ON public.investment_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = investor_id
    OR auth.uid() = farmer_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin manages requests"
  ON public.investment_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = farmer_id OR auth.uid() = investor_id)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = farmer_id OR auth.uid() = investor_id);

CREATE POLICY "Admin deletes requests"
  ON public.investment_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_investment_requests_updated
  BEFORE UPDATE ON public.investment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inv_req_investor ON public.investment_requests(investor_id);
CREATE INDEX idx_inv_req_farmer ON public.investment_requests(farmer_id);
CREATE INDEX idx_inv_req_status ON public.investment_requests(status);

-- Notify admins on new investment request
CREATE OR REPLACE FUNCTION public.notify_admins_investment_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_rec RECORD;
BEGIN
  FOR admin_rec IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      admin_rec.user_id,
      'investment_request',
      '💰 Nouvelle demande d''investissement',
      'Un investisseur souhaite investir ' || NEW.amount || ' ' || NEW.currency,
      jsonb_build_object('request_id', NEW.id, 'investor_id', NEW.investor_id, 'farmer_id', NEW.farmer_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_inv_req
  AFTER INSERT ON public.investment_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_investment_request();

-- =========================================================
-- 2. TRANSACTION DISPUTES (unifié pour toutes marketplaces)
-- =========================================================
CREATE TABLE public.transaction_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','under_review','resolved_buyer','resolved_seller','resolved_split','cancelled')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_decision TEXT,
  admin_notes TEXT,
  buyer_refund_percent NUMERIC DEFAULT 0 CHECK (buyer_refund_percent BETWEEN 0 AND 100),
  seller_payment_percent NUMERIC DEFAULT 0 CHECK (seller_payment_percent BETWEEN 0 AND 100),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_disputes TO authenticated;
GRANT ALL ON public.transaction_disputes TO service_role;

ALTER TABLE public.transaction_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties open disputes"
  ON public.transaction_disputes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = opened_by
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
      AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Parties and admin view disputes"
  ON public.transaction_disputes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
      AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Admin manages disputes"
  ON public.transaction_disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tx_disputes_updated
  BEFORE UPDATE ON public.transaction_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages/preuves dans le litige
CREATE TABLE public.transaction_dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.transaction_disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_admin_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.transaction_dispute_messages TO authenticated;
GRANT ALL ON public.transaction_dispute_messages TO service_role;

ALTER TABLE public.transaction_dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties send dispute messages"
  ON public.transaction_dispute_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.transaction_disputes d
      JOIN public.transactions t ON t.id = d.transaction_id
      WHERE d.id = dispute_id
      AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Parties view dispute messages"
  ON public.transaction_dispute_messages FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.transaction_disputes d
      JOIN public.transactions t ON t.id = d.transaction_id
      WHERE d.id = dispute_id
      AND (t.initiator_id = auth.uid() OR t.receiver_id = auth.uid())
    )
  );

CREATE INDEX idx_tx_dispute_tx ON public.transaction_disputes(transaction_id);
CREATE INDEX idx_tx_dispute_msg ON public.transaction_dispute_messages(dispute_id);

-- Passage auto de la transaction en DISPUTED
CREATE OR REPLACE FUNCTION public.on_dispute_change_tx_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.transactions SET status = 'DISPUTED', updated_at = now()
    WHERE id = NEW.transaction_id;

    -- notif admins
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT ur.user_id, 'dispute_opened',
           '⚠️ Litige ouvert',
           'Une transaction est en litige et attend arbitrage.',
           jsonb_build_object('dispute_id', NEW.id, 'transaction_id', NEW.transaction_id)
    FROM public.user_roles ur WHERE ur.role = 'admin';

  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status
        AND NEW.status IN ('resolved_buyer','resolved_seller','resolved_split','cancelled') THEN
    UPDATE public.transactions
      SET status = CASE
        WHEN NEW.status = 'cancelled' THEN 'CANCELLED'
        ELSE 'COMPLETED'
      END,
      completed_at = CASE WHEN NEW.status <> 'cancelled' THEN now() ELSE completed_at END,
      cancelled_at = CASE WHEN NEW.status = 'cancelled' THEN now() ELSE cancelled_at END,
      updated_at = now()
    WHERE id = NEW.transaction_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispute_tx_status
  AFTER INSERT OR UPDATE ON public.transaction_disputes
  FOR EACH ROW EXECUTE FUNCTION public.on_dispute_change_tx_status();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_dispute_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_requests;

-- =========================================================
-- 3. STORAGE POLICIES
-- =========================================================
-- Avatars: chaque user gère son fichier {user_id}/xxx
CREATE POLICY "Avatars: authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatars: users upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars: users update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars: users delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Dispute evidence: parties de la transaction + admins
CREATE POLICY "Dispute evidence: parties upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dispute-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Dispute evidence: admin/uploader read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dispute-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );
