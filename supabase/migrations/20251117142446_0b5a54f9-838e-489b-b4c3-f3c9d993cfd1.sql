-- Create conversations table to store chat history
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table to store individual messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  chart_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth yet)
CREATE POLICY "Allow public read access to conversations"
  ON public.conversations FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to conversations"
  ON public.conversations FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to conversations"
  ON public.conversations FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to messages"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to messages"
  ON public.messages FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access to messages"
  ON public.messages FOR DELETE
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_conversations_device_id ON public.conversations(device_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- Create function to auto-delete old conversations
CREATE OR REPLACE FUNCTION public.delete_old_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.conversations
  WHERE created_at < NOW() - INTERVAL '45 days';
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();