require('dotenv').config();
const pool = require('../src/config/db');

async function check() {
  try {
    // 1. Semua data penjualan aktif bulan ini
    const now = new Date();
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    console.log(`\n=== DATA PENJUALAN AKTIF (Bulan Ini: ${bulanIni} s/d ${today}) ===\n`);

    const result = await pool.query(
      `SELECT id, tanggal, sesi, kg_terjual, total_uang, created_at 
       FROM penjualan 
       WHERE deleted_at IS NULL AND tanggal BETWEEN $1 AND $2
       ORDER BY tanggal DESC, created_at DESC`,
      [bulanIni, today]
    );

    let totalKg = 0;
    let totalUang = 0;

    result.rows.forEach((row, i) => {
      const kg = parseFloat(row.kg_terjual);
      const uang = parseFloat(row.total_uang);
      totalKg += kg;
      totalUang += uang;
      console.log(`  ${i + 1}. [${row.id}] ${row.tanggal.toISOString().split('T')[0]} | ${row.sesi.padEnd(6)} | ${kg} kg | Rp ${uang.toLocaleString('id-ID')}`);
    });

    console.log(`\n  --- TOTAL: ${totalKg} kg | Rp ${totalUang.toLocaleString('id-ID')} (${result.rows.length} transaksi) ---`);

    // 2. Cek apakah ada data terhapus (soft delete) bulan ini
    console.log(`\n=== DATA TERHAPUS (Soft Delete) Bulan Ini ===\n`);

    const deleted = await pool.query(
      `SELECT id, tanggal, sesi, kg_terjual, total_uang, deleted_at 
       FROM penjualan 
       WHERE deleted_at IS NOT NULL AND tanggal BETWEEN $1 AND $2
       ORDER BY tanggal DESC`,
      [bulanIni, today]
    );

    if (deleted.rows.length === 0) {
      console.log('  (Tidak ada data terhapus bulan ini)');
    } else {
      deleted.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. [${row.id}] ${row.tanggal.toISOString().split('T')[0]} | ${row.sesi} | ${parseFloat(row.kg_terjual)} kg | Rp ${parseFloat(row.total_uang).toLocaleString('id-ID')} | dihapus: ${row.deleted_at}`);
      });
    }

    // 3. Cek duplikat (tanggal + sesi yang sama)
    console.log(`\n=== CEK DUPLIKAT (Tanggal + Sesi sama) ===\n`);

    const dups = await pool.query(
      `SELECT tanggal, sesi, COUNT(*) as jumlah, SUM(kg_terjual) as total_kg
       FROM penjualan 
       WHERE deleted_at IS NULL AND tanggal BETWEEN $1 AND $2
       GROUP BY tanggal, sesi 
       HAVING COUNT(*) > 1
       ORDER BY tanggal DESC`,
      [bulanIni, today]
    );

    if (dups.rows.length === 0) {
      console.log('  (Tidak ada duplikat)');
    } else {
      dups.rows.forEach((row) => {
        console.log(`  ⚠️  ${row.tanggal.toISOString().split('T')[0]} ${row.sesi}: ${row.jumlah}x entries, total ${parseFloat(row.total_kg)} kg`);
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
