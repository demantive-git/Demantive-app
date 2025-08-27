-- Add unique constraint for raw_objects
ALTER TABLE raw_objects 
ADD CONSTRAINT raw_objects_unique 
UNIQUE (org_id, provider, object_type, external_id);
