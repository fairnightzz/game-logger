-- Completely reset group members RLS policies to original working state

-- Drop ALL existing policies on group_members
DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;

-- Recreate the original policies exactly as they were
CREATE POLICY "Group members can view membership" ON public.group_members
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id); 