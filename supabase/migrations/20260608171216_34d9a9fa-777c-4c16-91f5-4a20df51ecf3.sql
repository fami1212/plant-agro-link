DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.device_data; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_alerts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.iot_devices; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blockchain_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.device_data REPLICA IDENTITY FULL;
ALTER TABLE public.iot_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.iot_devices REPLICA IDENTITY FULL;