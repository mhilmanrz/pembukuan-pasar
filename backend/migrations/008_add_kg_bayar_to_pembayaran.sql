-- Migration: Add kg_bayar to pembayaran
-- Description: Adds kg_bayar column to record weight paid in installments

ALTER TABLE pembayaran ADD COLUMN IF NOT EXISTS kg_bayar NUMERIC(10,2);
