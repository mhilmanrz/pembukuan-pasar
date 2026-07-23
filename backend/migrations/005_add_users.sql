-- Migration: Add users table
-- Description: Authentication system with role-based access

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'karyawan' CHECK (role IN ('admin', 'karyawan')),
  created_at TIMESTAMP DEFAULT NOW()
);
