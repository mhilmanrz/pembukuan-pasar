-- Migration: Add pembayaran_barang_masuk table
-- Description: Track installment payments for incoming goods

CREATE TABLE IF NOT EXISTS pembayaran_barang_masuk (
  id SERIAL PRIMARY KEY,
  barang_masuk_id INTEGER NOT NULL REFERENCES barang_masuk(id) ON DELETE CASCADE,
  tanggal_bayar DATE NOT NULL,
  jumlah_bayar NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
