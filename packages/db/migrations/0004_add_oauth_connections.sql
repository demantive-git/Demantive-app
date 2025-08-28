-- OAuth connections table for external CRMs (HubSpot, Salesforce)
-- Stores encrypted tokens per organization with strict RLS

CREATE TABLE IF NOT EXISTS public.oauth_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider text NOT NULL CHECK (provider IN ('hubspot','salesforce')),
    instance_base_url text,
    access_token_cipher text NOT NULL,
    refresh_token_cipher text,
    scope text,
    expires_at timestamptz,
    status text NOT NULL DEFAULT 'connected',
    last_synced_at timestamptz,
    cursor text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(org_id, provider)
);

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "users_can_view_oauth_connections_for_their_orgs" ON public.oauth_connections;
DROP POLICY IF EXISTS "admins_can_manage_oauth_connections" ON public.oauth_connections;

CREATE POLICY "users_can_view_oauth_connections_for_their_orgs" ON public.oauth_connections
  FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "admins_can_manage_oauth_connections" ON public.oauth_connections
  FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'))
  WITH CHECK (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

GRANT ALL ON public.oauth_connections TO authenticated;
COMMENT ON TABLE public.oauth_connections IS 'Encrypted OAuth tokens per org and provider. Access via RLS.';





