-- Migration: Add soft deletes
-- Description: Add deleted_at column to main tables

ALTER TABLE barang_masuk ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE hutang_piutang ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE pembayaran ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE pembayaran_barang_masuk ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
