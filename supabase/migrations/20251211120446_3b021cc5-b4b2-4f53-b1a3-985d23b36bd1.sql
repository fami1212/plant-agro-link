-- Create investments table for tracking investor contributions
CREATE TABLE public.investments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id UUID NOT NULL,
    farmer_id UUID NOT NULL,
    crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
    field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount_invested NUMERIC NOT NULL,
    expected_return_percent NUMERIC DEFAULT 15,
    status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'complete', 'rembourse', 'perdu')),
    investment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expected_harvest_date DATE,
    actual_return_amount NUMERIC,
    actual_return_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create investment opportunities table (crops seeking investment)
CREATE TABLE public.investment_opportunities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID NOT NULL,
    crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    expected_return_percent NUMERIC DEFAULT 15,
    risk_level TEXT DEFAULT 'moyen' CHECK (risk_level IN ('faible', 'moyen', 'eleve')),
    status TEXT NOT NULL DEFAULT 'ouverte' CHECK (status IN ('ouverte', 'financee', 'en_production', 'terminee', 'annulee')),
    start_date DATE,
    expected_harvest_date DATE,
    location TEXT,
    images TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies for investments
CREATE POLICY "Investors can view their investments"
ON public.investments FOR SELECT
USING (auth.uid() = investor_id);

CREATE POLICY "Farmers can view investments in their crops"
ON public.investments FOR SELECT
USING (auth.uid() = farmer_id);

CREATE POLICY "Admins can view all investments"
ON public.investments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Investors can create investments"
ON public.investments FOR INSERT
WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Participants can update investments"
ON public.investments FOR UPDATE
USING (auth.uid() = investor_id OR auth.uid() = farmer_id);

-- RLS policies for investment opportunities
CREATE POLICY "Anyone authenticated can view open opportunities"
ON public.investment_opportunities FOR SELECT
USING (status = 'ouverte' OR auth.uid() = farmer_id);

CREATE POLICY "Farmers can create opportunities"
ON public.investment_opportunities FOR INSERT
WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update their opportunities"
ON public.investment_opportunities FOR UPDATE
USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete their opportunities"
ON public.investment_opportunities FOR DELETE
USING (auth.uid() = farmer_id);

CREATE POLICY "Admins can manage all opportunities"
ON public.investment_opportunities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_investments_updated_at
BEFORE UPDATE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investment_opportunities_updated_at
BEFORE UPDATE ON public.investment_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();