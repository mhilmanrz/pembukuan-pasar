import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PeriodeProvider } from './context/PeriodeContext';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BarangMasukList from './pages/BarangMasuk/BarangMasukList';
import BarangMasukForm from './pages/BarangMasuk/BarangMasukForm';
import BarangMasukBayar from './pages/BarangMasuk/BarangMasukBayar';
import PenjualanList from './pages/Penjualan/PenjualanList';
import PenjualanForm from './pages/Penjualan/PenjualanForm';
import PiutangList from './pages/Piutang/PiutangList';
import PiutangForm from './pages/Piutang/PiutangForm';
import PiutangBayar from './pages/Piutang/PiutangBayar';
import Riwayat from './pages/Riwayat';
import PublicPengirim from './pages/PublicPengirim';
import PublicPelanggan from './pages/PublicPelanggan';

function AppLayout() {
  const location = useLocation();
  // Hide BottomNav and Banner on form/payment sub-pages
  const isSubPage = /\/(tambah|edit|bayar)/.test(location.pathname);

  return (
    <div className="min-h-dvh bg-surface">
      <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />

          {/* Barang Masuk */}
          <Route path="/barang-masuk" element={<BarangMasukList />}>
            <Route path="tambah" element={<BarangMasukForm />} />
            <Route path=":id/edit" element={<BarangMasukForm />} />
            <Route path="bayar/:nama" element={<BarangMasukBayar />} />
          </Route>

          {/* Penjualan */}
          <Route path="/penjualan" element={<PenjualanList />}>
            <Route path="tambah" element={<PenjualanForm />} />
            <Route path=":id/edit" element={<PenjualanForm />} />
          </Route>

          {/* Piutang */}
          <Route path="/piutang" element={<PiutangList />}>
            <Route path="tambah" element={<PiutangForm />} />
            <Route path=":id/edit" element={<PiutangForm />} />
            <Route path="bayar/:nama" element={<PiutangBayar />} />
          </Route>

          <Route path="/riwayat" element={<Riwayat />} />
        </Routes>
      </main>
      {!isSubPage && <BottomNav />}
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
                <PeriodeProvider>
                  <AppLayout />
                </PeriodeProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
