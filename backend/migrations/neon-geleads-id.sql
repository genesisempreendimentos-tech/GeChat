-- GêLeads ID estável (registry persistente — não truncado no rebuild de all_leads_unique)

CREATE SEQUENCE IF NOT EXISTS geleads_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS geleads_id_registry (
  geleads_id   TEXT PRIMARY KEY,
  seq          BIGINT NOT NULL UNIQUE,
  entry_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'active',
  merged_into  TEXT NULL REFERENCES geleads_id_registry (geleads_id)
);

CREATE TABLE IF NOT EXISTS geleads_id_keys (
  key_type    TEXT NOT NULL CHECK (key_type IN ('email', 'phone', 'cvcrm', 'signup')),
  key_value   TEXT NOT NULL,
  geleads_id  TEXT NOT NULL REFERENCES geleads_id_registry (geleads_id),
  PRIMARY KEY (key_type, key_value)
);

ALTER TABLE geleads_id_keys DROP CONSTRAINT IF EXISTS geleads_id_keys_key_type_check;
ALTER TABLE geleads_id_keys ADD CONSTRAINT geleads_id_keys_key_type_check
  CHECK (key_type IN ('email', 'phone', 'cvcrm', 'signup'));

CREATE INDEX IF NOT EXISTS geleads_id_registry_status_idx ON geleads_id_registry (status);

ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS geleads_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS all_leads_unique_geleads_id_uidx ON all_leads_unique (geleads_id);

-- Sincroniza sequence após restore / registry pré-existente (não altera seq vazio — preserva A0001)
DO $$
DECLARE
  max_seq BIGINT;
BEGIN
  SELECT MAX(seq) INTO max_seq FROM geleads_id_registry;
  IF max_seq IS NOT NULL THEN
    PERFORM setval('geleads_id_seq', max_seq);
  END IF;
END $$;
