
-- Auto-create a transaction when an offer is accepted
CREATE OR REPLACE FUNCTION public.tx_from_accepted_offer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tx_id UUID;
  listing_rec RECORD;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    SELECT * INTO listing_rec FROM public.marketplace_listings WHERE id = NEW.listing_id;
    IF listing_rec IS NULL THEN RETURN NEW; END IF;

    INSERT INTO public.transactions (
      type, status, initiator_id, receiver_id, amount, currency,
      title, listing_id, escrow_enabled, metadata
    ) VALUES (
      'PRODUCT_SALE', 'SIGNED', NEW.buyer_id, listing_rec.seller_id,
      COALESCE(NEW.offered_price, listing_rec.price, 0),
      COALESCE(listing_rec.currency, 'XOF'),
      COALESCE(listing_rec.title, 'Vente marketplace'),
      NEW.listing_id, TRUE,
      jsonb_build_object('offer_id', NEW.id, 'quantity', NEW.offered_quantity)
    ) RETURNING id INTO new_tx_id;

    PERFORM public.seed_default_milestones(new_tx_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_from_offer ON public.marketplace_offers;
CREATE TRIGGER trg_tx_from_offer
AFTER UPDATE ON public.marketplace_offers
FOR EACH ROW EXECUTE FUNCTION public.tx_from_accepted_offer();

-- Auto-create a transaction when an investment is created
CREATE OR REPLACE FUNCTION public.tx_from_investment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tx_id UUID;
  opp_rec RECORD;
BEGIN
  SELECT o.*, o.farmer_id AS f_id
  INTO opp_rec
  FROM public.investment_opportunities o
  WHERE o.title = NEW.title
  LIMIT 1;

  INSERT INTO public.transactions (
    type, status, initiator_id, receiver_id, amount, currency,
    title, opportunity_id, escrow_enabled, metadata
  ) VALUES (
    'INVESTMENT', 'SIGNED', NEW.investor_id,
    COALESCE(opp_rec.f_id, NEW.investor_id),
    NEW.amount_invested, 'XOF',
    COALESCE(NEW.title, 'Investissement agricole'),
    opp_rec.id, TRUE,
    jsonb_build_object('investment_id', NEW.id, 'expected_return', NEW.expected_return)
  ) RETURNING id INTO new_tx_id;

  PERFORM public.seed_default_milestones(new_tx_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_from_investment ON public.investments;
CREATE TRIGGER trg_tx_from_investment
AFTER INSERT ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.tx_from_investment();

-- Auto-create a transaction when a vet booking is confirmed
CREATE OR REPLACE FUNCTION public.tx_from_vet_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_tx_id UUID;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    INSERT INTO public.transactions (
      type, status, initiator_id, receiver_id, amount, currency,
      title, booking_id, escrow_enabled, metadata
    ) VALUES (
      'VET_SERVICE', 'SIGNED', NEW.client_id, NEW.provider_id,
      COALESCE(NEW.agreed_price, NEW.estimated_price, 0),
      'XOF',
      COALESCE(NEW.service_type, 'Service vétérinaire'),
      NEW.id, TRUE,
      jsonb_build_object('booking_id', NEW.id)
    ) RETURNING id INTO new_tx_id;

    PERFORM public.seed_default_milestones(new_tx_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tx_from_vet ON public.service_bookings;
CREATE TRIGGER trg_tx_from_vet
AFTER UPDATE ON public.service_bookings
FOR EACH ROW EXECUTE FUNCTION public.tx_from_vet_booking();
