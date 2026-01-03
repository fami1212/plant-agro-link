-- Table pour l'historique des conversations vocales
CREATE TABLE public.voice_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own conversations" 
ON public.voice_conversations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.voice_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.voice_conversations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.voice_conversations FOR DELETE USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_voice_conversations_updated_at
BEFORE UPDATE ON public.voice_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();