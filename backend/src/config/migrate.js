const { pool } = require('./db');
require('dotenv').config();
console.log("👉 DATABASE_URL =", process.env.DATABASE_URL);

const SCHEMA = `
-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ─── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(20),
  gstin         VARCHAR(20),
  pan           VARCHAR(20),
  email         VARCHAR(255),
  phone         VARCHAR(30),
  website       VARCHAR(255),
  logo_url      TEXT,
  bank_name     VARCHAR(100),
  account_number VARCHAR(30),
  ifsc          VARCHAR(20),
  invoice_prefix VARCHAR(20) DEFAULT 'INV',
  payment_terms  INTEGER DEFAULT 30,
  default_notes  TEXT,
  cgst_rate     DECIMAL(5,2) DEFAULT 9.00,
  sgst_rate     DECIMAL(5,2) DEFAULT 9.00,
  igst_rate     DECIMAL(5,2) DEFAULT 18.00,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee')),
  department    VARCHAR(100),
  phone         VARCHAR(30),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Clients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES users(id),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(30),
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(20),
  gstin         VARCHAR(20),
  pan           VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  created_by      UUID REFERENCES users(id),
  invoice_number  VARCHAR(50) UNIQUE NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','paid','overdue','cancelled')),
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  gst_rate        DECIMAL(5,2) DEFAULT 18.00,
  gst_type        VARCHAR(20) DEFAULT 'IGST' CHECK (gst_type IN ('IGST','CGST+SGST')),
  discount        DECIMAL(5,2) DEFAULT 0,
  subtotal        DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  taxable_amount  DECIMAL(15,2) DEFAULT 0,
  gst_amount      DECIMAL(15,2) DEFAULT 0,
  cgst_amount     DECIMAL(15,2) DEFAULT 0,
  sgst_amount     DECIMAL(15,2) DEFAULT 0,
  igst_amount     DECIMAL(15,2) DEFAULT 0,
  total           DECIMAL(15,2) DEFAULT 0,
  notes           TEXT,
  public_token    VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('weekly','monthly','quarterly','yearly')),
  next_recurrence DATE,
  sent_at         TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoice Items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hsn         VARCHAR(20),
  unit        VARCHAR(20) DEFAULT 'Nos',
  quantity    DECIMAL(10,3) NOT NULL,
  price       DECIMAL(15,2) NOT NULL,
  amount      DECIMAL(15,2) GENERATED ALWAYS AS (quantity * price) STORED,
  sort_order  INTEGER DEFAULT 0
);

-- ─── Payments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id            UUID REFERENCES invoices(id),
  company_id            UUID REFERENCES companies(id),
  amount                DECIMAL(15,2) NOT NULL,
  currency              VARCHAR(10) DEFAULT 'INR',
  method                VARCHAR(50),
  status                VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  razorpay_order_id     VARCHAR(100),
  razorpay_payment_id   VARCHAR(100) UNIQUE,
  razorpay_signature    TEXT,
  receipt_url           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Activities / Audit Log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id   VARCHAR(100),
  metadata    JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  type        VARCHAR(50),
  is_read     BOOLEAN DEFAULT FALSE,
  link        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company ON activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ─── Updated-at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['companies','users','clients','invoices','payments'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t);
  END LOOP;
END $$;
`;

async function migrate() {
  
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT current_database()');
    console.log("👉 Connected DB:", res.rows[0].current_database);

    console.log('🔄 Running migrations...');
    await client.query(SCHEMA);
    console.log('✅ Migrations complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();