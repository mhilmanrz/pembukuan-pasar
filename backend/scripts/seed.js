const { Pool } = require('pg');
require('dotenv').config({ path: '.env' }); // Make sure to read the DB URL

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const today = new Date();
const formatDate = (daysAgo) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Inserting Barang Masuk...');
    // Insert Barang Masuk
    const bmQueries = [
      `INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, harga, gambar) VALUES ('${formatDate(10)}', 1500, 'Pak Anton', 7500000, '[]') RETURNING id`,
      `INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, harga, gambar) VALUES ('${formatDate(5)}', 2000, 'H. Budi', 9500000, '[]') RETURNING id`,
      `INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, harga, gambar) VALUES ('${formatDate(2)}', 800, 'Pak Anton', 4000000, '[]') RETURNING id`,
      `INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, harga, gambar) VALUES ('${formatDate(0)}', 1200, 'Pak Joko', 5800000, '[]') RETURNING id`,
    ];
    
    let bmIds = [];
    for (const q of bmQueries) {
      const res = await client.query(q);
      bmIds.push(res.rows[0].id);
    }

    console.log('Inserting Pembayaran Barang Masuk...');
    // Pay some of them
    await client.query(`INSERT INTO pembayaran_barang_masuk (barang_masuk_id, tanggal_bayar, jumlah_bayar) VALUES ($1, '${formatDate(8)}', 5000000)`, [bmIds[0]]);
    await client.query(`INSERT INTO pembayaran_barang_masuk (barang_masuk_id, tanggal_bayar, jumlah_bayar) VALUES ($1, '${formatDate(4)}', 4000000)`, [bmIds[1]]);
    await client.query(`INSERT INTO pembayaran_barang_masuk (barang_masuk_id, tanggal_bayar, jumlah_bayar) VALUES ($1, '${formatDate(1)}', 2000000)`, [bmIds[1]]);

    console.log('Inserting Penjualan...');
    // Penjualan
    const pjQueries = [
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(10)}', 'siang', 300, 1800000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(10)}', 'malam', 250, 1400000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(8)}', 'siang', 400, 2500000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(7)}', 'malam', 150, 950000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(5)}', 'siang', 500, 3100000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(4)}', 'malam', 350, 2100000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(2)}', 'siang', 600, 3800000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(1)}', 'malam', 200, 1250000)`,
      `INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ('${formatDate(0)}', 'siang', 100, 650000)`,
    ];
    for (const q of pjQueries) {
      await client.query(q);
    }

    console.log('Inserting Hutang Piutang...');
    // Hutang Piutang
    const hpQueries = [
      `INSERT INTO hutang_piutang (tipe, tanggal, nama, kg, jumlah_total, keterangan) VALUES ('piutang', '${formatDate(9)}', 'Warteg Ibu Siti', 50, 350000, 'Semangka potong') RETURNING id`,
      `INSERT INTO hutang_piutang (tipe, tanggal, nama, kg, jumlah_total, keterangan) VALUES ('piutang', '${formatDate(6)}', 'Pak RT', 20, 150000, 'Untuk arisan') RETURNING id`,
      `INSERT INTO hutang_piutang (tipe, tanggal, nama, kg, jumlah_total, keterangan) VALUES ('piutang', '${formatDate(1)}', 'Toko Buah Segar', 200, 1300000, 'Ambil borongan') RETURNING id`,
      `INSERT INTO hutang_piutang (tipe, tanggal, nama, kg, jumlah_total, keterangan) VALUES ('hutang', '${formatDate(3)}', 'Sopir Truk', 0, 500000, 'Ongkos kirim tambahan') RETURNING id`,
    ];

    let hpIds = [];
    for (const q of hpQueries) {
      const res = await client.query(q);
      hpIds.push(res.rows[0].id);
    }

    console.log('Inserting Pembayaran Hutang Piutang...');
    // Pay some hutang piutang
    await client.query(`INSERT INTO pembayaran (hutang_piutang_id, tanggal_bayar, jumlah_bayar) VALUES ($1, '${formatDate(8)}', 150000)`, [hpIds[0]]);
    await client.query(`INSERT INTO pembayaran (hutang_piutang_id, tanggal_bayar, jumlah_bayar) VALUES ($1, '${formatDate(5)}', 150000)`, [hpIds[1]]); // Lunas
    await client.query(`INSERT INTO pembayaran (hutang_piutang_id, tanggal_bayar, jumlah_bayar) VALUES ($1, '${formatDate(0)}', 500000)`, [hpIds[2]]);

    await client.query('COMMIT');
    console.log('✅ Dummy data successfully injected!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error injecting dummy data:', e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
