-- Allow group members to view each other's profiles

DROP POLICY IF EXISTS "Group members can view each other" ON public.users;
CREATE POLICY "Group members can view each other" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = id
        AND gm2.user_id = auth.uid()
    )
  ); 