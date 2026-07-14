import { useState, useEffect } from 'react';
import { getBarangMasuk, getPenjualan, getHutangPiutang, restoreBarangMasuk, restorePenjualan, restoreHutangPiutang } from '../services/api';
import { formatRupiah, formatKg, formatTanggal } from '../utils/format';
import PageHeader from '../components/PageHeader';

export default function Riwayat() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => { fetchAll(); }, [dari, sampai, showDeleted]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dari) params.dari = dari;
      if (sampai) params.sampai = sampai;
      if (showDeleted) params.status = 'deleted';

      const [bmRes, pjRes, hpRes] = await Promise.all([
        getBarangMasuk(params),
        getPenjualan(params),
        getHutangPiutang(params),
      ]);

      const all = [
        ...bmRes.data.map((d) => ({ ...d, _type: 'barang_masuk', _date: d.tanggal })),
        ...pjRes.data.map((d) => ({ ...d, _type: 'penjualan', _date: d.tanggal })),
        ...hpRes.data.map((d) => ({ ...d, _type: 'hutang_piutang', _date: d.tanggal })),
      ];

      all.sort((a, b) => new Date(b._date) - new Date(a._date));
      setTransactions(all);
    } catch (err) {
      console.error('Gagal memuat riwayat:', err);
      alert('Gagal memuat data riwayat');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item) => {
    try {
      if (item._type === 'barang_masuk') await restoreBarangMasuk(item.id);
      else if (item._type === 'penjualan') await restorePenjualan(item.id);
      else if (item._type === 'hutang_piutang') await restoreHutangPiutang(item.id);
      
      alert('Data berhasil dipulihkan');
      fetchAll();
    } catch (err) {
      console.error('Error restore:', err);
      alert('Gagal memulihkan data');
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'barang_masuk':
        return { label: '📦 Stok Masuk', cls: 'bg-melon-500/15 text-melon-400' };
      case 'penjualan':
        return { label: '💰 Penjualan', cls: 'bg-watermelon-500/15 text-watermelon-400' };
      case 'hutang_piutang':
        return { label: '📋 Hutang/Piutang', cls: 'bg-amber-500/15 text-amber-400' };
      default:
        return { label: type, cls: 'bg-gray-500/15 text-gray-400' };
    }
  };

  const getDetails = (item) => {
    switch (item._type) {
      case 'barang_masuk':
        return (
          <>
            <span className="text-melon-400 font-medium">{formatKg(item.kg)}</span>
            <span className="text-text-muted">dari {item.nama_pengirim}</span>
            <span className="text-text-secondary">{formatRupiah(item.harga)}</span>
          </>
        );
      case 'penjualan':
        return (
          <>
            <span className={`text-xs px-1.5 py-0.5 rounded ${item.sesi === 'siang' ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
              {item.sesi === 'siang' ? '☀️' : '🌙'} {item.sesi}
            </span>
            <span className="text-watermelon-400 font-medium">{formatKg(item.kg_terjual)}</span>
            <span className="text-melon-400 font-bold">{formatRupiah(item.total_uang)}</span>
          </>
        );
      case 'hutang_piutang':
        return (
          <>
            <span className={`text-xs px-1.5 py-0.5 rounded ${item.tipe === 'piutang' ? 'bg-orange-500/15 text-orange-400' : 'bg-blue-500/15 text-blue-400'}`}>
              {item.tipe === 'piutang' ? '📤' : '📥'} {item.tipe}
            </span>
            <span className="text-text-primary">{item.nama}</span>
            <span className="text-text-secondary">{formatRupiah(item.jumlah_total)}</span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHeader title="Riwayat" subtitle={showDeleted ? "Keranjang sampah" : "Semua transaksi"} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between items-start sm:items-center">
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none">
            <input type="date" value={dari} onChange={(e) => setDari(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary" />
          </div>
          <div className="flex-1 sm:flex-none">
            <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary" />
          </div>
          {(dari || sampai) && (
            <button onClick={() => { setDari(''); setSampai(''); }}
              className="px-3 py-2.5 rounded-xl bg-surface-card text-text-muted hover:text-text-primary text-sm border border-border">
              Reset
            </button>
          )}
        </div>
        <button 
           onClick={() => setShowDeleted(!showDeleted)}
           className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full sm:w-auto ${
             showDeleted 
               ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' 
               : 'bg-surface-card border border-border text-text-muted hover:text-text-primary'
           }`}
        >
          {showDeleted ? 'Tampilkan Riwayat Aktif' : '🗑️ Lihat Keranjang Sampah'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-elevated rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">{showDeleted ? '🗑️' : '📜'}</span>
          <p className="text-text-muted">{showDeleted ? 'Keranjang sampah kosong' : 'Belum ada transaksi'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((item, idx) => {
            const badge = getTypeBadge(item._type);
            return (
              <div key={`${item._type}-${item.id}-${idx}`} className={`bg-surface-card rounded-2xl p-4 border ${showDeleted ? 'border-rose-500/30 opacity-75' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs text-text-muted">{formatTanggal(item._date)}</span>
                  </div>
                  {showDeleted && (
                    <button 
                      onClick={() => handleRestore(item)} 
                      className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 font-bold transition-colors shadow-sm"
                    >
                      ↺ Pulihkan
                    </button>
                  )}
                </div>
                <div className={`flex items-center gap-3 text-sm flex-wrap ${showDeleted ? 'opacity-80 line-through' : ''}`}>
                  {getDetails(item)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
