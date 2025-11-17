-- Fix search_path for delete_old_conversations function
DROP FUNCTION IF EXISTS public.delete_old_conversations();

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