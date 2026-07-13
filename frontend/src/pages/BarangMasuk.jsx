import { useState, useEffect, useMemo } from 'react';
import { getBarangMasuk, createBarangMasuk, updateBarangMasuk, deleteBarangMasuk, getPengirimList } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

// Helper: get week number of a date
function getWeekLabel(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const weekNum = Math.ceil((d.getDate() + start.getDay()) / 7);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `Minggu ${weekNum} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthLabel(dateStr) {
  const d = new Date(dateStr);
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthValue(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekValue(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const weekNum = Math.ceil((d.getDate() + start.getDay()) / 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
}

export default function BarangMasuk() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ tanggal: todayStr(), kg: '', nama_pengirim: '', harga: '' });
  const [saving, setSaving] = useState(false);
  const [pengirimList, setPengirimList] = useState([]);

  // Filters
  const [filterPengirim, setFilterPengirim] = useState('semua');
  const [filterPeriode, setFilterPeriode] = useState('semua'); // semua, bulan, minggu
  const [filterBulan, setFilterBulan] = useState('');
  const [filterMinggu, setFilterMinggu] = useState('');

  useEffect(() => {
    fetchData();
    fetchPengirimList();
  }, []);

  const fetchPengirimList = async () => {
    try {
      const res = await getPengirimList();
      setPengirimList(res.data);
    } catch (err) {
      console.error('Gagal memuat daftar pengirim:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getBarangMasuk();
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derive available months & weeks from data
  const availableMonths = useMemo(() => {
    const set = new Map();
    items.forEach(item => {
      const val = getMonthValue(item.tanggal);
      if (!set.has(val)) set.set(val, getMonthLabel(item.tanggal));
    });
    return [...set.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const availableWeeks = useMemo(() => {
    const set = new Map();
    items.forEach(item => {
      const val = getWeekValue(item.tanggal);
      if (!set.has(val)) set.set(val, getWeekLabel(item.tanggal));
    });
    return [...set.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let result = items;

    if (filterPengirim !== 'semua') {
      result = result.filter(item => item.nama_pengirim === filterPengirim);
    }

    if (filterPeriode === 'bulan' && filterBulan) {
      result = result.filter(item => getMonthValue(item.tanggal) === filterBulan);
    } else if (filterPeriode === 'minggu' && filterMinggu) {
      result = result.filter(item => getWeekValue(item.tanggal) === filterMinggu);
    }

    return result;
  }, [items, filterPengirim, filterPeriode, filterBulan, filterMinggu]);

  // Totals per pengirim
  const pengirimTotals = useMemo(() => {
    const map = {};
    filteredItems.forEach(item => {
      const name = item.nama_pengirim;
      if (!map[name]) {
        map[name] = { nama: name, totalKg: 0, totalHarga: 0, count: 0 };
      }
      map[name].totalKg += parseFloat(item.kg) || 0;
      map[name].totalHarga += parseFloat(item.harga) || 0;
      map[name].count += 1;
    });
    return Object.values(map).sort((a, b) => b.totalHarga - a.totalHarga);
  }, [filteredItems]);

  // Grand totals
  const grandTotal = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        kg: acc.kg + (parseFloat(item.kg) || 0),
        harga: acc.harga + (parseFloat(item.harga) || 0),
      }),
      { kg: 0, harga: 0 }
    );
  }, [filteredItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ tanggal: todayStr(), kg: '', nama_pengirim: '', harga: '' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      tanggal: item.tanggal?.split('T')[0] || '',
      kg: item.kg,
      nama_pengirim: item.nama_pengirim,
      harga: item.harga,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await updateBarangMasuk(editItem.id, form);
      } else {
        await createBarangMasuk(form);
      }
      setShowForm(false);
      fetchData();
      fetchPengirimList();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try {
      await deleteBarangMasuk(id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  const resetFilters = () => {
    setFilterPengirim('semua');
    setFilterPeriode('semua');
    setFilterBulan('');
    setFilterMinggu('');
  };

  const hasActiveFilter = filterPengirim !== 'semua' || filterPeriode !== 'semua';

  return (
    <div>
      <PageHeader
        title="Barang Masuk"
        subtitle="Catat stok semangka yang masuk"
        action={
          <button
            onClick={openCreate}
            className="bg-melon-500 hover:bg-melon-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-melon-500/25 active:scale-95"
          >
            + Tambah
          </button>
        }
      />

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Filter Pengirim */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block font-medium">Pengirim</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setFilterPengirim('semua')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                filterPengirim === 'semua'
                  ? 'bg-melon-500 text-white shadow-lg shadow-melon-500/25'
                  : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              Semua
            </button>
            {pengirimList.map((name) => (
              <button
                key={name}
                onClick={() => setFilterPengirim(name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  filterPengirim === name
                    ? 'bg-melon-500 text-white shadow-lg shadow-melon-500/25'
                    : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Periode */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block font-medium">Periode</label>
          <div className="flex gap-2 items-center">
            {[
              { val: 'semua', label: 'Semua' },
              { val: 'bulan', label: 'Bulanan' },
              { val: 'minggu', label: 'Mingguan' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => {
                  setFilterPeriode(opt.val);
                  if (opt.val === 'bulan' && !filterBulan && availableMonths.length > 0) {
                    setFilterBulan(availableMonths[0][0]);
                  }
                  if (opt.val === 'minggu' && !filterMinggu && availableWeeks.length > 0) {
                    setFilterMinggu(availableWeeks[0][0]);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  filterPeriode === opt.val
                    ? 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25'
                    : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {/* Dropdown bulan/minggu */}
            {filterPeriode === 'bulan' && availableMonths.length > 0 && (
              <select
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="bg-surface-card border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary flex-1 min-w-0"
              >
                {availableMonths.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            )}
            {filterPeriode === 'minggu' && availableWeeks.length > 0 && (
              <select
                value={filterMinggu}
                onChange={(e) => setFilterMinggu(e.target.value)}
                className="bg-surface-card border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary flex-1 min-w-0"
              >
                {availableWeeks.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Reset filter */}
        {hasActiveFilter && (
          <button
            onClick={resetFilters}
            className="text-xs text-text-muted hover:text-watermelon-400 transition-colors"
          >
            ✕ Reset Filter
          </button>
        )}
      </div>

      {/* Summary Totals per Pengirim */}
      {!loading && filteredItems.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Grand total */}
          <div className="bg-gradient-to-br from-melon-600 to-melon-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 font-medium">Total ({filteredItems.length} transaksi)</p>
                <p className="text-lg font-bold text-white">{formatRupiah(grandTotal.harga)}</p>
                <p className="text-sm text-white/70">{formatKg(grandTotal.kg)}</p>
              </div>
              <span className="text-3xl opacity-80">📦</span>
            </div>
          </div>

          {/* Per-pengirim breakdown */}
          {pengirimTotals.length > 1 && (
            <div className="bg-surface-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-text-muted font-medium">Rekap per Pengirim</p>
              </div>
              <div className="divide-y divide-border">
                {pengirimTotals.map((p) => (
                  <div key={p.nama} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{p.nama}</p>
                      <p className="text-xs text-text-muted">{p.count}x · {formatKg(p.totalKg)}</p>
                    </div>
                    <p className="text-sm font-bold text-watermelon-400">{formatRupiah(p.totalHarga)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-elevated rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">{hasActiveFilter ? '🔍' : '📦'}</span>
          <p className="text-text-muted">
            {hasActiveFilter ? 'Tidak ada data yang cocok dengan filter' : 'Belum ada data barang masuk'}
          </p>
          {hasActiveFilter && (
            <button onClick={resetFilters} className="mt-3 text-sm text-melon-400 hover:text-melon-300 transition-colors">
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-surface-card rounded-2xl p-4 border border-border hover:border-melon-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary">{item.nama_pengirim}</span>
                    <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full">
                      {formatTanggal(item.tanggal)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-melon-400 font-medium">{formatKg(item.kg)}</span>
                    <span className="text-text-secondary">{formatRupiah(item.harga)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Berat (kg)</label>
            <input type="number" step="0.1" value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })}
              placeholder="Contoh: 500" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Harga Total (Rp)</label>
            <input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })}
              placeholder="Contoh: 2500000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Nama Pengirim</label>
            <SearchableSelect
              value={form.nama_pengirim}
              onChange={(val) => setForm({ ...form, nama_pengirim: val })}
              options={pengirimList}
              placeholder="Cari atau tambah pengirim..."
              required
            />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-melon-500 hover:bg-melon-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Barang'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
