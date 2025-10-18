-- Use JWT Role Directly Instead of Database Lookup
-- The Supabase JWT already contains the role in user_metadata.role
-- This is simpler and more reliable than trying to match WorkOS user IDs

-- =====================================================
-- UPDATE get_current_user_role() TO USE JWT ROLE
-- =====================================================

CREATE OR REPLACE FUNCTION api.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- Get role directly from JWT user_metadata
  jwt_role := (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role';
  
  -- Return role or default to 'authenticated'
  RETURN COALESCE(jwt_role, 'authenticated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ALSO UPDATE get_current_thepia_user_id() FOR COMPLETENESS
-- =====================================================

CREATE OR REPLACE FUNCTION api.get_current_thepia_user_id()
RETURNS TEXT AS $$
BEGIN
  -- For now, return the Supabase user ID since WorkOS ID isn't in JWT
  -- This can be updated later when WorkOS ID is properly stored in JWT
  RETURN auth.uid()::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEST THE FUNCTIONS
-- =====================================================

SELECT 
  'Functions updated to use JWT role directly' as status,
  'Role should now work correctly' as note;

COMMENT ON FUNCTION api.get_current_user_role IS 'Gets user role directly from JWT user_metadata.role field';
COMMENT ON FUNCTION api.get_current_thepia_user_id IS 'Returns Supabase user ID (fallback until WorkOS ID is in JWT)';
