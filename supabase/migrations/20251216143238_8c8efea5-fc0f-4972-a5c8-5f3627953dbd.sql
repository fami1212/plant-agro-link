-- Add payment_status to marketplace_offers if not exists
ALTER TABLE public.marketplace_offers 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add payment_status to service_bookings if not exists
ALTER TABLE public.service_bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Create a function to recalculate opportunity amounts from investments
CREATE OR REPLACE FUNCTION public.recalculate_opportunity_amount(opp_id UUID)
RETURNS void AS $$
DECLARE
  total_invested NUMERIC;
  target NUMERIC;
BEGIN
  -- Get sum of all investments linked to this opportunity
  SELECT COALESCE(SUM(amount_invested), 0) INTO total_invested
  FROM public.investments
  WHERE title = (SELECT title FROM public.investment_opportunities WHERE id = opp_id);

  -- Get target amount
  SELECT target_amount INTO target
  FROM public.investment_opportunities WHERE id = opp_id;

  -- Update the opportunity
  UPDATE public.investment_opportunities
  SET current_amount = total_invested,
      status = CASE WHEN total_invested >= target THEN 'financee' ELSE 'ouverte' END
  WHERE id = opp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;