import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import BarangMasuk from './pages/BarangMasuk';
import Penjualan from './pages/Penjualan';
import HutangPiutang from './pages/HutangPiutang';
import Riwayat from './pages/Riwayat';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-surface">
        <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/barang-masuk" element={<BarangMasuk />} />
            <Route path="/penjualan" element={<Penjualan />} />
            <Route path="/hutang-piutang" element={<HutangPiutang />} />
            <Route path="/riwayat" element={<Riwayat />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
