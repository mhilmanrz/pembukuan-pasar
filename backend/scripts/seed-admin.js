/**
 * Seed script: Create admin user
 * Usage: node scripts/seed-admin.js
 * 
 * You can customize the admin credentials via environment variables:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=yourpassword node scripts/seed-admin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const nama = process.env.ADMIN_NAMA || 'Administrator';

  try {
    // Check if admin already exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existing.length > 0) {
      console.log(`⚠️  User "${username}" sudah ada (ID: ${existing[0].id}). Skip.`);
      console.log('   Untuk reset password, gunakan: ADMIN_PASSWORD=newpass node scripts/seed-admin.js --reset');

      if (process.argv.includes('--reset')) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);
        console.log(`✅ Password untuk "${username}" berhasil di-reset.`);
      }
    } else {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        'INSERT INTO users (username, password_hash, nama, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [username, hash, nama, 'admin']
      );
      console.log(`✅ Admin user berhasil dibuat:`);
      console.log(`   ID: ${rows[0].id}`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role: admin`);
      console.log('');
      console.log('⚠️  PENTING: Segera ubah password default setelah login!');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
