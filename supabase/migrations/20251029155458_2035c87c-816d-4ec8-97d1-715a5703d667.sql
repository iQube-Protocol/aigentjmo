-- Fix INSERT RLS policies for persona tables to ensure users can only insert their own records

-- Update KNYT personas INSERT policy
DROP POLICY IF EXISTS "Users can insert their own knyt persona" ON public.knyt_personas;
CREATE POLICY "Users can insert their own knyt persona"
ON public.knyt_personas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update Qripto personas INSERT policy
DROP POLICY IF EXISTS "Users can insert their own qripto persona" ON public.qripto_personas;
CREATE POLICY "Users can insert their own qripto persona"
ON public.qripto_personas
FOR INSERT
WITH CHECK (auth.uid() = user_id);