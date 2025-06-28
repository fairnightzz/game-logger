-- Fix is_group_member function to use SECURITY DEFINER to avoid RLS recursion
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