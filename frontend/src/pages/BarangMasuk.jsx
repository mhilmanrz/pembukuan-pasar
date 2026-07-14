import { useState, useEffect, useMemo } from 'react';
import { getBarangMasuk, createBarangMasuk, updateBarangMasuk, deleteBarangMasuk, getPengirimList, getPembayaranPengirim, addPembayaranPengirim } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';
import { compressImage } from '../utils/imageCompressor';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import CurrencyInput from '../components/CurrencyInput';
import NumberInput from '../components/NumberInput';

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
  const [form, setForm] = useState({ tanggal: todayStr(), kg: '', nama_pengirim: '', harga: '', sudah_dibayar: '', gambar: [] });
  const [saving, setSaving] = useState(false);
  const [pengirimList, setPengirimList] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Payment modal state
  const [showBayar, setShowBayar] = useState(false);
  const [selectedBM, setSelectedBM] = useState(null);
  const [bayarData, setBayarData] = useState(null);
  const [bayarForm, setBayarForm] = useState({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
  const [savingBayar, setSavingBayar] = useState(false);

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
        map[name] = { nama: name, totalKg: 0, totalHarga: 0, totalDibayar: 0, count: 0 };
      }
      map[name].totalKg += parseFloat(item.kg) || 0;
      map[name].totalHarga += parseFloat(item.harga) || 0;
      map[name].totalDibayar += parseFloat(item.total_dibayar) || 0;
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
        dibayar: acc.dibayar + (parseFloat(item.total_dibayar) || 0),
        sisa: acc.sisa + (parseFloat(item.sisa_bayar) || 0),
      }),
      { kg: 0, harga: 0, dibayar: 0, sisa: 0 }
    );
  }, [filteredItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ tanggal: todayStr(), kg: '', nama_pengirim: '', harga: '', sudah_dibayar: '', gambar: [] });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      tanggal: item.tanggal?.split('T')[0] || '',
      kg: item.kg,
      nama_pengirim: item.nama_pengirim,
      harga: item.harga,
      gambar: item.gambar || [],
    });
    setShowForm(true);
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if ((form.gambar || []).length + files.length > 5) {
      alert('Maksimal hanya boleh 5 gambar');
      return;
    }

    setCompressing(true);
    const newImages = [...(form.gambar || [])];

    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      } catch (err) {
        alert(err.message || 'Gagal memproses gambar');
      }
    }

    setForm(prev => ({ ...prev, gambar: newImages }));
    setCompressing(false);
    e.target.value = ''; // Reset input file
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      gambar: (prev.gambar || []).filter((_, i) => i !== index)
    }));
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

  // Payment modal handlers
  const openBayar = async (nama_pengirim) => {
    setSelectedBM(nama_pengirim);
    setShowBayar(true);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
    try {
      const res = await getPembayaranPengirim(nama_pengirim);
      setBayarData(res.data);
    } catch (err) {
      console.error('Gagal memuat riwayat bayar:', err);
    }
  };

  const handleBayar = async (e) => {
    e.preventDefault();
    setSavingBayar(true);
    try {
      await addPembayaranPengirim(selectedBM, bayarForm);
      const res = await getPembayaranPengirim(selectedBM);
      setBayarData(res.data);
      setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah pembayaran');
    } finally {
      setSavingBayar(false);
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
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-white/60 font-medium">Total ({filteredItems.length} transaksi)</p>
                <p className="text-lg font-bold text-white">{formatRupiah(grandTotal.harga)}</p>
                <p className="text-xs text-white/80">{formatKg(grandTotal.kg)}</p>
                
                <div className="flex gap-4 pt-2 border-t border-white/20 mt-2">
                  <div>
                    <span className="text-[10px] text-white/60 block">Sudah Dibayar</span>
                    <span className="text-xs font-semibold text-white">✓ {formatRupiah(grandTotal.dibayar)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/60 block">Belum Dibayar</span>
                    <span className="text-xs font-semibold text-white">⏳ {formatRupiah(grandTotal.sisa)}</span>
                  </div>
                </div>
              </div>
              <span className="text-3xl opacity-80">📦</span>
            </div>
          </div>

          {/* Per-pengirim breakdown */}
          {pengirimTotals.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-text-muted font-medium">Rekap per Pengirim</p>
              </div>
              <div className="divide-y divide-border">
                {pengirimTotals.map((p) => {
                  const sisaBayar = p.totalHarga - p.totalDibayar;
                  const lunas = sisaBayar <= 0;
                  return (
                    <div key={p.nama} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{p.nama}</p>
                          <p className="text-xs text-text-muted">{p.count}x · {formatKg(p.totalKg)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-text-primary">{formatRupiah(p.totalHarga)}</p>
                          <button onClick={() => openBayar(p.nama)} className="p-2 -mr-2 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors" title="Bayar Tagihan">💳</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-melon-400">✓ {formatRupiah(p.totalDibayar)}</span>
                        {!lunas && <span className="text-xs text-amber-400">⏳ Sisa: {formatRupiah(sisaBayar)}</span>}
                        {lunas && <span className="text-xs text-melon-400 bg-melon-500/10 px-2 py-0.5 rounded-full font-bold">Lunas</span>}
                      </div>
                    </div>
                  );
                })}
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
          {filteredItems.map((item) => {
            const sisa = parseFloat(item.sisa_bayar) || 0;
            const dibayar = parseFloat(item.total_dibayar) || 0;
            const harga = parseFloat(item.harga) || 0;
            const lunas = sisa <= 0 && harga > 0;
            return (
              <div key={item.id} className={`bg-surface-card rounded-2xl p-4 border transition-colors ${lunas ? 'border-melon-500/30' : 'border-border hover:border-amber-500/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">{item.nama_pengirim}</span>
                      {lunas && <span className="text-xs bg-melon-500/15 text-melon-400 px-2 py-0.5 rounded-full font-bold">✓ Lunas</span>}
                      <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full">
                        {formatTanggal(item.tanggal)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-melon-400 font-medium">{formatKg(item.kg)}</span>
                      <span className="text-text-secondary">{formatRupiah(item.harga)}</span>
                    </div>
                    {harga > 0 && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-melon-400">Dibayar: {formatRupiah(dibayar)}</span>
                        {!lunas && <span className="text-xs text-amber-400">Sisa: {formatRupiah(sisa)}</span>}
                      </div>
                    )}
                    {item.gambar && item.gambar.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {item.gambar.map((img, idx) => (
                          <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border/60 flex-shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all" onClick={() => setPreviewImage(img)}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
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
            <NumberInput value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })}
              allowDecimals={true} suffix="kg" placeholder="Contoh: 500" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Harga Total</label>
            <CurrencyInput value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })}
              placeholder="Contoh: 2.500.000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
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
          {!editItem && (
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Sudah Dibayar <span className="text-text-muted">(opsional)</span></label>
              <CurrencyInput value={form.sudah_dibayar} onChange={(e) => setForm({ ...form, sudah_dibayar: e.target.value })}
                placeholder="0 jika belum bayar" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" />
            </div>
          )}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block font-medium">Foto Barang (Maks 5)</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {form.gambar && form.gambar.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-elevated">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/75 hover:bg-watermelon-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {(!form.gambar || form.gambar.length < 5) && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-surface-elevated hover:border-melon-500 transition-colors">
                  {compressing ? (
                    <span className="text-[10px] text-text-muted animate-pulse text-center px-1">Membaca...</span>
                  ) : (
                    <>
                      <span className="text-lg">📸</span>
                      <span className="text-[10px] text-text-muted mt-0.5">Tambah</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={compressing}
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-text-muted leading-tight">Format: JPG, PNG. Maks 500KB per gambar (akan otomatis dikompres).</p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-melon-500 hover:bg-melon-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Barang'}
          </button>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showBayar} onClose={() => { setShowBayar(false); setSelectedBM(null); setBayarData(null); }}
        title={selectedBM ? `Pembayaran — ${selectedBM}` : 'Pembayaran'}>
        {bayarData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Total Tagihan</span>
                <span className="text-text-primary font-medium">{formatRupiah(bayarData.total_harga)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Total Dibayar</span>
                <span className="text-melon-400 font-medium">{formatRupiah(bayarData.total_dibayar)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                <span className="text-text-secondary">Sisa Tagihan</span>
                <span className={bayarData.sisa <= 0 ? 'text-melon-400' : 'text-amber-400'}>{formatRupiah(bayarData.sisa)}</span>
              </div>
            </div>

            {/* Payment history */}
            {bayarData.pembayaran?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Riwayat Cicilan</h4>
                <div className="space-y-2">
                  {bayarData.pembayaran.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border border-border">
                      <span className="text-sm text-text-muted">{formatTanggal(p.tanggal_bayar)}</span>
                      <span className="text-sm text-melon-400 font-medium">{formatRupiah(p.jumlah_bayar)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add payment form */}
            {bayarData.sisa > 0 && (
              <form onSubmit={handleBayar} className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-text-secondary">Tambah Cicilan</h4>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Tanggal Bayar</label>
                  <input type="date" value={bayarForm.tanggal_bayar} onChange={(e) => setBayarForm({ ...bayarForm, tanggal_bayar: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary" required />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Jumlah Bayar</label>
                  <CurrencyInput value={bayarForm.jumlah_bayar} onChange={(e) => setBayarForm({ ...bayarForm, jumlah_bayar: e.target.value })}
                    placeholder={`Maks: ${formatRupiah(bayarData.sisa)}`} className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary" required />
                </div>
                <button type="submit" disabled={savingBayar}
                  className="w-full bg-melon-500 hover:bg-melon-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]">
                  {savingBayar ? 'Menyimpan...' : 'Catat Pembayaran'}
                </button>
              </form>
            )}
          </div>
        )}
        {!bayarData && <div className="py-8 text-center text-text-muted">Memuat data...</div>}
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl font-light p-2 hover:bg-white/10 rounded-full transition-colors leading-none" onClick={() => setPreviewImage(null)}>&times;</button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-white/10 animate-scale-up" />
        </div>
      )}
    </div>
  );
}
