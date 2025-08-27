-- Add unique constraint for org_id and provider combination
ALTER TABLE oauth_connections 
ADD CONSTRAINT oauth_connections_org_provider_unique 
UNIQUE (org_id, provider);
