-- Create messages table for marketplace negotiations
CREATE TABLE public.marketplace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES public.marketplace_offers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
ON public.marketplace_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can create messages
CREATE POLICY "Users can send messages"
ON public.marketplace_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Recipients can mark messages as read
CREATE POLICY "Recipients can update messages"
ON public.marketplace_messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_messages;

-- Allow vets to update livestock health_status and weight only
CREATE POLICY "Vets can update livestock health and weight"
ON public.livestock FOR UPDATE
USING (has_role(auth.uid(), 'veterinaire'::app_role))
WITH CHECK (has_role(auth.uid(), 'veterinaire'::app_role));