const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');
const barangMasukController = require('../controllers/barangMasukController');
const penjualanController = require('../controllers/penjualanController');
const hutangPiutangController = require('../controllers/hutangPiutangController');
const laporanController = require('../controllers/laporanController');
const publicController = require('../controllers/publicController');

// ──────────────────────────────────────
// Auth (public)
// ──────────────────────────────────────
router.post('/auth/login', authController.login);

// ──────────────────────────────────────
// Public Share Links
// ──────────────────────────────────────
router.get('/public/pengirim/:token', publicController.getPengirimByToken);
router.get('/public/pelanggan/:token', publicController.getPelangganByToken);

// ──────────────────────────────────────
// Protected routes (require login)
// ──────────────────────────────────────
router.use(authenticate);

// Auth (protected)
router.get('/auth/me', authController.me);
router.put('/auth/change-password', authController.changePassword);

// Barang Masuk
router.get('/barang-masuk', barangMasukController.getAll);
router.get('/barang-masuk/pengirim', barangMasukController.getPengirimList);
router.get('/barang-masuk/pengirim/:nama/bayar', barangMasukController.getPembayaranPengirim);
router.post('/barang-masuk/pengirim/:nama/bayar', barangMasukController.addPembayaranPengirim);
router.post('/barang-masuk', barangMasukController.create);
router.get('/barang-masuk/:id/bayar', barangMasukController.getPembayaran);
router.post('/barang-masuk/:id/bayar', barangMasukController.addPembayaran);
router.put('/barang-masuk/pembayaran/:paymentId', barangMasukController.updatePembayaran);
router.put('/barang-masuk/:id', barangMasukController.update);
router.delete('/barang-masuk/:id', barangMasukController.remove);
router.put('/barang-masuk/:id/restore', barangMasukController.restore);

// Penjualan
router.get('/penjualan', penjualanController.getAll);
router.post('/penjualan', penjualanController.create);
router.put('/penjualan/:id', penjualanController.update);
router.delete('/penjualan/:id', penjualanController.remove);
router.put('/penjualan/:id/restore', penjualanController.restore);

// Hutang Piutang
router.get('/hutang-piutang', hutangPiutangController.getAll);
router.get('/hutang-piutang/pelanggan', hutangPiutangController.getPelangganList);
router.get('/hutang-piutang/pelanggan/:nama/bayar', hutangPiutangController.getPembayaranPelanggan);
router.post('/hutang-piutang/pelanggan/:nama/bayar', hutangPiutangController.addPembayaranPelanggan);
router.post('/hutang-piutang', hutangPiutangController.create);
router.put('/hutang-piutang/pembayaran/:paymentId', hutangPiutangController.updatePembayaranPiutang);
router.put('/hutang-piutang/:id', hutangPiutangController.update);
router.delete('/hutang-piutang/:id', hutangPiutangController.remove);
router.put('/hutang-piutang/:id/restore', hutangPiutangController.restore);

// Laporan
router.get('/laporan', laporanController.getLaporan);
router.get('/laporan/grafik', laporanController.getGrafikPenjualan);

module.exports = router;
