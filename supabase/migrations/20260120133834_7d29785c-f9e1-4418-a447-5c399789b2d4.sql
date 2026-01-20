-- Create scan_history table for Smart Camera scan tracking
CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_type TEXT NOT NULL,
  image_url TEXT,
  analysis_data JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(5,4) DEFAULT 0,
  disease_name TEXT,
  severity TEXT,
  treatment TEXT,
  related_crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  related_livestock_id UUID REFERENCES public.livestock(id) ON DELETE SET NULL,
  related_field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scan history"
  ON public.scan_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scan history"
  ON public.scan_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan history"
  ON public.scan_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan history"
  ON public.scan_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX idx_scan_history_scan_type ON public.scan_history(scan_type);
CREATE INDEX idx_scan_history_disease ON public.scan_history(disease_name) WHERE disease_name IS NOT NULL;
CREATE INDEX idx_scan_history_created_at ON public.scan_history(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_scan_history_updated_at
  BEFORE UPDATE ON public.scan_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for scan images
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-images', 'scan-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for scan images
CREATE POLICY "Scan images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'scan-images');

CREATE POLICY "Users can upload scan images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their scan images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their scan images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'scan-images' AND auth.uid()::text = (storage.foldername(name))[1]);