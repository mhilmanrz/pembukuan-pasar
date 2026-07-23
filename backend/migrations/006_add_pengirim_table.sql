-- Migration: Add pengirim table
-- Description: Create pengirim table and link to barang_masuk

CREATE TABLE IF NOT EXISTS pengirim (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) UNIQUE NOT NULL,
  share_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  telepon VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert existing pengirim from barang_masuk
INSERT INTO pengirim (nama)
SELECT DISTINCT nama_pengirim FROM barang_masuk
WHERE nama_pengirim IS NOT NULL
ON CONFLICT (nama) DO NOTHING;

-- Add FK column
ALTER TABLE barang_masuk ADD COLUMN IF NOT EXISTS pengirim_id INTEGER REFERENCES pengirim(id);

-- Update FK data
UPDATE barang_masuk bm
SET pengirim_id = p.id
FROM pengirim p
WHERE bm.nama_pengirim = p.nama;
