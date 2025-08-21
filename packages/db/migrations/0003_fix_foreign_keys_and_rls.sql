-- Fix foreign key relationships and RLS policies completely

-- First, let's make sure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY, -- Will match Supabase auth.users.id
    email text UNIQUE NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create membership role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE membership_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.memberships (
    org_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role membership_role NOT NULL DEFAULT 'viewer',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (org_id, user_id)
);

-- Drop existing foreign key constraints if they exist
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_org_id_organizations_id_fk;
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_users_id_fk;

-- Add proper foreign key constraints
ALTER TABLE public.memberships 
ADD CONSTRAINT memberships_org_id_organizations_id_fk 
FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.memberships 
ADD CONSTRAINT memberships_user_id_users_id_fk 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Ensure all authenticated users are synced to public.users
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

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Only admins can update their orgs" ON public.organizations;
DROP POLICY IF EXISTS "Only admins can delete their orgs" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "Users can view themselves" ON public.users;
DROP POLICY IF EXISTS "Users can update themselves" ON public.users;
DROP POLICY IF EXISTS "Users can view memberships for their orgs" ON public.memberships;
DROP POLICY IF EXISTS "Only admins can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can add themselves as admin to new orgs" ON public.memberships;

-- Drop and recreate the user_orgs function
DROP FUNCTION IF EXISTS public.user_orgs();
CREATE OR REPLACE FUNCTION public.user_orgs()
RETURNS TABLE(org_id uuid, role text)
LANGUAGE sql
SECURITY definer
SET search_path = public
STABLE
AS $$
  SELECT m.org_id, m.role::text
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
$$;

-- Organization policies - simple and clear
CREATE POLICY "authenticated_users_can_view_their_orgs" ON public.organizations
    FOR SELECT
    TO authenticated
    USING (id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "authenticated_users_can_create_orgs" ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admins_can_update_their_orgs" ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

CREATE POLICY "admins_can_delete_their_orgs" ON public.organizations
    FOR DELETE
    TO authenticated
    USING (id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

-- Users policies
CREATE POLICY "users_can_view_themselves" ON public.users
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "users_can_update_themselves" ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Memberships policies
CREATE POLICY "users_can_view_memberships_for_their_orgs" ON public.memberships
    FOR SELECT
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "users_can_create_admin_membership_for_new_org" ON public.memberships
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        AND role = 'admin'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "admins_can_manage_memberships" ON public.memberships
    FOR ALL
    TO authenticated
    USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.memberships TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_orgs() TO authenticated;
