-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own org connections" ON oauth_connections;
DROP POLICY IF EXISTS "Admins can manage connections" ON oauth_connections;
DROP POLICY IF EXISTS "Users can view sync runs for their orgs" ON sync_runs;
DROP POLICY IF EXISTS "System can insert sync runs" ON sync_runs;
DROP POLICY IF EXISTS "Users can view raw objects for their orgs" ON raw_objects;
DROP POLICY IF EXISTS "System can manage raw objects" ON raw_objects;

-- Enable RLS on CRM tables
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_objects ENABLE ROW LEVEL SECURITY;

-- OAuth connections policies
CREATE POLICY "Users can view own org connections" ON oauth_connections
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "Admins can manage connections" ON oauth_connections
  FOR ALL
  USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

-- Sync runs policies  
CREATE POLICY "Users can view sync runs for their orgs" ON sync_runs
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "System can insert sync runs" ON sync_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

-- Raw objects policies
CREATE POLICY "Users can view raw objects for their orgs" ON raw_objects
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "System can manage raw objects" ON raw_objects
  FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_raw_objects_lookup ON raw_objects(org_id, provider, object_type, external_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_org_provider ON oauth_connections(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_sync_runs_org_provider ON sync_runs(org_id, provider);
