-- Fix RLS Configuration Issues
-- This schema fixes the "unrecognized configuration parameter" errors
-- by creating proper functions and updating RLS policies

-- =====================================================
-- CREATE CONFIGURATION FUNCTIONS
-- =====================================================

-- Function to safely set configuration parameters
CREATE OR REPLACE FUNCTION api.set_config(
  setting_name TEXT,
  setting_value TEXT,
  is_local BOOLEAN DEFAULT true
) RETURNS TEXT AS $$
BEGIN
  -- Validate setting name to prevent injection
  IF setting_name NOT LIKE 'app.%' THEN
    RAISE EXCEPTION 'Invalid setting name: %', setting_name;
  END IF;
  
  -- Set the configuration parameter
  PERFORM set_config(setting_name, setting_value, is_local);
  
  RETURN setting_value;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail
    RAISE WARNING 'Could not set config %: %', setting_name, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current client ID from configuration
CREATE OR REPLACE FUNCTION api.get_current_client_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_client_id', true)::UUID,
    NULL
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set client context for RLS
CREATE OR REPLACE FUNCTION api.set_client_context(client_id UUID) RETURNS VOID AS $$
BEGIN
  PERFORM api.set_config('app.current_client_id', client_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE RLS POLICIES TO USE SAFE FUNCTIONS
-- =====================================================

-- Drop existing problematic policies for notifications
DROP POLICY IF EXISTS "notifications_client_isolation" ON api.notifications;

-- Create new safe RLS policy for notifications
CREATE POLICY "notifications_client_isolation" ON api.notifications
  FOR ALL 
  USING (
    client_id = api.get_current_client_id()
    OR auth.jwt()->>'role' = 'thepia_staff'
    OR auth.jwt()->>'role' = 'service_role'
    OR auth.jwt()->>'role' = 'anon'
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION api.set_config(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION api.get_current_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION api.set_client_context(UUID) TO authenticated;

-- Grant to anon for demo purposes
GRANT EXECUTE ON FUNCTION api.set_config(TEXT, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION api.get_current_client_id() TO anon;
GRANT EXECUTE ON FUNCTION api.set_client_context(UUID) TO anon;

-- Grant to service role
GRANT EXECUTE ON FUNCTION api.set_config(TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION api.get_current_client_id() TO service_role;
GRANT EXECUTE ON FUNCTION api.set_client_context(UUID) TO service_role;

-- =====================================================
-- CREATE DEMO DATA INITIALIZATION FUNCTION
-- =====================================================

-- Function to initialize demo data if missing
CREATE OR REPLACE FUNCTION api.ensure_demo_client() RETURNS UUID AS $$
DECLARE
  demo_client_id UUID;
BEGIN
  -- Check if demo client exists
  SELECT id INTO demo_client_id
  FROM api.clients
  WHERE client_code = 'hygge-hvidlog'
  LIMIT 1;
  
  -- If not found, create it
  IF demo_client_id IS NULL THEN
    INSERT INTO api.clients (
      client_code,
      legal_name,
      domain,
      tier,
      status,
      region,
      max_users,
      max_storage_gb,
      industry,
      company_size,
      country_code
    ) VALUES (
      'hygge-hvidlog',
      'Hygge & Hvidløg A/S',
      'hygge-hvidlog.thepia.net',
      'enterprise',
      'active',
      'EU',
      1200,
      100,
      'food_technology',
      'large',
      'DK'
    ) RETURNING id INTO demo_client_id;
    
    -- Create demo applications
    INSERT INTO api.client_applications (
      client_id,
      app_code,
      app_name,
      app_version,
      app_description,
      status,
      configuration,
      features,
      max_concurrent_users
    ) VALUES 
    (
      demo_client_id,
      'employee-onboarding',
      'Employee Onboarding',
      '2.1.0',
      'Comprehensive employee onboarding process',
      'active',
      '{"theme": "hygge", "locale": "da-DK"}'::JSONB,
      '["document-management", "task-tracking", "notifications"]'::JSONB,
      100
    ),
    (
      demo_client_id,
      'employee-offboarding',
      'Employee Offboarding',
      '2.0.0',
      'Structured employee departure process',
      'active',
      '{"theme": "hygge", "locale": "da-DK"}'::JSONB,
      '["asset-management", "access-control", "documentation"]'::JSONB,
      50
    ) ON CONFLICT (client_id, app_code) DO NOTHING;
    
    -- Create sample notifications
    INSERT INTO api.notifications (
      client_id,
      user_id,
      title,
      message,
      type,
      read
    ) VALUES 
    (
      demo_client_id,
      'demo-user-1',
      'Welcome to Hygge & Hvidløg!',
      'Your onboarding process has been initiated. Please complete your profile.',
      'info',
      false
    ),
    (
      demo_client_id,
      'demo-user-1',
      'Document Upload Required',
      'Please upload your identification documents to complete verification.',
      'warning',
      false
    ),
    (
      demo_client_id,
      'demo-user-2',
      'Onboarding Complete',
      'Congratulations! Your onboarding process has been completed successfully.',
      'success',
      true
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created demo client with ID: %', demo_client_id;
  END IF;
  
  RETURN demo_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for demo initialization
GRANT EXECUTE ON FUNCTION api.ensure_demo_client() TO authenticated;
GRANT EXECUTE ON FUNCTION api.ensure_demo_client() TO anon;
GRANT EXECUTE ON FUNCTION api.ensure_demo_client() TO service_role;

-- =====================================================
-- INITIALIZE DEMO DATA
-- =====================================================

-- Ensure demo client exists
SELECT api.ensure_demo_client();

-- Set default client context for current session
DO $$
DECLARE
  demo_client_id UUID;
BEGIN
  SELECT id INTO demo_client_id
  FROM api.clients
  WHERE client_code = 'hygge-hvidlog'
  LIMIT 1;
  
  IF demo_client_id IS NOT NULL THEN
    PERFORM api.set_client_context(demo_client_id);
    RAISE NOTICE 'Set default client context to: %', demo_client_id;
  END IF;
END $$;
