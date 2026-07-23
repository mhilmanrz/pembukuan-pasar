import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BarangMasuk from './pages/BarangMasuk';
import Penjualan from './pages/Penjualan';
import Piutang from './pages/Piutang';
import Riwayat from './pages/Riwayat';
import PublicPengirim from './pages/PublicPengirim';
import PublicPelanggan from './pages/PublicPelanggan';

function AppLayout() {
  return (
    <div className="min-h-dvh bg-surface">
      <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/barang-masuk" element={<BarangMasuk />} />
          <Route path="/penjualan" element={<Penjualan />} />
          <Route path="/piutang" element={<Piutang />} />
          <Route path="/riwayat" element={<Riwayat />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/p/:token" element={<PublicPengirim />} />
          <Route path="/u/:token" element={<PublicPelanggan />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
