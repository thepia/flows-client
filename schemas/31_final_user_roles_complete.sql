-- FINAL User Roles Setup - Complete and Correct (v31)
-- This is the ONLY script you need to run for user roles
-- All other user_roles scripts (27-30) are outdated
--
-- HYBRID AUTHENTICATION SUPPORT:
-- - Primary: Auth0/WorkOS via thepia_user_id (stable identity)
-- - Optional: Direct Supabase auth via supabase_user_id
-- - Supports both authentication methods in RLS policies
--
-- Documentation: docs/USER_ROLE_MANAGEMENT_V31.md

-- =====================================================
-- 0. CLEAN SLATE - DROP EVERYTHING (CORRECT ORDER)
-- =====================================================

-- Drop existing table (CASCADE removes dependent policies and functions)
DROP TABLE IF EXISTS api.user_roles CASCADE;

-- Drop any remaining functions that might exist
DROP FUNCTION IF EXISTS api.get_current_thepia_user_id() CASCADE;
DROP FUNCTION IF EXISTS api.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS api.is_thepia_staff() CASCADE;
DROP FUNCTION IF EXISTS api.is_client_manager(UUID) CASCADE;
DROP FUNCTION IF EXISTS api.can_access_person_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS api.assign_thepia_staff_role(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS api.assign_client_manager_role(TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS api.assign_client_employee_role(TEXT, UUID, UUID, TEXT, TEXT) CASCADE;

-- =====================================================
-- 1. CREATE USER ROLES TABLE (FINAL VERSION)
-- =====================================================

CREATE TABLE api.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable user identification (survives email changes)
  thepia_user_id TEXT UNIQUE, -- Permanent ID from Thepia auth system (e.g., user_01K4DDYMKSK82XKFYAKBG54AH9) - NULL for pre-registration
  user_email TEXT, -- Current email (can be NULL for pre-registration, can change)

  -- Optional Supabase auth integration (for future direct Supabase auth support)
  supabase_user_id UUID REFERENCES auth.users(id), -- NULL when using Auth0/WorkOS, populated for direct Supabase auth
  
  -- Three-tier role system
  role TEXT NOT NULL CHECK (role IN ('thepia_staff', 'client_manager', 'client_employee', 'service_role')),
  
  -- Client association (NULL for thepia_staff)
  client_id UUID REFERENCES api.clients(id),
  
  -- Employee-specific constraints (for client_employee role)
  employee_id UUID, -- References specific employee record
  department TEXT,
  access_level TEXT CHECK (access_level IN ('full', 'department', 'personal', 'read_only')),
  
  -- Metadata
  assigned_by_user_id TEXT, -- Who assigned this role (references thepia_user_id)
  assigned_by_email TEXT,   -- Email at time of assignment (for audit trail)
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Constraints
  CONSTRAINT role_client_consistency CHECK (
    (role = 'thepia_staff' AND client_id IS NULL) OR
    (role IN ('client_manager', 'client_employee') AND client_id IS NOT NULL)
  ),
  CONSTRAINT employee_role_consistency CHECK (
    (role = 'client_employee' AND employee_id IS NOT NULL) OR
    (role != 'client_employee')
  )
);

-- Enable RLS
ALTER TABLE api.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE HELPER FUNCTIONS (FINAL VERSION)
-- =====================================================

-- Get current user's thepia_user_id from JWT
CREATE OR REPLACE FUNCTION api.get_current_thepia_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'thepia_user_id',
    auth.jwt() ->> 'thepia_user_id',
    -- Fallback to user_id for backward compatibility
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'user_id',
    auth.jwt() ->> 'user_id'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role from user_roles table (not JWT)
CREATE OR REPLACE FUNCTION api.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
  current_thepia_user_id TEXT;
BEGIN
  current_thepia_user_id := api.get_current_thepia_user_id();
  
  -- Look up role in user_roles table by thepia_user_id
  SELECT role INTO user_role
  FROM api.user_roles
  WHERE thepia_user_id = current_thepia_user_id;
  
  -- Return role or default to 'authenticated'
  RETURN COALESCE(user_role, 'authenticated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's client_id from JWT
CREATE OR REPLACE FUNCTION api.get_current_user_client_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'client_id')::UUID,
    (auth.jwt() ->> 'client_id')::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's person_id from JWT (maps to people table)
CREATE OR REPLACE FUNCTION api.get_current_user_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'person_id')::UUID,
    (auth.jwt() ->> 'person_id')::UUID,
    -- Fallback to employee_id for backward compatibility
    ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'employee_id')::UUID,
    (auth.jwt() ->> 'employee_id')::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is Thepia staff
CREATE OR REPLACE FUNCTION api.is_thepia_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN api.get_current_user_role() IN ('thepia_staff', 'service_role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is client manager for specific client
CREATE OR REPLACE FUNCTION api.is_client_manager(target_client_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_client_id UUID;
BEGIN
  user_role := api.get_current_user_role();
  user_client_id := api.get_current_user_client_id();
  
  RETURN user_role = 'client_manager' AND 
         (target_client_id IS NULL OR user_client_id = target_client_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CREATE RLS POLICIES (FINAL VERSION)
-- =====================================================

-- Thepia staff can see all roles
CREATE POLICY policy_user_roles_thepia_staff ON api.user_roles
  FOR ALL 
  USING (api.is_thepia_staff())
  WITH CHECK (api.is_thepia_staff());

-- Client managers can see roles within their client
CREATE POLICY policy_user_roles_client_manager ON api.user_roles
  FOR SELECT
  USING (
    api.is_client_manager() AND 
    client_id = api.get_current_user_client_id()
  );

-- Users can see their own role (supports both auth methods)
CREATE POLICY policy_user_roles_self_access ON api.user_roles
  FOR SELECT
  USING (
    (thepia_user_id IS NOT NULL AND thepia_user_id = api.get_current_thepia_user_id())
    OR (supabase_user_id IS NOT NULL AND supabase_user_id = auth.uid())
  );

-- =====================================================
-- 4. BOOTSTRAP DEFAULT USERS
-- =====================================================

-- Insert Henrik and Katty with actual thepia_user_ids
INSERT INTO api.user_roles (thepia_user_id, user_email, role, assigned_by_email, notes)
VALUES 
  ('user_01K4DDYMKSK82XKFYAKBG54AH9', 'henrik@thepia.com', 'thepia_staff', 'system-bootstrap', 'Initial admin - Henrik'),
  ('user_katty_placeholder', 'katty@thepia.com', 'thepia_staff', 'system-bootstrap', 'Initial admin - Katty (replace with actual thepia_user_id)')
ON CONFLICT (thepia_user_id) DO NOTHING;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO anon;

-- =====================================================
-- 5. VERIFY SETUP WORKED
-- =====================================================

-- Show created users
SELECT 
  thepia_user_id,
  user_email,
  role,
  assigned_at,
  notes
FROM api.user_roles
ORDER BY assigned_at DESC;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'api' 
AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- Test functions work
SELECT 
  'Functions test:' as test,
  api.get_current_thepia_user_id() as current_user_id,
  api.get_current_user_role() as current_role,
  api.is_thepia_staff() as is_staff;

COMMENT ON TABLE api.user_roles IS 'FINAL user roles table with TEXT thepia_user_id and pre-registration support';
