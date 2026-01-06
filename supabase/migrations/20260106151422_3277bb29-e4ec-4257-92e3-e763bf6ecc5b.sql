-- Create reviews table for sellers and products
CREATE TABLE public.marketplace_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('seller', 'listing')),
  target_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  offer_id UUID REFERENCES public.marketplace_offers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Reviews are viewable by everyone"
ON public.marketplace_reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reviews"
ON public.marketplace_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.marketplace_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.marketplace_reviews FOR DELETE
USING (auth.uid() = user_id);

-- Create index for reviews queries
CREATE INDEX idx_reviews_target ON public.marketplace_reviews(target_type, target_id);
CREATE INDEX idx_reviews_user ON public.marketplace_reviews(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_reviews_updated_at
BEFORE UPDATE ON public.marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();