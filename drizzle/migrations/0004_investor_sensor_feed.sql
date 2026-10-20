CREATE OR REPLACE FUNCTION public.get_investor_sensor_feed()
RETURNS TABLE(investment_id uuid, title text, status text, amount_invested numeric, expected_harvest_date date,
  farmer_id uuid, farmer_name text, field_id uuid, field_name text, crop_name text,
  device_id uuid, device_name text, device_type text, is_active boolean, last_seen_at timestamptz,
  metric text, value numeric, unit text, recorded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH inv AS (
    SELECT i.*, COALESCE(c.field_id, i.field_id) AS fid, c.name AS cname
    FROM investments i LEFT JOIN crops c ON c.id = i.crop_id
    WHERE i.investor_id = auth.uid() AND i.status NOT IN ('rembourse','annule','cancelled')
  ),
  latest AS (
    SELECT DISTINCT ON (dd.device_id, dd.metric) dd.device_id, dd.metric, dd.value, dd.unit, dd.recorded_at
    FROM device_data dd
    WHERE dd.device_id IN (SELECT d.id FROM iot_devices d JOIN inv ON d.field_id = inv.fid AND d.owner_id = inv.farmer_id)
      AND dd.recorded_at > now() - interval '30 days'
    ORDER BY dd.device_id, dd.metric, dd.recorded_at DESC
  )
  SELECT inv.id, inv.title, inv.status, inv.amount_invested, inv.expected_harvest_date,
    inv.farmer_id, COALESCE(NULLIF(p.full_name,''),'Utilisateur'), inv.fid, f.name, inv.cname,
    d.id, COALESCE(d.name, d.device_type), d.device_type, d.is_active, d.last_seen_at,
    l.metric, l.value, l.unit, l.recorded_at
  FROM inv
  LEFT JOIN profiles p ON p.user_id = inv.farmer_id
  LEFT JOIN fields f ON f.id = inv.fid
  LEFT JOIN iot_devices d ON d.field_id = inv.fid AND d.owner_id = inv.farmer_id
  LEFT JOIN latest l ON l.device_id = d.id
$$;
REVOKE ALL ON FUNCTION public.get_investor_sensor_feed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_investor_sensor_feed() TO authenticated, service_role;