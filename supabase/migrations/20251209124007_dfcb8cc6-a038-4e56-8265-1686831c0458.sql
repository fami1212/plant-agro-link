-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('agriculteur', 'veterinaire', 'acheteur', 'admin');

-- Create enum for soil types
CREATE TYPE public.soil_type AS ENUM ('argileux', 'sableux', 'limoneux', 'calcaire', 'humifere', 'mixte');

-- Create enum for field status
CREATE TYPE public.field_status AS ENUM ('active', 'en_jachère', 'en_préparation', 'inactive');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  location_gps POINT,
  address TEXT,
  preferred_language TEXT DEFAULT 'fr',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agriculteur',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create fields (parcelles) table
CREATE TABLE public.fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location_gps POINT,
  geometry JSONB, -- GeoJSON polygon for precise boundaries
  area_hectares DECIMAL(10,2) NOT NULL,
  soil_type soil_type NOT NULL DEFAULT 'mixte',
  irrigation_system TEXT,
  status field_status DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create IoT devices table
CREATE TABLE public.iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_type TEXT NOT NULL,
  device_token TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create device_data table for sensor readings (time series)
CREATE TABLE public.device_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.iot_devices(id) ON DELETE CASCADE NOT NULL,
  metric TEXT NOT NULL,
  value DECIMAL(12,4) NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_data ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    NEW.email
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'agriculteur'));
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fields_updated_at
  BEFORE UPDATE ON public.fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for fields
CREATE POLICY "Users can view their own fields"
  ON public.fields FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own fields"
  ON public.fields FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fields"
  ON public.fields FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fields"
  ON public.fields FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fields"
  ON public.fields FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for IoT devices
CREATE POLICY "Users can view their own devices"
  ON public.iot_devices FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage their own devices"
  ON public.iot_devices FOR ALL
  USING (auth.uid() = owner_id);

-- RLS Policies for device_data
CREATE POLICY "Users can view data from their devices"
  ON public.device_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.iot_devices
      WHERE iot_devices.id = device_data.device_id
      AND iot_devices.owner_id = auth.uid()
    )
  );

CREATE POLICY "Devices can insert their own data"
  ON public.device_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.iot_devices
      WHERE iot_devices.id = device_data.device_id
      AND iot_devices.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_fields_user_id ON public.fields(user_id);
CREATE INDEX idx_fields_status ON public.fields(status);
CREATE INDEX idx_iot_devices_field_id ON public.iot_devices(field_id);
CREATE INDEX idx_iot_devices_owner_id ON public.iot_devices(owner_id);
CREATE INDEX idx_device_data_device_id ON public.device_data(device_id);
CREATE INDEX idx_device_data_recorded_at ON public.device_data(recorded_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);