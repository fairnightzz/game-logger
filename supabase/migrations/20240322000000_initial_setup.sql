-- Game Tracker Database Schema

-- Users table (mirror of auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    username text,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamptz DEFAULT NOW()
);

-- Game groups
CREATE TABLE IF NOT EXISTS public.game_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    join_code text UNIQUE NOT NULL,
    invite_token text NOT NULL,
    invite_token_expires_at timestamptz,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT NOW()
);

-- Group membership
CREATE TABLE IF NOT EXISTS public.group_members (
    user_id uuid REFERENCES users(id),
    group_id uuid REFERENCES game_groups(id),
    role text DEFAULT 'member',
    joined_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

-- Games catalog
CREATE TABLE IF NOT EXISTS public.games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text
);

-- Game sessions
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES game_groups(id),
    game_id uuid REFERENCES games(id),
    played_at timestamptz DEFAULT NOW(),
    created_by uuid REFERENCES users(id),
    notes text
);

-- Session participants
CREATE TABLE IF NOT EXISTS public.game_session_players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    team text,
    role text,
    outcome text CHECK (outcome IN ('win','loss','draw')),
    score int
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_session_players ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies

-- Users policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Game groups policies
DROP POLICY IF EXISTS "Group members can view groups" ON public.game_groups;
CREATE POLICY "Group members can view groups" ON public.game_groups
  FOR SELECT USING (is_group_member(id));

DROP POLICY IF EXISTS "Users can create groups" ON public.game_groups;
CREATE POLICY "Users can create groups" ON public.game_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group members policies
DROP POLICY IF EXISTS "Group members can view membership" ON public.group_members;
CREATE POLICY "Group members can view membership" ON public.group_members
  FOR SELECT USING (is_group_member(group_id));

DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Games policies (public read)
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
CREATE POLICY "Anyone can view games" ON public.games
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;
CREATE POLICY "Authenticated users can create games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Game sessions policies
DROP POLICY IF EXISTS "Group members can view sessions" ON public.game_sessions;
CREATE POLICY "Group members can view sessions" ON public.game_sessions
  FOR SELECT USING (is_group_member(group_id));

DROP POLICY IF EXISTS "Group members can create sessions" ON public.game_sessions;
CREATE POLICY "Group members can create sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (is_group_member(group_id));

DROP POLICY IF EXISTS "Group members can delete sessions" ON public.game_sessions;
CREATE POLICY "Group members can delete sessions" ON public.game_sessions
  FOR DELETE USING (is_group_member(group_id));

-- Game session players policies
DROP POLICY IF EXISTS "Group members can view session players" ON public.game_session_players;
CREATE POLICY "Group members can view session players" ON public.game_session_players
  FOR SELECT USING (
    is_group_member(
      (SELECT gs.group_id FROM game_sessions gs WHERE gs.id = session_id)
    )
  );

DROP POLICY IF EXISTS "Group members can create session players" ON public.game_session_players;
CREATE POLICY "Group members can create session players" ON public.game_session_players
  FOR INSERT WITH CHECK (
    is_group_member(
      (SELECT gs.group_id FROM game_sessions gs WHERE gs.id = session_id)
    )
  );

DROP POLICY IF EXISTS "Group members can delete session players" ON public.game_session_players;
CREATE POLICY "Group members can delete session players" ON public.game_session_players
  FOR DELETE USING (
    is_group_member(
      (SELECT gs.group_id FROM game_sessions gs WHERE gs.id = session_id)
    )
  );

-- User creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    username,
    email,
    full_name,
    avatar_url,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some default games
INSERT INTO public.games (name, description) VALUES
  ('Codenames', 'A word-based party game'),
  ('Secret Hitler', 'A social deduction game'),
  ('Catan', 'A strategy board game'),
  ('Werewolf', 'A social deduction game'),
  ('Avalon', 'A social deduction game'),
  ('Coup', 'A bluffing card game')
ON CONFLICT (name) DO NOTHING;

-- Enable realtime
alter publication supabase_realtime add table game_groups;
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table game_sessions;
alter publication supabase_realtime add table game_session_players;