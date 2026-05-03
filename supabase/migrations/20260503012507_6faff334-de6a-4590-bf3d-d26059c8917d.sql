-- service_providers: restrict public listing to authenticated
DROP POLICY IF EXISTS "Anyone can view active providers" ON public.service_providers;
CREATE POLICY "Authenticated can view active providers"
ON public.service_providers
FOR SELECT
TO authenticated
USING (is_active = true);

-- logistics_transporters: restrict public listing to authenticated
DROP POLICY IF EXISTS "Anyone can view available transporters" ON public.logistics_transporters;
CREATE POLICY "Authenticated can view available transporters"
ON public.logistics_transporters
FOR SELECT
TO authenticated
USING (is_available = true);

-- marketplace_inputs: restrict public listing to authenticated
DROP POLICY IF EXISTS "Anyone can view available inputs" ON public.marketplace_inputs;
CREATE POLICY "Authenticated can view available inputs"
ON public.marketplace_inputs
FOR SELECT
TO authenticated
USING (available = true);

-- investment_opportunities: restrict to authenticated
DROP POLICY IF EXISTS "Anyone authenticated can view open opportunities" ON public.investment_opportunities;
CREATE POLICY "Authenticated can view open opportunities"
ON public.investment_opportunities
FOR SELECT
TO authenticated
USING ((status = 'ouverte'::text) OR (auth.uid() = farmer_id));