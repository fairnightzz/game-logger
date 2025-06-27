-- Add expires_at column to game_groups table
ALTER TABLE public.game_groups ADD COLUMN IF NOT EXISTS invite_token_expires_at timestamptz;

-- Update existing groups to have expiration time (1 hour from now)
UPDATE public.game_groups 
SET invite_token_expires_at = NOW() + INTERVAL '1 hour' 
WHERE invite_token_expires_at IS NULL;
