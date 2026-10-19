CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS institutions (
  id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL, category text NOT NULL DEFAULT '공공기관', home_url text NOT NULL, notice_url text NOT NULL,
  mode text NOT NULL DEFAULT 'list' CHECK (mode IN ('list','page')),
  adapter text NOT NULL DEFAULT 'generic',
  list_selector text NOT NULL DEFAULT 'tbody tr', link_selector text NOT NULL DEFAULT 'a',
  date_selector text NOT NULL DEFAULT '', body_selector text NOT NULL DEFAULT '',
  exclude_selector text NOT NULL DEFAULT 'script,style,nav,header,footer',
  active boolean NOT NULL DEFAULT false, max_items integer NOT NULL DEFAULT 12 CHECK(max_items BETWEEN 1 AND 30),
  setup_note text NOT NULL DEFAULT '', baseline_at timestamptz, last_checked_at timestamptz,
  last_success_at timestamptz, last_result text NOT NULL DEFAULT 'pending', last_error text,
  lease_until timestamptz, lease_token text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS entities (
  id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('company','project')), name text NOT NULL,
  company_id text REFERENCES entities(id) ON DELETE SET NULL, memo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS entity_institutions (
  entity_id text NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  PRIMARY KEY(entity_id,institution_id)
);
CREATE TABLE IF NOT EXISTS notices (
  id text PRIMARY KEY, institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  source_key text NOT NULL, title text NOT NULL, url text NOT NULL, published_date text,
  first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id,source_key)
);
CREATE TABLE IF NOT EXISTS check_runs (
  id text PRIMARY KEY, institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  status text NOT NULL CHECK(status IN ('running','baseline','unchanged','changed','failed')),
  item_count integer NOT NULL DEFAULT 0, new_count integer NOT NULL DEFAULT 0, changed_count integer NOT NULL DEFAULT 0,
  error text, trigger_type text NOT NULL DEFAULT 'manual'
);
CREATE TABLE IF NOT EXISTS snapshots (
  id text PRIMARY KEY, notice_id text NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES check_runs(id) ON DELETE CASCADE,
  title text NOT NULL, body text NOT NULL, content_hash text NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(), source_url text NOT NULL
);
CREATE TABLE IF NOT EXISTS changes (
  id text PRIMARY KEY, notice_id text NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('baseline','new','changed')),
  before_snapshot_id text REFERENCES snapshots(id), after_snapshot_id text NOT NULL REFERENCES snapshots(id),
  found_at timestamptz NOT NULL DEFAULT now(),
  reviewed boolean NOT NULL DEFAULT false, response_status text NOT NULL DEFAULT '미분류'
    CHECK(response_status IN ('미분류','영향 없음','검토 필요','대응 중','대응 완료')),
  memo text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  UNIQUE(notice_id,after_snapshot_id)
);
CREATE TABLE IF NOT EXISTS change_entities (
  change_id text NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  entity_id text NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  PRIMARY KEY(change_id,entity_id)
);
CREATE TABLE IF NOT EXISTS activities (
  id text PRIMARY KEY, change_id text NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT '개인 사용자', reviewed boolean NOT NULL, response_status text NOT NULL,
  memo text NOT NULL DEFAULT '', entity_ids jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS check_schedules (
  id text PRIMARY KEY, institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL, memo text NOT NULL DEFAULT '',
  completed_run_id text REFERENCES check_runs(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_institutions_workspace ON institutions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_changes_found ON changes(found_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_notice ON snapshots(notice_id,collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_institution ON check_runs(institution_id,started_at DESC);
CREATE INDEX IF NOT EXISTS idx_entities_workspace ON entities(workspace_id);
