-- Create enum for marketplace listing types
CREATE TYPE public.listing_type AS ENUM ('produit', 'service', 'intrant', 'investissement');

-- Create enum for listing status
CREATE TYPE public.listing_status AS ENUM ('brouillon', 'publie', 'consulte', 'negociation', 'reserve', 'vendu', 'archive');

-- Create enum for offer status
CREATE TYPE public.offer_status AS ENUM ('en_attente', 'acceptee', 'refusee', 'contre_offre', 'expiree');

-- Create enum for service category
CREATE TYPE public.service_category AS ENUM ('veterinaire', 'technicien_iot', 'transporteur', 'conseiller', 'cooperative', 'autre');

-- Create enum for input category
CREATE TYPE public.input_category AS ENUM ('engrais', 'semences', 'materiel', 'irrigation', 'phytosanitaire', 'autre');

-- Create marketplace_listings table (for products, services, inputs)
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_type listing_type NOT NULL DEFAULT 'produit',
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  service_category service_category,
  input_category input_category,
  price NUMERIC,
  price_negotiable BOOLEAN DEFAULT true,
  quantity TEXT,
  quantity_kg NUMERIC,
  unit TEXT DEFAULT 'kg',
  location TEXT,
  location_gps POINT,
  images TEXT[],
  status listing_status NOT NULL DEFAULT 'brouillon',
  harvest_record_id UUID REFERENCES public.harvest_records(id) ON DELETE SET NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
  livestock_id UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  traceability_qr TEXT,
  views_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  delivery_available BOOLEAN DEFAULT false,
  delivery_regions TEXT[],
  available_from DATE,
  available_until DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_offers table
CREATE TABLE public.marketplace_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  proposed_price NUMERIC NOT NULL,
  proposed_quantity TEXT,
  message TEXT,
  status offer_status NOT NULL DEFAULT 'en_attente',
  counter_offer_price NUMERIC,
  counter_offer_message TEXT,
  payment_method TEXT,
  delivery_date DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_providers table
CREATE TABLE public.service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_category service_category NOT NULL,
  business_name TEXT NOT NULL,
  description TEXT,
  specializations TEXT[],
  certifications TEXT[],
  service_areas TEXT[],
  hourly_rate NUMERIC,
  availability JSONB DEFAULT '{}'::jsonb,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  phone TEXT,
  whatsapp TEXT,
  location TEXT,
  location_gps POINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_bookings table
CREATE TABLE public.service_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_hours NUMERIC,
  status TEXT DEFAULT 'en_attente',
  price NUMERIC,
  notes TEXT,
  rating INTEGER,
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_favorites table
CREATE TABLE public.marketplace_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Anyone can view published listings" ON public.marketplace_listings
  FOR SELECT USING (status = 'publie' OR status = 'consulte' OR status = 'negociation');

CREATE POLICY "Users can view their own listings" ON public.marketplace_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own listings" ON public.marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" ON public.marketplace_listings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for marketplace_offers
CREATE POLICY "Users can view offers they made or received" ON public.marketplace_offers
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create offers" ON public.marketplace_offers
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update offers" ON public.marketplace_offers
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can delete their offers" ON public.marketplace_offers
  FOR DELETE USING (auth.uid() = buyer_id);

-- RLS Policies for service_providers
CREATE POLICY "Anyone can view active providers" ON public.service_providers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own provider profile" ON public.service_providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their provider profile" ON public.service_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their provider profile" ON public.service_providers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their provider profile" ON public.service_providers
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for service_bookings
CREATE POLICY "Users can view bookings they created or received" ON public.service_bookings
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = (SELECT user_id FROM public.service_providers WHERE id = provider_id));

CREATE POLICY "Users can create bookings" ON public.service_bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update bookings" ON public.service_bookings
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = (SELECT user_id FROM public.service_providers WHERE id = provider_id));

CREATE POLICY "Users can delete their bookings" ON public.service_bookings
  FOR DELETE USING (auth.uid() = client_id);

-- RLS Policies for marketplace_favorites
CREATE POLICY "Users can view their own favorites" ON public.marketplace_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" ON public.marketplace_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON public.marketplace_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_marketplace_listings_user_id ON public.marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_type ON public.marketplace_listings(listing_type);
CREATE INDEX idx_marketplace_offers_listing_id ON public.marketplace_offers(listing_id);
CREATE INDEX idx_marketplace_offers_buyer_id ON public.marketplace_offers(buyer_id);
CREATE INDEX idx_service_providers_category ON public.service_providers(service_category);

-- Add triggers for updated_at
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_offers_updated_at
  BEFORE UPDATE ON public.marketplace_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_bookings_updated_at
  BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();