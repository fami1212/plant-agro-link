-- Create livestock species enum
CREATE TYPE public.livestock_species AS ENUM ('bovin', 'ovin', 'caprin', 'volaille', 'porcin', 'equin', 'autre');

-- Create livestock health status enum
CREATE TYPE public.livestock_health_status AS ENUM ('sain', 'malade', 'traitement', 'quarantaine', 'decede');

-- Create livestock table
CREATE TABLE public.livestock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  identifier TEXT NOT NULL,
  species livestock_species NOT NULL DEFAULT 'bovin',
  breed TEXT,
  birth_date DATE,
  weight_kg NUMERIC,
  health_status livestock_health_status NOT NULL DEFAULT 'sain',
  acquisition_date DATE,
  acquisition_price NUMERIC,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create veterinary records table
CREATE TABLE public.veterinary_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livestock_id UUID NOT NULL REFERENCES public.livestock(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  record_type TEXT NOT NULL,
  description TEXT,
  treatment TEXT,
  veterinarian_name TEXT,
  cost NUMERIC,
  next_appointment DATE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create harvest records table for yield tracking
CREATE TABLE public.harvest_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  harvest_date DATE NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  quality_grade TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veterinary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_records ENABLE ROW LEVEL SECURITY;

-- Livestock policies
CREATE POLICY "Users can view their own livestock" ON public.livestock FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own livestock" ON public.livestock FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own livestock" ON public.livestock FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own livestock" ON public.livestock FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all livestock" ON public.livestock FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Vets can view livestock" ON public.livestock FOR SELECT USING (has_role(auth.uid(), 'veterinaire'));

-- Veterinary records policies
CREATE POLICY "Users can view their livestock records" ON public.veterinary_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create records for their livestock" ON public.veterinary_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their records" ON public.veterinary_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their records" ON public.veterinary_records FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Vets can view all vet records" ON public.veterinary_records FOR SELECT USING (has_role(auth.uid(), 'veterinaire'));
CREATE POLICY "Vets can create vet records" ON public.veterinary_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'veterinaire'));

-- Harvest records policies
CREATE POLICY "Users can view their harvest records" ON public.harvest_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create harvest records" ON public.harvest_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their harvest records" ON public.harvest_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their harvest records" ON public.harvest_records FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_livestock_user_id ON public.livestock(user_id);
CREATE INDEX idx_livestock_species ON public.livestock(species);
CREATE INDEX idx_veterinary_records_livestock_id ON public.veterinary_records(livestock_id);
CREATE INDEX idx_harvest_records_crop_id ON public.harvest_records(crop_id);

-- Triggers for updated_at
CREATE TRIGGER update_livestock_updated_at BEFORE UPDATE ON public.livestock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();