-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  share_token text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  share_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workout sets
CREATE TABLE public.workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  muscle text NOT NULL CHECK (muscle IN ('biceps','triceps','chest','shoulder','back','abs','legs')),
  weight numeric(7,1) NOT NULL CHECK (weight > 0 AND weight <= 5000),
  reps integer NOT NULL CHECK (reps > 0 AND reps <= 1000),
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workout_sets_user_time_idx ON public.workout_sets (user_id, performed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sets" ON public.workout_sets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sets" ON public.workout_sets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sets" ON public.workout_sets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sets" ON public.workout_sets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public read-only sharing (only when the owner turned sharing on)
CREATE OR REPLACE FUNCTION public.get_shared_profile(_token text)
RETURNS TABLE (display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.share_token = _token AND p.share_enabled = true
$$;

CREATE OR REPLACE FUNCTION public.get_shared_sets(_token text)
RETURNS TABLE (muscle text, weight numeric, reps integer, performed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.muscle, s.weight, s.reps, s.performed_at
  FROM public.workout_sets s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE p.share_token = _token AND p.share_enabled = true
  ORDER BY s.performed_at ASC
$$;

REVOKE EXECUTE ON FUNCTION public.get_shared_profile(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_shared_sets(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_profile(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_sets(text) TO anon, authenticated, service_role;