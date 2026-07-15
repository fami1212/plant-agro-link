
CREATE POLICY "Users manage own kyc files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );
