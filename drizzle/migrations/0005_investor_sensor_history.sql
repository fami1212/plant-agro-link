CREATE OR REPLACE FUNCTION public.get_investor_sensor_history(_device_id uuid, _days integer DEFAULT 30, _limit integer DEFAULT 500)
RETURNS TABLE(device_id uuid, metric text, value numeric, unit text, recorded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT dd.device_id, dd.metric, dd.value, dd.unit, dd.recorded_at
  FROM public.device_data dd
  WHERE dd.device_id = _device_id
    AND dd.recorded_at >= now() - make_interval(days => LEAST(GREATEST(COALESCE(_days, 30), 1), 365))
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.iot_devices d
      JOIN public.investments i ON i.investor_id = auth.uid()
        AND i.farmer_id = d.owner_id
        AND i.status NOT IN ('rembourse', 'annule', 'cancelled')
      LEFT JOIN public.crops c ON c.id = i.crop_id
      WHERE d.id = dd.device_id
        AND d.field_id = COALESCE(c.field_id, i.field_id)
    )
  ORDER BY dd.recorded_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 500), 1), 1000)
$$;
REVOKE ALL ON FUNCTION public.get_investor_sensor_history(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_investor_sensor_history(uuid, integer, integer) TO authenticated, service_role;