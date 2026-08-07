DROP POLICY IF EXISTS "Users can create bookings" ON public.service_bookings;

CREATE POLICY "Clients or providers can create bookings"
ON public.service_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id
  OR auth.uid() = (SELECT sp.user_id FROM public.service_providers sp WHERE sp.id = provider_id)
  OR public.has_role(auth.uid(), 'admin')
);