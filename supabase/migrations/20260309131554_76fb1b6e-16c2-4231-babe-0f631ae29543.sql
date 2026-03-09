
-- Fix the overly permissive INSERT policy
DROP POLICY "System can create notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
