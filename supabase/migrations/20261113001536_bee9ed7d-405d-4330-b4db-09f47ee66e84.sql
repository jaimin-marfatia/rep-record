ALTER TABLE public.profiles
  ADD COLUMN first_name text,
  ADD COLUMN last_name text,
  ADD COLUMN username text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$'),
  ADD CONSTRAINT profiles_first_name_len CHECK (first_name IS NULL OR char_length(first_name) BETWEEN 1 AND 50),
  ADD CONSTRAINT profiles_last_name_len CHECK (last_name IS NULL OR char_length(last_name) BETWEEN 1 AND 50);

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _first text := NULLIF(btrim(NEW.raw_user_meta_data->>'first_name'), '');
  _last text := NULLIF(btrim(NEW.raw_user_meta_data->>'last_name'), '');
  _username text := lower(NULLIF(btrim(NEW.raw_user_meta_data->>'username'), ''));
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username, display_name)
  VALUES (NEW.id, _first, _last, _username, _first)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP FUNCTION public.get_shared_profile(text);

CREATE FUNCTION public.get_shared_profile(_token text)
RETURNS TABLE(first_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.first_name
  FROM public.profiles p
  WHERE p.share_token = _token AND p.share_enabled = true
$$;

REVOKE ALL ON FUNCTION public.get_shared_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_profile(text) TO anon, authenticated, service_role;