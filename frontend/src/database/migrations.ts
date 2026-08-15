// SQLite migrations. Each runs once, in order, inside a transaction; the DB's
// PRAGMA user_version tracks the applied version. Future phases append new
// migrations here — never edit an existing one or recreate the database.

export interface Migration {
  version: number;
  name: string;
  up: string; // one or more SQL statements
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "users",
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        profile_image TEXT,
        auth_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_demo_user INTEGER NOT NULL DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_remote ON users(remote_id);
    `,
  },
  {
    version: 2,
    name: "conversations",
    up: `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        model_id TEXT,
        mode TEXT NOT NULL DEFAULT 'offline',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        is_private INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, updated_at DESC);
    `,
  },
  {
    version: 3,
    name: "messages",
    up: `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        model_id TEXT,
        token_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at);
    `,
  },
  {
    version: 4,
    name: "models",
    up: `
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        tagline TEXT,
        description TEXT,
        version TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        ram_requirement INTEGER NOT NULL DEFAULT 0,
        license TEXT,
        license_url TEXT,
        developer_name TEXT,
        price REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'credits',
        download_url TEXT,
        checksum TEXT,
        capabilities TEXT,
        featured INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'available',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 5,
    name: "installed_models",
    up: `
      CREATE TABLE IF NOT EXISTS installed_models (
        id TEXT PRIMARY KEY NOT NULL,
        model_id TEXT NOT NULL UNIQUE,
        local_path TEXT,
        version TEXT,
        status TEXT NOT NULL DEFAULT 'not_installed',
        progress REAL NOT NULL DEFAULT 0,
        installed_at TEXT,
        updated_at TEXT NOT NULL,
        checksum TEXT
      );
    `,
  },
  {
    version: 6,
    name: "documents",
    up: `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT,
        mime_type TEXT,
        file_size INTEGER NOT NULL DEFAULT 0,
        doc_type TEXT NOT NULL DEFAULT 'pdf',
        status TEXT NOT NULL DEFAULT 'pending',
        chunk_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_doc_user ON documents(user_id, created_at DESC);
    `,
  },
  {
    version: 7,
    name: "document_chunks",
    up: `
      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY NOT NULL,
        document_id TEXT NOT NULL,
        page_number INTEGER,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        embedding_reference TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chunk_doc ON document_chunks(document_id, chunk_index);
    `,
  },
  {
    version: 8,
    name: "credit_wallet",
    up: `
      CREATE TABLE IF NOT EXISTS credit_wallet (
        user_id TEXT PRIMARY KEY NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        lifetime_earned INTEGER NOT NULL DEFAULT 0,
        lifetime_spent INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 9,
    name: "credit_transactions",
    up: `
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        feature TEXT,
        label TEXT,
        reference_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tx_user ON credit_transactions(user_id, created_at DESC);
    `,
  },
];

export const LATEST_DB_VERSION = migrations[migrations.length - 1].version;
