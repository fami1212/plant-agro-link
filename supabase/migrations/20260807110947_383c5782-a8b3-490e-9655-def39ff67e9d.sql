CREATE OR REPLACE FUNCTION public.tx_from_vet_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_tx_id UUID;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    INSERT INTO public.transactions (
      type, status, initiator_id, receiver_id, amount, currency,
      title, booking_id, escrow_enabled, metadata
    )
    SELECT
      'VET_SERVICE', 'SIGNED', NEW.client_id, sp.user_id,
      COALESCE(NEW.price, 0),
      'XOF',
      COALESCE(NEW.service_type, 'Service vétérinaire'),
      NEW.id, TRUE,
      jsonb_build_object('booking_id', NEW.id)
    FROM public.service_providers sp
    WHERE sp.id = NEW.provider_id
    RETURNING id INTO new_tx_id;

    IF new_tx_id IS NOT NULL THEN
      PERFORM public.seed_default_milestones(new_tx_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;