import { useState, useEffect, useMemo } from 'react';
import { getBarangMasuk, createBarangMasuk, updateBarangMasuk, deleteBarangMasuk, getPengirimList, getPembayaranPengirim, addPembayaranPengirim, updatePembayaranBM } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';
import { compressImage } from '../utils/imageCompressor';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
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
  const [selectedBM, setSelectedBM] = useState(null); // To store nama_pengirim
  const [bayarData, setBayarData] = useState(null);
  const [bayarForm, setBayarForm] = useState({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
  const [savingBayar, setSavingBayar] = useState(false);
  const [editPayment, setEditPayment] = useState(null); // payment being edited

  // Accordion state for summary detail
  const [expandedPengirim, setExpandedPengirim] = useState(null);

  // Filters
  const [filter, setFilter] = useState('bulan-ini');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(todayStr());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (filter === 'custom' && (!dari || !sampai)) return;
    fetchData();
  }, [filter, dari, sampai]);

  useEffect(() => {
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
      const params = getDateParams(filter, dari, sampai);
      const res = await getBarangMasuk(params);
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters (search)
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.nama_pengirim === searchQuery);
  }, [items, searchQuery]);

  // Totals per pengirim
  const pengirimTotals = useMemo(() => {
    const map = {};
    filteredItems.forEach(item => {
      const name = item.nama_pengirim;
      if (!map[name]) {
        map[name] = { nama: name, totalKg: 0, totalHarga: 0, totalDibayar: 0, count: 0, items: [] };
      }
      map[name].totalKg += parseFloat(item.kg) || 0;
      map[name].totalHarga += parseFloat(item.harga) || 0;
      map[name].totalDibayar += parseFloat(item.total_dibayar) || 0;
      map[name].count += 1;
      map[name].items.push(item);
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
      console.error('Gagal memuat detail tagihan:', err);
    }
  };

  const handleBayar = async (e) => {
    e.preventDefault();
    setSavingBayar(true);
    try {
      if (editPayment) {
        await updatePembayaranBM(editPayment.id, bayarForm);
        setEditPayment(null);
      } else {
        await addPembayaranPengirim(selectedBM, bayarForm);
      }
      const res = await getPembayaranPengirim(selectedBM);
      setBayarData(res.data);
      setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan pembayaran');
    } finally {
      setSavingBayar(false);
    }
  };

  const startEditPayment = (payment) => {
    setEditPayment(payment);
    setBayarForm({
      tanggal_bayar: payment.tanggal_bayar?.split('T')[0] || '',
      jumlah_bayar: payment.jumlah_bayar,
    });
  };

  const cancelEditPayment = () => {
    setEditPayment(null);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
  };

  return (
    <div>
      <PageHeader
        title="Stok Masuk"
        subtitle="Catat penerimaan semangka"
        action={
          <button onClick={openCreate}
            className="bg-melon-500 hover:bg-melon-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-melon-500/25 active:scale-95">
            + Catat
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Filter Pengirim */}
        <SearchableSelect
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          options={pengirimList}
          placeholder="Ketik & pilih nama pengirim (kosongkan untuk tampil semua)"
          allowNew={false}
        />

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
                  ? 'bg-melon-500 text-white shadow-lg shadow-melon-500/25'
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

      {/* Summary Totals per Pengirim */}
      {!loading && filteredItems.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Grand total */}
          <div className="bg-gradient-to-br from-melon-600 to-melon-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-white/60 font-medium">Total Hutang ({filteredItems.length} transaksi)</p>
                <p className="text-xl font-bold text-white">{formatRupiah(grandTotal.harga)}</p>
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
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-melon-400">✓ Dibayar: {formatRupiah(p.totalDibayar)}</span>
                          {!lunas && <span className="text-xs text-amber-400">⏳ Sisa: {formatRupiah(sisaBayar)}</span>}
                          {lunas && <span className="text-xs text-melon-400 bg-melon-500/10 px-2 py-0.5 rounded-full font-bold">Lunas</span>}
                        </div>
                        <button 
                          onClick={() => setExpandedPengirim(expandedPengirim === p.nama ? null : p.nama)}
                          className="text-[10px] text-melon-500 hover:bg-melon-50 font-medium px-2 py-1 border border-melon-100 rounded-lg transition-colors"
                        >
                          {expandedPengirim === p.nama ? 'Tutup Detail' : 'Lihat Detail'}
                        </button>
                      </div>
                      
                      {/* Expanded Transaction Details */}
                      {expandedPengirim === p.nama && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-slide-down">
                          {p.items.map((item, idx) => (
                            <div key={item.id} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg border border-border">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-text-muted">Trx {p.items.length - idx} • {formatTanggal(item.tanggal)}</span>
                                <span className="text-xs font-medium text-text-primary">{formatKg(item.kg)}</span>
                              </div>
                              <span className="text-xs font-bold text-text-primary">{formatRupiah(item.harga)}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
          <span className="text-5xl mb-4 block">📦</span>
          <p className="text-text-muted">Data stok masuk tidak ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const sisa = parseFloat(item.sisa_bayar);
            const lunas = sisa <= 0;
            return (
              <div key={item.id} className={`bg-surface-card rounded-2xl p-4 border transition-colors ${lunas ? 'border-melon-500/30' : 'border-border hover:border-melon-500/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => openBayar(item.nama_pengirim)} role="button">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-surface-elevated text-text-secondary px-2.5 py-1 rounded-full">{item.nama_pengirim}</span>
                      {lunas && <span className="text-xs bg-melon-500/15 text-melon-400 px-2 py-0.5 rounded-full font-bold">✓ Lunas</span>}
                      <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mt-1">
                      <span className="text-text-primary font-medium">{formatKg(item.kg)}</span>
                      <span className="text-melon-400 font-bold">{formatRupiah(item.harga)}</span>
                    </div>
                    {!lunas && (
                      <p className="text-xs text-amber-400 mt-1">Sisa: {formatRupiah(sisa)}</p>
                    )}
                    {item.gambar?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-2" onClick={e => e.stopPropagation()}>
                        {item.gambar.map((g, i) => (
                          <img key={i} src={g} alt={`Nota ${i+1}`} className="h-16 w-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80" onClick={() => setPreviewImage(g)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openBayar(item.nama_pengirim)} className="p-2 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors" title="Bayar">💳</button>
                    <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 bg-surface p-2 rounded-full text-text-primary">✕</button>
        </div>
      )}

      {/* Modal Edit/Create */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Data' : 'Catat Stok Masuk'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Nama Pengirim</label>
            <SearchableSelect
              options={pengirimList}
              value={form.nama_pengirim}
              onChange={(val) => setForm({ ...form, nama_pengirim: val })}
              placeholder="Pilih atau ketik nama pengirim baru"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">KG Masuk</label>
            <NumberInput value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })}
              allowDecimals={true} suffix="kg" placeholder="Contoh: 1500" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Harga Modal (Total)</label>
            <CurrencyInput value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })}
              placeholder="Contoh: 7.500.000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          {!editItem && (
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Sudah Dibayar (Uang Muka)</label>
              <CurrencyInput value={form.sudah_dibayar} onChange={(e) => setForm({ ...form, sudah_dibayar: e.target.value })}
                placeholder="Kosongkan jika belum ada DP" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" />
            </div>
          )}
          
          {/* Image Upload */}
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Foto Nota/Barang (Maks 5)</label>
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp" 
              multiple 
              onChange={handleImageChange}
              disabled={compressing || (form.gambar || []).length >= 5}
              className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-melon-500/10 file:text-melon-400 hover:file:bg-melon-500/20"
            />
            {compressing && <p className="text-xs text-melon-400 mt-2">Sedang memproses gambar...</p>}
            
            {(form.gambar || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.gambar.map((g, i) => (
                  <div key={i} className="relative group">
                    <img src={g} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-border" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 bg-watermelon-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={saving || compressing}
            className="w-full bg-melon-500 hover:bg-melon-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Catat Stok'}
          </button>
        </form>
      </Modal>

      {/* Pembayaran Modal */}
      <Modal isOpen={showBayar} onClose={() => { setShowBayar(false); setSelectedBM(null); setBayarData(null); setEditPayment(null); }}
        title={selectedBM ? `Tagihan — ${selectedBM}` : 'Pembayaran'}>
        {bayarData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Total Tagihan</span>
                <span className="text-text-primary font-medium">{formatRupiah(bayarData.total_hutang)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Telah Dibayar</span>
                <span className="text-melon-400 font-medium">{formatRupiah(bayarData.total_dibayar)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                <span className="text-text-secondary">Sisa Tagihan</span>
                <span className={bayarData.sisa_tagihan <= 0 ? 'text-melon-400' : 'text-amber-400'}>{formatRupiah(bayarData.sisa_tagihan)}</span>
              </div>
            </div>

            {/* List of unpaid items (FIFO order) */}
            {bayarData.rincian_belum_lunas?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Belum Lunas (FIFO)</h4>
                <div className="space-y-2">
                  {bayarData.rincian_belum_lunas.map((item) => (
                    <div key={item.id} className="bg-surface-card rounded-xl px-4 py-3 border border-border flex justify-between items-center">
                      <div>
                        <p className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</p>
                        <p className="text-sm font-medium text-text-primary">{formatKg(item.kg)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-muted">{formatRupiah(item.harga)}</p>
                        <p className="text-sm font-bold text-amber-400">Sisa: {formatRupiah(item.sisa_bayar)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment history */}
            {bayarData.pembayaran?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Riwayat Pembayaran</h4>
                <div className="space-y-2">
                  {bayarData.pembayaran.map((p) => (
                    <div key={p.id} className={`flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border transition-colors ${editPayment?.id === p.id ? 'border-melon-500 bg-melon-500/5' : 'border-border'}`}>
                      <div>
                        <span className="text-sm text-text-muted">{formatTanggal(p.tanggal_bayar)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-melon-400 font-medium">{formatRupiah(p.jumlah_bayar)}</span>
                        <button type="button" onClick={() => startEditPayment(p)}
                          className="p-1 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors text-xs"
                          title="Edit pembayaran">✏️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment form */}
            {(bayarData.sisa_tagihan > 0 || editPayment) && (
              <form onSubmit={handleBayar} className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-secondary">
                    {editPayment ? 'Edit Pembayaran' : 'Catat Pembayaran'}
                  </h4>
                  {editPayment && (
                    <button type="button" onClick={cancelEditPayment}
                      className="text-xs text-text-muted hover:text-watermelon-400 transition-colors">Batal Edit</button>
                  )}
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Tanggal Bayar</label>
                  <input type="date" value={bayarForm.tanggal_bayar} onChange={(e) => setBayarForm({ ...bayarForm, tanggal_bayar: e.target.value })}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary" required />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Jumlah Bayar</label>
                  <CurrencyInput value={bayarForm.jumlah_bayar} onChange={(e) => setBayarForm({ ...bayarForm, jumlah_bayar: e.target.value })}
                    placeholder={`Maks: ${formatRupiah(bayarData.sisa_tagihan)}`} className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary" required />
                </div>
                <button type="submit" disabled={savingBayar}
                  className="w-full bg-melon-500 hover:bg-melon-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]">
                  {savingBayar ? 'Menyimpan...' : editPayment ? 'Simpan Perubahan' : 'Bayar ke Pengirim'}
                </button>
              </form>
            )}
          </div>
        )}
        {!bayarData && <div className="py-8 text-center text-text-muted">Memuat data tagihan...</div>}
      </Modal>
    </div>
  );
}
