-- Add admin policies for service_providers
CREATE POLICY "Admins can update all providers" 
ON public.service_providers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all providers" 
ON public.service_providers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for marketplace_offers
CREATE POLICY "Admins can view all offers" 
ON public.marketplace_offers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all offers" 
ON public.marketplace_offers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policies for marketplace_listings
CREATE POLICY "Admins can update all listings"
ON public.marketplace_listings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all listings"
ON public.marketplace_listings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));