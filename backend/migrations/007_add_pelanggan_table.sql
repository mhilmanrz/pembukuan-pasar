-- Migration: Add pelanggan table
-- Description: Create pelanggan table and link to hutang_piutang for piutang share links

CREATE TABLE IF NOT EXISTS pelanggan (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) UNIQUE NOT NULL,
  share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  telepon VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert existing pelanggan from hutang_piutang where tipe = 'piutang'
INSERT INTO pelanggan (nama)
SELECT DISTINCT nama FROM hutang_piutang WHERE tipe = 'piutang' AND nama IS NOT NULL
ON CONFLICT (nama) DO NOTHING;

-- Add FK column
ALTER TABLE hutang_piutang ADD COLUMN IF NOT EXISTS pelanggan_id INTEGER REFERENCES pelanggan(id);

-- Update FK data for piutang
UPDATE hutang_piutang hp
SET pelanggan_id = p.id
FROM pelanggan p
WHERE hp.nama = p.nama AND hp.tipe = 'piutang';
