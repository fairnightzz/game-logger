-- Add secure join functions for RLS-compliant group joining

-- Function to join a group by join code
CREATE OR REPLACE FUNCTION join_group_by_code(join_code_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  group_id_found UUID;
BEGIN
  -- Find the group by join code
  SELECT id INTO group_id_found
  FROM game_groups
  WHERE join_code = join_code_param;
  
  -- If group not found, return false
  IF group_id_found IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is already a member
  IF is_group_member(group_id_found) THEN
    RETURN TRUE; -- Already a member
  END IF;
  
  -- Add user to group
  INSERT INTO group_members (user_id, group_id, role)
  VALUES (auth.uid(), group_id_found, 'member');
  
  RETURN TRUE;
END;
$$;

-- Function to get group info by join code (for joining)
CREATE OR REPLACE FUNCTION get_group_by_join_code(join_code_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT gg.id, gg.name, gg.created_at
  FROM game_groups gg
  WHERE gg.join_code = join_code_param;
END;
$$;

-- Function to verify join code and token, then join group
CREATE OR REPLACE FUNCTION verify_and_join_group(join_code_param TEXT, token_param TEXT)
RETURNS TABLE (
  success BOOLEAN,
  group_id UUID,
  group_name TEXT,
  error_message TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  group_record RECORD;
BEGIN
  -- Find the group by join code and verify token
  SELECT id, name, invite_token_expires_at INTO group_record
  FROM game_groups
  WHERE join_code = join_code_param 
    AND invite_token = token_param;
  
  -- If group not found or token doesn't match, return error
  IF group_record.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'Invalid join code or token'::TEXT;
    RETURN;
  END IF;
  
  -- Check if token is expired
  IF group_record.invite_token_expires_at IS NOT NULL AND 
     group_record.invite_token_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'Invite token has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check if user is already a member
  IF is_group_member(group_record.id) THEN
    RETURN QUERY SELECT TRUE, group_record.id, group_record.name, 'Already a member'::TEXT;
    RETURN;
  END IF;
  
  -- Add user to group
  INSERT INTO group_members (user_id, group_id, role)
  VALUES (auth.uid(), group_record.id, 'member');
  
  -- Return success
  RETURN QUERY SELECT TRUE, group_record.id, group_record.name, 'Successfully joined'::TEXT;
END;
$$;

-- Function to get group info by join code and token (for verification before joining)
CREATE OR REPLACE FUNCTION get_group_by_join_code_and_token(join_code_param TEXT, token_param TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gg.id, 
    gg.name, 
    gg.created_at,
    COUNT(gm.user_id)::BIGINT as member_count
  FROM game_groups gg
  LEFT JOIN group_members gm ON gg.id = gm.group_id
  WHERE gg.join_code = join_code_param 
    AND gg.invite_token = token_param
    AND (gg.invite_token_expires_at IS NULL OR gg.invite_token_expires_at > NOW())
  GROUP BY gg.id, gg.name, gg.created_at;
END;
$$; 