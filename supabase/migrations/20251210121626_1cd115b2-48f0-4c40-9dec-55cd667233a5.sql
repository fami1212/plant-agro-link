-- Create crop type enum
CREATE TYPE public.crop_type AS ENUM (
  'cereale',
  'legumineuse', 
  'oleagineux',
  'tubercule',
  'maraicher',
  'fruitier',
  'fourrage',
  'autre'
);

-- Create crop status enum
CREATE TYPE public.crop_status AS ENUM (
  'planifie',
  'seme',
  'en_croissance',
  'floraison',
  'maturation',
  'recolte',
  'termine'
);

-- Create crops table
CREATE TABLE public.crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  crop_type public.crop_type NOT NULL DEFAULT 'autre',
  variety TEXT,
  sowing_date DATE,
  expected_harvest_date DATE,
  actual_harvest_date DATE,
  status public.crop_status NOT NULL DEFAULT 'planifie',
  area_hectares NUMERIC,
  expected_yield_kg NUMERIC,
  actual_yield_kg NUMERIC,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own crops"
ON public.crops FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crops"
ON public.crops FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crops"
ON public.crops FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crops"
ON public.crops FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all crops"
ON public.crops FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_crops_field_id ON public.crops(field_id);
CREATE INDEX idx_crops_user_id ON public.crops(user_id);
CREATE INDEX idx_crops_status ON public.crops(status);

-- Trigger for updated_at
CREATE TRIGGER update_crops_updated_at
BEFORE UPDATE ON public.crops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();