-- Create dedicated conversations table
CREATE TABLE public.marketplace_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(listing_id, participant_1, participant_2)
);

-- Enable RLS
ALTER TABLE public.marketplace_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: users can see their own conversations
CREATE POLICY "Users can view their conversations"
ON public.marketplace_conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Policy: users can create conversations
CREATE POLICY "Users can create conversations"
ON public.marketplace_conversations FOR INSERT
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Policy: users can update their conversations (for last_message_at)
CREATE POLICY "Users can update their conversations"
ON public.marketplace_conversations FOR UPDATE
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Add conversation_id to messages table as optional (null for legacy offer-based messages)
ALTER TABLE public.marketplace_messages 
ADD COLUMN conversation_id uuid REFERENCES public.marketplace_conversations(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_messages_conversation ON public.marketplace_messages(conversation_id);
CREATE INDEX idx_conversations_participants ON public.marketplace_conversations(participant_1, participant_2);

-- Enable realtime for conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_conversations;