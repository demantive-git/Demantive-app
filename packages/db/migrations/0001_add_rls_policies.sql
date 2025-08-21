-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current user's organizations
CREATE OR REPLACE FUNCTION auth.user_orgs()
RETURNS TABLE(org_id uuid, role text)
LANGUAGE sql
SECURITY definer
SET search_path = public
STABLE
AS $$
  SELECT org_id, role::text
  FROM memberships
  WHERE user_id = auth.uid()
$$;

-- Organizations policies
CREATE POLICY "Users can view orgs they belong to" ON organizations
  FOR SELECT
  USING (id IN (SELECT org_id FROM auth.user_orgs()));

CREATE POLICY "Only admins can update their orgs" ON organizations
  FOR UPDATE
  USING (id IN (SELECT org_id FROM auth.user_orgs() WHERE role = 'admin'));

CREATE POLICY "Only admins can delete their orgs" ON organizations
  FOR DELETE
  USING (id IN (SELECT org_id FROM auth.user_orgs() WHERE role = 'admin'));

-- Users policies  
CREATE POLICY "Users can view themselves" ON users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update themselves" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Memberships policies
CREATE POLICY "Users can view memberships for their orgs" ON memberships
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM auth.user_orgs()));

CREATE POLICY "Only admins can manage memberships" ON memberships
  FOR ALL
  USING (org_id IN (SELECT org_id FROM auth.user_orgs() WHERE role = 'admin'));

-- Create a trigger to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO UPDATE
  SET email = new.email,
      name = COALESCE(new.raw_user_meta_data->>'name', excluded.name),
      updated_at = now();
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
