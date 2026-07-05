-- Allow authenticated users to view profiles (enables investor network feed, buyer-seller info, vet-farmer info)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);