CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runtime_records (
  id TEXT PRIMARY KEY,
  note TEXT NOT NULL CHECK (length(trim(note)) > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  requested_url TEXT NOT NULL,
  final_url TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('FETCHED', 'BLOCKED', 'FETCH_FAILED')),
  http_status INTEGER,
  title TEXT,
  content_bytes INTEGER,
  content_sha256 TEXT,
  snapshot_path TEXT,
  chromium_version TEXT,
  user_agent TEXT,
  duration_ms INTEGER NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_runs (
  id TEXT PRIMARY KEY,
  browser_user_agent TEXT NOT NULL,
  model_id TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('LOAD', 'GENERATE')),
  cache_hit INTEGER CHECK (cache_hit IN (0, 1)),
  webgpu_available INTEGER NOT NULL CHECK (webgpu_available IN (0, 1)),
  duration_ms INTEGER NOT NULL,
  output_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);
