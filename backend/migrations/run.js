const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('🚀 Running migrations...');
    for (const file of files) {
      // Check if migration has already run
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE filename = $1', [file]);
      if (rows.length > 0) {
        continue; // Skip already executed migrations
      }

      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      console.log(`  ➜ Executing ${file}`);
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
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
