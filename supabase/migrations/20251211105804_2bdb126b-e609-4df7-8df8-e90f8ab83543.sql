-- Add 'investisseur' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'investisseur';

-- Create intrants/inputs listing table for real data
CREATE TABLE IF NOT EXISTS public.marketplace_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category public.input_category NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'unité',
  supplier_name TEXT NOT NULL,
  location TEXT,
  location_gps POINT,
  available BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  images TEXT[],
  contact_phone TEXT,
  contact_whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_inputs ENABLE ROW LEVEL SECURITY;

-- RLS policies for inputs
CREATE POLICY "Anyone can view available inputs"
  ON public.marketplace_inputs FOR SELECT
  USING (available = true);

CREATE POLICY "Users can view their own inputs"
  ON public.marketplace_inputs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create inputs"
  ON public.marketplace_inputs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their inputs"
  ON public.marketplace_inputs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their inputs"
  ON public.marketplace_inputs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_inputs_updated_at
  BEFORE UPDATE ON public.marketplace_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create IoT alerts table
CREATE TABLE IF NOT EXISTS public.iot_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.iot_devices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  metric TEXT NOT NULL,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  current_value NUMERIC,
  severity TEXT DEFAULT 'warning',
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for alerts
ALTER TABLE public.iot_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for IoT alerts
CREATE POLICY "Users can view their own alerts"
  ON public.iot_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create alerts for their devices"
  ON public.iot_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their alerts"
  ON public.iot_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their alerts"
  ON public.iot_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Create alert thresholds configuration table
CREATE TABLE IF NOT EXISTS public.iot_alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id UUID REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  min_value NUMERIC,
  max_value NUMERIC,
  is_enabled BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  notification_push BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id, metric)
);

-- Enable RLS
ALTER TABLE public.iot_alert_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for alert configs
CREATE POLICY "Users can view their own configs"
  ON public.iot_alert_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their configs"
  ON public.iot_alert_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their configs"
  ON public.iot_alert_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their configs"
  ON public.iot_alert_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_iot_alert_configs_updated_at
  BEFORE UPDATE ON public.iot_alert_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();