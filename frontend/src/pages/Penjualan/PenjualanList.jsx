import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { getPenjualan, deletePenjualan } from '../../services/api';
import { formatRupiah, formatKg, formatTanggal } from '../../utils/format';
import { getDateParams } from '../../utils/dateHelper';
import { usePeriode } from '../../context/PeriodeContext';
import PageHeader from '../../components/PageHeader';
import DateFilterChips from '../../components/DateFilterChips';

export default function PenjualanList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const { globalFilter, setGlobalFilter, globalDari, setGlobalDari, globalSampai, setGlobalSampai, periodeAktif, periodeList } = usePeriode();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (globalFilter === 'custom' && (!globalDari || !globalSampai)) return;
    fetchData();
  }, [globalFilter, globalDari, globalSampai, periodeAktif, periodeList]);

  const fetchData = async () => {
    setLoading(true);
    try { setItems((await getPenjualan(getDateParams(globalFilter, globalDari, globalSampai, periodeAktif, periodeList))).data); }
    catch (err) { console.error('Gagal memuat data:', err); }
    finally { setLoading(false); }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.sesi === searchQuery);
  }, [items, searchQuery]);

  const summary = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({ totalUang: acc.totalUang + (parseFloat(item.total_uang) || 0), totalKg: acc.totalKg + (parseFloat(item.kg_terjual) || 0), count: acc.count + 1 }),
      { totalUang: 0, totalKg: 0, count: 0 }
    );
  }, [filteredItems]);

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try { await deletePenjualan(id); fetchData(); } catch { alert('Gagal menghapus data'); }
  };

  const filterLabel = { 'periode-ini': 'Periode Ini', 'bulan-ini': 'Bulan Ini', 'minggu-ini': 'Minggu Ini', 'hari-ini': 'Hari Ini', 'semua': 'Semua', 'custom': 'Custom' };

  return (
    <div>
      <PageHeader title="Penjualan" subtitle="Catat penjualan per sesi"
        action={<button onClick={() => navigate('/penjualan/tambah')} className="bg-watermelon-500 hover:bg-watermelon-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-watermelon-500/25 active:scale-95">+ Catat</button>} />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[{ val: '', label: 'Semua Sesi' }, { val: 'siang', label: '☀️ Siang' }, { val: 'malam', label: '🌙 Malam' }].map(s => (
            <button key={s.val} onClick={() => setSearchQuery(s.val)}
              className={`py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                searchQuery === s.val
                  ? (s.val === 'siang' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : s.val === 'malam' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25')
                  : 'bg-surface-card text-text-secondary hover:bg-surface-elevated border border-border'
              }`}>{s.label}</button>
          ))}
        </div>
        <DateFilterChips
          filter={globalFilter} onFilterChange={setGlobalFilter}
          dari={globalDari} onDariChange={setGlobalDari}
          sampai={globalSampai} onSampaiChange={setGlobalSampai}
          color="watermelon"
        />  </div>

      {/* Summary */}
      {!loading && filteredItems.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-gradient-to-br from-watermelon-500 to-watermelon-700 rounded-2xl p-4 shadow-lg text-white">
            <p className="text-xs text-white/70 font-medium mb-1">Total Penjualan {filterLabel[globalFilter] || ''}</p>
            <p className="text-2xl font-bold">{formatRupiah(summary.totalUang)}</p>
          </div>
          <div className="bg-surface-card rounded-2xl p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Total Berat</p>
            <p className="text-lg font-bold text-text-primary">{formatKg(summary.totalKg)}</p>
          </div>
          <div className="bg-surface-card rounded-2xl p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Rata-rata/Transaksi</p>
            <p className="text-lg font-bold text-text-primary">{summary.count > 0 ? formatRupiah(summary.totalUang / summary.count) : 'Rp 0'}</p>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse border border-border"><div className="h-4 bg-surface-elevated rounded w-1/3 mb-3" /><div className="h-6 bg-surface-elevated rounded w-1/2 mb-2" /><div className="h-4 bg-surface-elevated rounded w-1/4" /></div>))}</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16"><span className="text-5xl mb-4 block">💰</span><p className="text-text-muted">Data penjualan tidak ditemukan</p></div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-surface-card rounded-2xl p-4 border border-border hover:border-watermelon-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-surface-elevated text-text-secondary px-2.5 py-1 rounded-full">Sesi {item.sesi === 'siang' ? '☀️ Siang' : '🌙 Malam'}</span>
                  <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/penjualan/${item.id}/edit`, { state: { item } })} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div><p className="text-xs text-text-muted mb-0.5">Terjual</p><p className="text-sm font-semibold text-text-primary">{formatKg(item.kg_terjual)}</p></div>
                <div className="text-right"><p className="text-xs text-text-muted mb-0.5">Pendapatan</p><p className="text-lg font-bold text-watermelon-500">{formatRupiah(item.total_uang)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Outlet context={{ onSuccess: () => fetchData() }} />
    </div>
  );
}
