-- Fix group members RLS policy to ensure members can view all group members

-- Drop the existing policy
DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;

-- Create a more explicit policy for viewing group members
CREATE POLICY "Group members can view membership" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = group_members.group_id 
      AND gm2.user_id = auth.uid()
    )
  );

-- Also add a policy for updating own membership (for role changes, etc.)
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;
CREATE POLICY "Users can update own membership" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Add a policy for admins to manage members
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;
CREATE POLICY "Admins can manage members" ON public.group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = group_members.group_id 
      AND gm2.user_id = auth.uid()
      AND gm2.role = 'admin'
    )
  ); 