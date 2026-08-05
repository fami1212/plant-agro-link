CREATE OR REPLACE FUNCTION public.notify_admins_investment_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE admin_rec RECORD;
BEGIN
  FOR admin_rec IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_admins_kyc_duplicate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
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
$function$;

CREATE OR REPLACE FUNCTION public.on_dispute_change_tx_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.transactions SET status = 'DISPUTED', updated_at = now()
    WHERE id = NEW.transaction_id;

    INSERT INTO public.notifications (user_id, type, title, message, metadata)
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
$function$;

CREATE OR REPLACE FUNCTION public.tx_from_accepted_offer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_tx_id UUID;
  listing_rec RECORD;
BEGIN
  IF NEW.status = 'acceptee'::public.offer_status
     AND (OLD.status IS DISTINCT FROM 'acceptee'::public.offer_status) THEN
    SELECT * INTO listing_rec FROM public.marketplace_listings WHERE id = NEW.listing_id;
    IF listing_rec IS NULL THEN RETURN NEW; END IF;

    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE listing_id = NEW.listing_id
        AND metadata->>'offer_id' = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.transactions (
      type, status, initiator_id, receiver_id, amount, currency,
      title, listing_id, escrow_enabled, metadata
    ) VALUES (
      'PRODUCT_SALE', 'SIGNED', NEW.buyer_id, NEW.seller_id,
      COALESCE(NEW.counter_offer_price, NEW.proposed_price, listing_rec.price, 0),
      'XOF',
      COALESCE(listing_rec.title, 'Vente marketplace'),
      NEW.listing_id, TRUE,
      jsonb_build_object('offer_id', NEW.id, 'quantity', NEW.proposed_quantity)
    ) RETURNING id INTO new_tx_id;

    PERFORM public.seed_default_milestones(new_tx_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_farmer_directory()
 RETURNS TABLE(user_id uuid, full_name text, address text, avatar_url text, is_verified boolean, crops_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id,
         COALESCE(NULLIF(p.full_name, ''), 'Utilisateur') AS full_name,
         p.address,
         p.avatar_url,
         COALESCE((SELECT k.status = 'approved' FROM public.kyc_verifications k WHERE k.user_id = p.user_id LIMIT 1), false) AS is_verified,
         (SELECT count(*)::int FROM public.crops c WHERE c.user_id = p.user_id) AS crops_count
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'agriculteur'
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_farmer_directory() TO authenticated;