-- Add reply_to_id column to marketplace_messages for reply/quote functionality
ALTER TABLE public.marketplace_messages 
ADD COLUMN reply_to_id UUID REFERENCES public.marketplace_messages(id) ON DELETE SET NULL;

-- Create index for faster reply lookups
CREATE INDEX idx_marketplace_messages_reply_to ON public.marketplace_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;