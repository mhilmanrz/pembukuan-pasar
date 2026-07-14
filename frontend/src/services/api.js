import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Barang Masuk
export const getBarangMasuk = (params) => api.get('/barang-masuk', { params });
export const getPengirimList = () => api.get('/barang-masuk/pengirim');
export const createBarangMasuk = (data) => api.post('/barang-masuk', data);
export const updateBarangMasuk = (id, data) => api.put(`/barang-masuk/${id}`, data);
export const deleteBarangMasuk = (id) => api.delete(`/barang-masuk/${id}`);
export const restoreBarangMasuk = (id) => api.put(`/barang-masuk/${id}/restore`);
export const getPembayaranBM = (id) => api.get(`/barang-masuk/${id}/bayar`);
export const addPembayaranBM = (id, data) => api.post(`/barang-masuk/${id}/bayar`, data);
export const getPembayaranPengirim = (nama) => api.get(`/barang-masuk/pengirim/${encodeURIComponent(nama)}/bayar`);
export const addPembayaranPengirim = (nama, data) => api.post(`/barang-masuk/pengirim/${encodeURIComponent(nama)}/bayar`, data);

// Penjualan
export const getPenjualan = (params) => api.get('/penjualan', { params });
export const createPenjualan = (data) => api.post('/penjualan', data);
export const updatePenjualan = (id, data) => api.put(`/penjualan/${id}`, data);
export const deletePenjualan = (id) => api.delete(`/penjualan/${id}`);
export const restorePenjualan = (id) => api.put(`/penjualan/${id}/restore`);

// Hutang Piutang
export const getHutangPiutang = (params) => api.get('/hutang-piutang', { params });
export const createHutangPiutang = (data) => api.post('/hutang-piutang', data);
export const updateHutangPiutang = (id, data) => api.put(`/hutang-piutang/${id}`, data);
export const deleteHutangPiutang = (id) => api.delete(`/hutang-piutang/${id}`);
export const restoreHutangPiutang = (id) => api.put(`/hutang-piutang/${id}/restore`);

// Pembayaran
export const createPembayaran = (data) => api.post('/pembayaran', data);
export const getPembayaranByHP = (hutangPiutangId) => api.get(`/pembayaran/${hutangPiutangId}`);

// Laporan
export const getLaporan = (params) => api.get('/laporan', { params });
export const getGrafikPenjualan = (params) => api.get('/laporan/grafik', { params });

export default api;
