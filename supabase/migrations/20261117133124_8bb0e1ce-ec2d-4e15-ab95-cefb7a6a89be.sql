ALTER TABLE public.workout_sets ADD COLUMN set_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.workout_sets ADD CONSTRAINT workout_sets_set_count_range CHECK (set_count BETWEEN 1 AND 100);
ALTER TABLE public.workout_sets ALTER COLUMN reps SET DEFAULT 1;

DROP FUNCTION IF EXISTS public.get_shared_sets(text);
CREATE FUNCTION public.get_shared_sets(_token text)
 RETURNS TABLE(muscle text, weight numeric, set_count integer, performed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.muscle, s.weight, s.set_count, s.performed_at
  FROM public.workout_sets s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE p.share_token = _token AND p.share_enabled = true
  ORDER BY s.performed_at ASC
$function$;
REVOKE ALL ON FUNCTION public.get_shared_sets(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_sets(text) TO anon, authenticated, service_role;