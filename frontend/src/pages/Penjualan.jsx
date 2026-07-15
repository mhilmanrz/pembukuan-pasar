import { useState, useEffect, useMemo } from 'react';
import { getPenjualan, createPenjualan, updatePenjualan, deletePenjualan } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import NumberInput from '../components/NumberInput';

// Helper to get date range params from filter
function getDateParams(filter, dari, sampai) {
  const now = new Date();
  const today = todayStr();
  switch (filter) {
    case 'hari-ini':
      return { dari: today, sampai: today };
    case 'minggu-ini': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { dari: start.toISOString().split('T')[0], sampai: today };
    }
    case 'bulan-ini':
      return { dari: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, sampai: today };
    case 'custom':
      return { dari, sampai };
    default:
      return {};
  }
}

export default function Penjualan() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ tanggal: todayStr(), sesi: 'siang', kg_terjual: '', total_uang: '' });
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filter, setFilter] = useState('bulan-ini');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(todayStr());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { 
    if (filter === 'custom' && (!dari || !sampai)) return;
    fetchData(); 
  }, [filter, dari, sampai]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = getDateParams(filter, dari, sampai);
      const res = await getPenjualan(params);
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter with Search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.sesi === searchQuery);
  }, [items, searchQuery]);

  // Summary totals
  const summary = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        totalUang: acc.totalUang + (parseFloat(item.total_uang) || 0),
        totalKg: acc.totalKg + (parseFloat(item.kg_terjual) || 0),
        count: acc.count + 1,
      }),
      { totalUang: 0, totalKg: 0, count: 0 }
    );
  }, [filteredItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ tanggal: todayStr(), sesi: 'siang', kg_terjual: '', total_uang: '' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      tanggal: item.tanggal?.split('T')[0] || '',
      sesi: item.sesi,
      kg_terjual: item.kg_terjual,
      total_uang: item.total_uang,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await updatePenjualan(editItem.id, form);
      } else {
        await createPenjualan(form);
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try {
      await deletePenjualan(id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  const filterLabel = { 'bulan-ini': 'Bulan Ini', 'minggu-ini': 'Minggu Ini', 'hari-ini': 'Hari Ini', 'semua': 'Semua', 'custom': 'Custom' };

  return (
    <div>
      <PageHeader
        title="Penjualan"
        subtitle="Catat penjualan per sesi"
        action={
          <button onClick={openCreate}
            className="bg-watermelon-500 hover:bg-watermelon-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-watermelon-500/25 active:scale-95">
            + Catat
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Filter Sesi Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: '', label: 'Semua Sesi' },
            { val: 'siang', label: '☀️ Siang' },
            { val: 'malam', label: '🌙 Malam' }
          ].map(s => (
            <button
              key={s.val}
              onClick={() => setSearchQuery(s.val)}
              className={`py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                searchQuery === s.val
                  ? (s.val === 'siang' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' 
                    : s.val === 'malam' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25')
                  : 'bg-surface-card text-text-secondary hover:bg-surface-elevated border border-border'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Date filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {[
            { val: 'bulan-ini', label: 'Bulan Ini' },
            { val: 'minggu-ini', label: 'Minggu Ini' },
            { val: 'hari-ini', label: 'Hari Ini' },
            { val: 'semua', label: 'Semua' },
            { val: 'custom', label: 'Custom' },
          ].map((f) => (
            <button
              key={f.val}
              onClick={() => setFilter(f.val)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                filter === f.val
                  ? 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25'
                  : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {filter === 'custom' && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Dari</label>
              <input type="date" value={dari} onChange={(e) => setDari(e.target.value)}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Sampai</label>
              <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)}
                className="w-full bg-surface-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {!loading && filteredItems.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-gradient-to-br from-watermelon-500 to-watermelon-700 rounded-2xl p-4 shadow-lg text-white">
            <p className="text-xs text-white/70 font-medium mb-1">Total Penjualan {filterLabel[filter] || ''}</p>
            <p className="text-2xl font-bold">{formatRupiah(summary.totalUang)}</p>
          </div>
          
          <div className="bg-surface-card rounded-2xl p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Total Berat</p>
            <p className="text-lg font-bold text-text-primary">{formatKg(summary.totalKg)}</p>
          </div>
          
          <div className="bg-surface-card rounded-2xl p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Rata-rata/Transaksi</p>
            <p className="text-lg font-bold text-text-primary">
              {summary.count > 0 ? formatRupiah(summary.totalUang / summary.count) : 'Rp 0'}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse border border-border">
              <div className="h-4 bg-surface-elevated rounded w-1/3 mb-3" />
              <div className="h-6 bg-surface-elevated rounded w-1/2 mb-2" />
              <div className="h-4 bg-surface-elevated rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">💰</span>
          <p className="text-text-muted">Data penjualan tidak ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-surface-card rounded-2xl p-4 border border-border hover:border-watermelon-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-surface-elevated text-text-secondary px-2.5 py-1 rounded-full">
                    Sesi {item.sesi === 'siang' ? '☀️ Siang' : '🌙 Malam'}
                  </span>
                  <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-text-muted mb-0.5">Terjual</p>
                  <p className="text-sm font-semibold text-text-primary">{formatKg(item.kg_terjual)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted mb-0.5">Pendapatan</p>
                  <p className="text-lg font-bold text-watermelon-500">{formatRupiah(item.total_uang)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Penjualan' : 'Catat Penjualan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Sesi</label>
            <div className="grid grid-cols-2 gap-3">
              {['siang', 'malam'].map((s) => (
                <button key={s} type="button" onClick={() => setForm({ ...form, sesi: s })}
                  className={`py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    form.sesi === s
                      ? (s === 'siang' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25')
                      : 'bg-surface-elevated text-text-secondary hover:bg-surface-card border border-border'
                  }`}>
                  {s === 'siang' ? '☀️ Siang' : '🌙 Malam'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">KG Terjual</label>
            <NumberInput value={form.kg_terjual} onChange={(e) => setForm({ ...form, kg_terjual: e.target.value })}
              allowDecimals={true} suffix="kg" placeholder="Contoh: 150" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Total Uang</label>
            <CurrencyInput value={form.total_uang} onChange={(e) => setForm({ ...form, total_uang: e.target.value })}
              placeholder="Contoh: 1.500.000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-watermelon-500 hover:bg-watermelon-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Catat Penjualan'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
