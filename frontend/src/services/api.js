import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Auth header is set by AuthContext.jsx
// This interceptor handles auto-logout on 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear & redirect if we're not already on the login page
      // and not trying to login (avoid redirect loop)
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('pembukuan_token');
        localStorage.removeItem('pembukuan_user');
        delete api.defaults.headers.common['Authorization'];

        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

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
export const updatePembayaranBM = (paymentId, data) => api.put(`/barang-masuk/pembayaran/${paymentId}`, data);

// Penjualan
export const getPenjualan = (params) => api.get('/penjualan', { params });
export const createPenjualan = (data) => api.post('/penjualan', data);
export const updatePenjualan = (id, data) => api.put(`/penjualan/${id}`, data);
export const deletePenjualan = (id) => api.delete(`/penjualan/${id}`);
export const restorePenjualan = (id) => api.put(`/penjualan/${id}/restore`);

// Hutang Piutang
export const getHutangPiutang = (params) => api.get('/hutang-piutang', { params });
export const getPelangganList = () => api.get('/hutang-piutang/pelanggan');
export const createHutangPiutang = (data) => api.post('/hutang-piutang', data);
export const updateHutangPiutang = (id, data) => api.put(`/hutang-piutang/${id}`, data);
export const deleteHutangPiutang = (id) => api.delete(`/hutang-piutang/${id}`);
export const restoreHutangPiutang = (id) => api.put(`/hutang-piutang/${id}/restore`);

// Pembayaran
export const createPembayaran = (data) => api.post('/pembayaran', data);
export const getPembayaranByHP = (hutangPiutangId) => api.get(`/pembayaran/${hutangPiutangId}`);
export const getPembayaranPelanggan = (nama) => api.get(`/hutang-piutang/pelanggan/${encodeURIComponent(nama)}/bayar`);
export const addPembayaranPelanggan = (nama, data) => api.post(`/hutang-piutang/pelanggan/${encodeURIComponent(nama)}/bayar`, data);
export const updatePembayaranPiutang = (paymentId, data) => api.put(`/hutang-piutang/pembayaran/${paymentId}`, data);

// Laporan
export const getLaporan = (params) => api.get('/laporan', { params });
export const getGrafikPenjualan = (params) => api.get('/laporan/grafik', { params });

// Public Links
export const getPublicPengirim = (token) => api.get(`/public/pengirim/${token}`);
export const getPublicPelanggan = (token) => api.get(`/public/pelanggan/${token}`);

export default api;
