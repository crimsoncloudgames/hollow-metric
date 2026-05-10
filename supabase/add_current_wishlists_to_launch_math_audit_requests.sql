-- Add current_wishlists column to launch_math_audit_requests table
ALTER TABLE public.launch_math_audit_requests
ADD COLUMN current_wishlists integer;

-- Add check constraint to ensure non-negative values
ALTER TABLE public.launch_math_audit_requests
ADD CONSTRAINT current_wishlists_non_negative
CHECK (current_wishlists IS NULL OR current_wishlists >= 0);

-- Add comment for documentation
COMMENT ON COLUMN public.launch_math_audit_requests.current_wishlists IS 'Optional current Steam wishlists count for planning context';

notify pgrst, 'reload schema';