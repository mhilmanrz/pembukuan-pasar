-- Migration: Periode Pembukuan
-- Description: Create table for tracking bookkeeping periods (buka/tutup buku)

CREATE TABLE IF NOT EXISTS periode_pembukuan (
  id SERIAL PRIMARY KEY,
  tanggal_buka DATE NOT NULL,
  tanggal_tutup DATE,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure only one active period at a time (tanggal_tutup IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_periode_aktif 
  ON periode_pembukuan (tanggal_tutup) 
  WHERE tanggal_tutup IS NULL;
