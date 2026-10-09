GRANT SELECT ON public.iot_ingest_log TO authenticated;
CREATE POLICY "Owners read their device ingest log" ON public.iot_ingest_log
FOR SELECT TO authenticated
USING (device_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.iot_devices d WHERE d.id = iot_ingest_log.device_id AND d.owner_id = auth.uid()));