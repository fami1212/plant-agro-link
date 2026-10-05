CREATE TABLE public.iot_ingest_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  device_token text,
  status text NOT NULL DEFAULT 'accepted',
  accepted_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  reason text,
  rejected jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX iot_ingest_log_created_idx ON public.iot_ingest_log(created_at DESC);
GRANT SELECT ON public.iot_ingest_log TO authenticated;
GRANT ALL ON public.iot_ingest_log TO service_role;
ALTER TABLE public.iot_ingest_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ingest log" ON public.iot_ingest_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update devices" ON public.iot_devices FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_ingest_log;