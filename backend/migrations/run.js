const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('🚀 Running migrations...');
    for (const file of files) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      console.log(`  ➜ ${file}`);
      await client.query(sql);
    }
    console.log('✅ Migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
