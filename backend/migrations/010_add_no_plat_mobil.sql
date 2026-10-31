--
-- Add no_plat_mobil column to barang_masuk table
--

ALTER TABLE barang_masuk
  ADD COLUMN IF NOT EXISTS no_plat_mobil VARCHAR(20);