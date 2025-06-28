-- Consolidated migration for group membership RLS and helper function

-- Helper function for group membership (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE PARALLEL SAFE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.group_id = gid
      AND gm.user_id = auth.uid()
  );
$$;

-- RLS Policies for group_members
DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

CREATE POLICY "Group members can view membership" ON public.group_members
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy for game_groups
DROP POLICY IF EXISTS "Group members can view groups" ON public.game_groups;
CREATE POLICY "Group members can view groups" ON public.game_groups
  FOR SELECT USING (is_group_member(id)); 