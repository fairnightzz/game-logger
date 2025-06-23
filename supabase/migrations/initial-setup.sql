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

-- Helper function for group membership
CREATE OR REPLACE FUNCTION is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE PARALLEL SAFE AS $
  SELECT EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.group_id = gid
      AND gm.user_id = auth.uid()
  );
$;

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
RETURNS TRIGGER AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

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