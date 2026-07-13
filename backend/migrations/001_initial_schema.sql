-- Migration: Initial Schema
-- Description: Create tables for pembukuan semangka

CREATE TABLE IF NOT EXISTS barang_masuk (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  kg NUMERIC(10,2) NOT NULL,
  nama_pengirim VARCHAR(100) NOT NULL,
  harga NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS penjualan (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  sesi VARCHAR(10) NOT NULL CHECK (sesi IN ('siang','malam')),
  kg_terjual NUMERIC(10,2) NOT NULL,
  total_uang NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hutang_piutang (
  id SERIAL PRIMARY KEY,
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('hutang','piutang')),
  tanggal DATE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  kg NUMERIC(10,2),
  jumlah_total NUMERIC(12,2) NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pembayaran (
  id SERIAL PRIMARY KEY,
  hutang_piutang_id INTEGER NOT NULL REFERENCES hutang_piutang(id) ON DELETE CASCADE,
  tanggal_bayar DATE NOT NULL,
  jumlah_bayar NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
