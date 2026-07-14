-- Migration: Add gambar column to barang_masuk table
-- Description: Add a JSONB column to store an array of base64 images

ALTER TABLE barang_masuk ADD COLUMN IF NOT EXISTS gambar JSONB DEFAULT '[]'::jsonb;
