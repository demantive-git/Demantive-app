-- Fix RLS policies for organization creation
-- This migration addresses issues with org creation permissions

-- First, ensure all users from auth.users are synced to public.users
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as name,
  created_at,
  updated_at
FROM auth.users 
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.users.name),
  updated_at = now();

-- Drop and recreate the organization INSERT policy to ensure it works correctly
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON organizations;

-- Create a more explicit policy for organization creation
CREATE POLICY "Authenticated users can create orgs" ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() IN (SELECT id FROM public.users)
  );

-- Also ensure we have proper INSERT policy for memberships when creating orgs
DROP POLICY IF EXISTS "Users can add themselves as admin to new orgs" ON memberships;

CREATE POLICY "Users can add themselves as admin to new orgs" ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND role = 'admin'
    AND auth.uid() IS NOT NULL
  );

-- Grant necessary permissions to authenticated users
GRANT INSERT ON organizations TO authenticated;
GRANT INSERT ON memberships TO authenticated;
GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON memberships TO authenticated;
GRANT SELECT ON users TO authenticated;
