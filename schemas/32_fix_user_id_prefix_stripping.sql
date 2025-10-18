-- Fix User ID Prefix Stripping for Role Matching
-- This fixes the issue where WorkOS/Auth0 user IDs include prefixes
-- but the user_roles table stores clean user IDs without prefixes
--
-- Problem: JWT contains "workos|user_01K4DDYMKSK82XKFYAKBG54AH9"
-- Database stores: "user_01K4DDYMKSK82XKFYAKBG54AH9"
-- Solution: Strip prefixes in get_current_thepia_user_id() function

-- =====================================================
-- UPDATE get_current_thepia_user_id() TO STRIP PREFIXES
-- =====================================================

CREATE OR REPLACE FUNCTION api.get_current_thepia_user_id()
RETURNS TEXT AS $$
DECLARE
  raw_user_id TEXT;
  clean_user_id TEXT;
BEGIN
  -- Get the raw user ID from JWT (with potential prefixes)
  raw_user_id := COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'thepia_user_id',
    auth.jwt() ->> 'thepia_user_id',
    -- Fallback to user_id for backward compatibility
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'user_id',
    auth.jwt() ->> 'user_id'
  );
  
  -- Strip Auth0/WorkOS prefixes if present
  IF raw_user_id IS NOT NULL THEN
    -- Remove 'auth0|' prefix
    IF raw_user_id LIKE 'auth0|%' THEN
      clean_user_id := substring(raw_user_id from 7); -- Remove 'auth0|' (6 chars + 1)
    -- Remove 'workos|' prefix  
    ELSIF raw_user_id LIKE 'workos|%' THEN
      clean_user_id := substring(raw_user_id from 8); -- Remove 'workos|' (7 chars + 1)
    ELSE
      -- No prefix, use as-is
      clean_user_id := raw_user_id;
    END IF;
  END IF;
  
  RETURN clean_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEST THE FUNCTION
-- =====================================================

-- Test with sample data (this will only work when called with actual JWT)
SELECT 
  'Function updated successfully' as status,
  'Run this after signing in to test:' as note,
  'SELECT api.get_current_thepia_user_id(), api.get_current_user_role();' as test_query;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show current user_roles for reference
SELECT 
  thepia_user_id,
  user_email,
  role,
  notes
FROM api.user_roles
ORDER BY assigned_at DESC;

COMMENT ON FUNCTION api.get_current_thepia_user_id IS 'Gets current user thepia_user_id from JWT, stripping auth0|/workos| prefixes to match user_roles table';
