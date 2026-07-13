# 🍉 Pembukuan Semangka

Aplikasi web pembukuan penjualan semangka — mobile-first, untuk pemilik usaha single-user.

## Fitur

- **Dashboard** — Ringkasan sisa stok, omzet, kas diterima, piutang & hutang
- **Barang Masuk** — Catat stok semangka yang masuk (kg, pengirim, harga)
- **Penjualan** — Catat penjualan per sesi siang/malam
- **Hutang & Piutang** — Kelola hutang ke pengirim & piutang dari pembeli, termasuk cicilan
- **Riwayat** — Gabungan semua transaksi dengan filter tanggal

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express
- **Database**: PostgreSQL

## Setup Lokal

### 1. Database
Buat database PostgreSQL lalu jalankan migration:
```bash
cd backend
cp .env.example .env
# Edit .env sesuai koneksi database Anda
npm install
npm run migrate
```

### 2. Backend
```bash
cd backend
npm run dev
# Server jalan di http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# App jalan di http://localhost:5173
```

## Deployment

- **Backend + DB**: Railway (set `DATABASE_URL` dan `FRONTEND_URL` env vars)
- **Frontend**: Netlify (set `VITE_API_URL` env var ke URL backend Railway)

## Environment Variables

### Backend (.env)
| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port server (default: 5000) |
| `FRONTEND_URL` | URL frontend untuk CORS |

### Frontend (.env)
| Variable | Keterangan |
|---|---|
| `VITE_API_URL` | URL backend API (contoh: `https://your-app.railway.app/api`) |
