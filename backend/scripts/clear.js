const { Pool } = require('pg');
require('dotenv').config({ path: '.env' }); // Make sure to read the DB URL

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clear() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Clearing all tables...');
    await client.query('TRUNCATE TABLE pembayaran CASCADE');
    await client.query('TRUNCATE TABLE hutang_piutang CASCADE');
    await client.query('TRUNCATE TABLE penjualan CASCADE');
    await client.query('TRUNCATE TABLE pembayaran_barang_masuk CASCADE');
    await client.query('TRUNCATE TABLE barang_masuk CASCADE');

    await client.query('COMMIT');
    console.log('✅ Database cleared successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing database:', e);
  } finally {
    client.release();
    pool.end();
  }
}

clear();
