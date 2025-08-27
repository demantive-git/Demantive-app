-- Create rule type enum
CREATE TYPE rule_type AS ENUM ('contains', 'equals', 'regex', 'starts_with', 'ends_with');

-- Create normalized tables
CREATE TABLE people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  provider crm_provider NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company_id UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, provider, external_id)
);

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  provider crm_provider NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, provider, external_id)
);

CREATE TABLE opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  provider crm_provider NOT NULL,
  name TEXT NOT NULL,
  company_id UUID,
  amount INTEGER, -- Store as cents
  stage TEXT,
  status TEXT,
  close_date TIMESTAMP,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE (org_id, provider, external_id)
);

-- Create program tables
CREATE TABLE programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#000000',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE program_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  rule_type rule_type NOT NULL,
  field TEXT NOT NULL,
  pattern TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE record_programs (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  confidence INTEGER DEFAULT 100,
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (org_id, record_type, record_id)
);

-- Enable RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view people in their orgs" ON people
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "Users can view companies in their orgs" ON companies
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "Users can view opportunities in their orgs" ON opportunities
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "Users can view programs in their orgs" ON programs
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "Admins can manage programs" ON programs
  FOR ALL
  USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

CREATE POLICY "Users can view program rules in their orgs" ON program_rules
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "Admins can manage program rules" ON program_rules
  FOR ALL
  USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

CREATE POLICY "Users can view record programs in their orgs" ON record_programs
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.user_orgs()));

CREATE POLICY "System can manage record programs" ON record_programs
  FOR ALL
  USING (org_id IN (SELECT org_id FROM public.user_orgs() WHERE role = 'admin'));

-- Indexes for performance
CREATE INDEX idx_people_org_provider ON people(org_id, provider);
CREATE INDEX idx_companies_org_provider ON companies(org_id, provider);
CREATE INDEX idx_opportunities_org_provider ON opportunities(org_id, provider);
CREATE INDEX idx_opportunities_status ON opportunities(org_id, status);
CREATE INDEX idx_programs_org_active ON programs(org_id, active);
CREATE INDEX idx_program_rules_program ON program_rules(program_id, enabled);
CREATE INDEX idx_record_programs_program ON record_programs(program_id);
