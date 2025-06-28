-- Revert group members RLS policy back to original working version

-- Drop the problematic policies
DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;

-- Restore the original working policy
CREATE POLICY "Group members can view membership" ON public.group_members
  FOR SELECT USING (is_group_member(group_id)); 