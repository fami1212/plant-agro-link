ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS trace_ref TEXT;

UPDATE public.transactions
SET trace_ref = 'PLT-' || upper(substr(replace(id::text,'-',''),1,10))
WHERE trace_ref IS NULL;

CREATE OR REPLACE FUNCTION public.set_transaction_trace_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.trace_ref IS NULL THEN
    NEW.trace_ref := 'PLT-' || upper(substr(replace(NEW.id::text,'-',''),1,10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_trace_ref ON public.transactions;
CREATE TRIGGER trg_tx_trace_ref
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_transaction_trace_ref();

-- Notify both parties when a milestone is completed
CREATE OR REPLACE FUNCTION public.notify_milestone_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  pct INT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN
    SELECT * INTO tx FROM public.transactions WHERE id = NEW.transaction_id;
    IF tx IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(ROUND(100.0 * SUM(CASE WHEN status='COMPLETED' THEN amount_percent ELSE 0 END) / NULLIF(SUM(amount_percent),0)), 0)
      INTO pct
    FROM public.transaction_milestones WHERE transaction_id = NEW.transaction_id;

    INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
    SELECT u, 'escrow_step',
      '🔒 Étape escrow validée',
      'Étape « ' || NEW.label || ' » validée pour « ' || COALESCE(tx.title,'transaction') || ' ». ' ||
      COALESCE(pct,0) || '% des fonds débloqués.',
      '/transactions',
      jsonb_build_object('transaction_id', NEW.transaction_id, 'milestone_id', NEW.id, 'percent_released', pct)
    FROM unnest(ARRAY[tx.initiator_id, tx.receiver_id]) AS u;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_milestone ON public.transaction_milestones;
CREATE TRIGGER trg_notify_milestone
AFTER UPDATE ON public.transaction_milestones
FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_change();

-- Notify parties on dispute open + admin decision
CREATE OR REPLACE FUNCTION public.notify_dispute_parties()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
  msg TEXT;
  ttl TEXT;
BEGIN
  SELECT * INTO tx FROM public.transactions WHERE id = NEW.transaction_id;
  IF tx IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    ttl := '⚠️ Litige ouvert';
    msg := 'Un litige a été ouvert sur « ' || COALESCE(tx.title,'transaction') || ' » : ' || NEW.reason;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('resolved_buyer','resolved_seller','resolved_split','cancelled') THEN
    ttl := '⚖️ Décision de litige';
    msg := CASE NEW.status
      WHEN 'resolved_buyer' THEN 'Remboursement acheteur ' || COALESCE(NEW.buyer_refund_percent,100) || '% — paiement vendeur annulé.'
      WHEN 'resolved_seller' THEN 'Paiement vendeur libéré à ' || COALESCE(NEW.seller_payment_percent,100) || '%.'
      WHEN 'resolved_split' THEN 'Partage : ' || COALESCE(NEW.buyer_refund_percent,0) || '% remboursés / ' || COALESCE(NEW.seller_payment_percent,0) || '% libérés.'
      ELSE 'Litige annulé, la transaction reprend son cours.'
    END;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  SELECT u, 'dispute', ttl, msg, '/dispute/' || NEW.transaction_id,
         jsonb_build_object('transaction_id', NEW.transaction_id, 'dispute_id', NEW.id, 'status', NEW.status)
  FROM unnest(ARRAY[tx.initiator_id, tx.receiver_id]) AS u;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dispute_parties ON public.transaction_disputes;
CREATE TRIGGER trg_notify_dispute_parties
AFTER INSERT OR UPDATE ON public.transaction_disputes
FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_parties();