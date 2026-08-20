import { useState, useEffect, useMemo } from 'react';
import { getBarangMasuk, getPenjualan, getHutangPiutang, restoreBarangMasuk, restorePenjualan, restoreHutangPiutang, getRiwayatPembayaran } from '../services/api';
import { formatRupiah, formatKg, formatTanggal } from '../utils/format';
import PageHeader from '../components/PageHeader';

export default function Riwayat() {
  const [activeTab, setActiveTab] = useState('transaksi'); // 'transaksi' | 'pembayaran'

  // Transaksi state
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);

  // Pembayaran state
  const [payments, setPayments] = useState([]);
  const [loadingPay, setLoadingPay] = useState(true);

  // Shared filters
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');

  useEffect(() => { fetchTransaksi(); }, [dari, sampai, showDeleted]);
  useEffect(() => { fetchPembayaran(); }, [dari, sampai]);

  const fetchTransaksi = async () => {
    setLoadingTx(true);
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
    } finally {
      setLoadingTx(false);
    }
  };

  const fetchPembayaran = async () => {
    setLoadingPay(true);
    try {
      const params = {};
      if (dari) params.dari = dari;
      if (sampai) params.sampai = sampai;
      const res = await getRiwayatPembayaran(params);
      setPayments(res.data);
    } catch (err) {
      console.error('Gagal memuat pembayaran:', err);
    } finally {
      setLoadingPay(false);
    }
  };

  // Group payments by tanggal_bayar + created_at (same FIFO-split logic)
  const groupedPayments = useMemo(() => {
    const groups = {};
    payments.forEach(p => {
      const key = `${p.tanggal_bayar}_${p.created_at?.split('.')[0]}_${p.sumber}_${p.nama_pihak}`;
      if (!groups[key]) {
        groups[key] = { key, tanggal_bayar: p.tanggal_bayar, sumber: p.sumber, nama_pihak: p.nama_pihak, total: 0, totalKg: 0, count: 0 };
      }
      groups[key].total += parseFloat(p.jumlah_bayar);
      groups[key].totalKg += parseFloat(p.kg_bayar) || 0;
      groups[key].count += 1;
    });
    return Object.values(groups);
  }, [payments]);

  const handleRestore = async (item) => {
    try {
      if (item._type === 'barang_masuk') await restoreBarangMasuk(item.id);
      else if (item._type === 'penjualan') await restorePenjualan(item.id);
      else if (item._type === 'hutang_piutang') await restoreHutangPiutang(item.id);
      fetchTransaksi();
    } catch (err) {
      console.error('Error restore:', err);
      alert('Gagal memulihkan data');
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'barang_masuk': return { label: '📦 Stok Masuk', cls: 'bg-melon-500/15 text-melon-400' };
      case 'penjualan':    return { label: '💰 Penjualan', cls: 'bg-watermelon-500/15 text-watermelon-400' };
      case 'hutang_piutang': return { label: '📋 Hutang/Piutang', cls: 'bg-amber-500/15 text-amber-400' };
      default: return { label: type, cls: 'bg-gray-500/15 text-gray-400' };
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

  const PaymentBadge = ({ sumber }) => {
    if (sumber === 'piutang') return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">📤 Bayar Piutang</span>
    );
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-melon-500/15 text-melon-400">📦 Bayar Stok</span>
    );
  };

  return (
    <div>
      <PageHeader
        title="Riwayat"
        subtitle={activeTab === 'pembayaran' ? 'Riwayat pembayaran masuk/keluar' : showDeleted ? 'Keranjang sampah' : 'Semua transaksi'}
      />

      {/* Tabs */}
      <div className="flex bg-surface-card rounded-2xl p-1 mb-5 gap-1">
        {[
          { key: 'transaksi', label: '📋 Transaksi' },
          { key: 'pembayaran', label: '💳 Pembayaran' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-watermelon-500 text-white shadow-md shadow-watermelon-500/25'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between items-start sm:items-center">
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
        {activeTab === 'transaksi' && (
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all w-full sm:w-auto ${
              showDeleted
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                : 'bg-surface-card border border-border text-text-muted hover:text-text-primary'
            }`}
          >
            {showDeleted ? 'Tampilkan Riwayat Aktif' : '🗑️ Keranjang Sampah'}
          </button>
        )}
      </div>

      {/* ── Tab: Transaksi ── */}
      {activeTab === 'transaksi' && (
        loadingTx ? (
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
                      <button onClick={() => handleRestore(item)}
                        className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 font-bold transition-colors shadow-sm">
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
        )
      )}

      {/* ── Tab: Pembayaran ── */}
      {activeTab === 'pembayaran' && (
        loadingPay ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2" />
                <div className="h-3 bg-surface-elevated rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : groupedPayments.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">💳</span>
            <p className="text-text-muted">Belum ada riwayat pembayaran</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedPayments.map((group) => (
              <div key={group.key} className="bg-surface-card rounded-2xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PaymentBadge sumber={group.sumber} />
                    <span className="text-xs text-text-muted">{formatTanggal(group.tanggal_bayar)}</span>
                    {group.count > 1 && (
                      <span className="text-[10px] bg-surface-elevated text-text-muted px-1.5 py-0.5 rounded-md">{group.count}x split</span>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${group.sumber === 'piutang' ? 'text-orange-400' : 'text-melon-400'}`}>
                    {formatRupiah(group.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span>{group.sumber === 'piutang' ? '👤' : '📦'}</span>
                  <span className="text-text-secondary font-medium">{group.nama_pihak}</span>
                  {group.totalKg > 0 && (
                    <span className="text-text-muted">· {formatKg(group.totalKg)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
