-- 084: Per-purchase payment addresses for AI credit confirmation.
-- Each purchase is assigned a unique Chia address derived from the same seed.
-- Since only credit payments flow to these addresses, checking the balance
-- of a specific address is a reliable confirmation signal.

CREATE TABLE IF NOT EXISTS ai_payment_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL UNIQUE,
  purchase_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (purchase_id) REFERENCES ai_credit_purchases(id)
);

-- Also add the assigned payment address directly on the purchase row for easy lookup
ALTER TABLE ai_credit_purchases ADD COLUMN payment_address TEXT;
