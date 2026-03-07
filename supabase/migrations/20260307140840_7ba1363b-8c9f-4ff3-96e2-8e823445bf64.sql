-- Create listing-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

-- RLS policies for listing-images bucket
CREATE POLICY "Users can upload listing images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view listing images" ON storage.objects FOR SELECT USING (bucket_id = 'listing-images');

CREATE POLICY "Users can delete their listing images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);
