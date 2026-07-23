import { useState, useEffect, useMemo } from 'react';
import { getHutangPiutang, createHutangPiutang, updateHutangPiutang, deleteHutangPiutang, getPembayaranPelanggan, addPembayaranPelanggan, updatePembayaranPiutang, getPelangganList } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';
import { getDateParams } from '../utils/dateHelper';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import NumberInput from '../components/NumberInput';
import SearchableSelect from '../components/SearchableSelect';

export default function Piutang() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ tipe: 'piutang', tanggal: todayStr(), nama: '', kg: '', jumlah_total: '', keterangan: '' });
  const [saving, setSaving] = useState(false);
  const [pelangganList, setPelangganList] = useState([]);
  
  // Filters
  const [filter, setFilter] = useState('bulan-ini');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(todayStr());
  const [searchQuery, setSearchQuery] = useState('');

  // Pembayaran state
  const [showBayar, setShowBayar] = useState(false);
  const [selectedHP, setSelectedHP] = useState(null);
  const [bayarData, setBayarData] = useState(null);
  const [bayarForm, setBayarForm] = useState({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
  const [savingBayar, setSavingBayar] = useState(false);
  const [editPayment, setEditPayment] = useState(null);

  // Accordion state
  const [expandedPelanggan, setExpandedPelanggan] = useState(null);

  useEffect(() => { 
    if (filter === 'custom' && (!dari || !sampai)) return;
    fetchData(); 
  }, [filter, dari, sampai]);

  useEffect(() => {
    fetchPelangganList();
  }, []);

  const fetchPelangganList = async () => {
    try {
      const res = await getPelangganList();
      setPelangganList(res.data);
    } catch (err) {
      console.error('Gagal memuat daftar pelanggan:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { ...getDateParams(filter, dari, sampai), tipe: 'piutang' };
      const res = await getHutangPiutang(params);
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pelanggan List for Dropdown handled by state now

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.nama === searchQuery);
  }, [items, searchQuery]);

  // Grand totals
  const grandTotal = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        kg: acc.kg + (parseFloat(item.kg) || 0),
        total: acc.total + (parseFloat(item.jumlah_total) || 0),
        dibayar: acc.dibayar + (parseFloat(item.total_dibayar) || 0),
        sisa: acc.sisa + (parseFloat(item.sisa_tagihan) || 0),
      }),
      { kg: 0, total: 0, dibayar: 0, sisa: 0 }
    );
  }, [filteredItems]);

  // Group by nama for summary
  const groupedTotals = useMemo(() => {
    const map = new Map();
    filteredItems.forEach(item => {
      if (!map.has(item.nama)) {
        map.set(item.nama, { nama: item.nama, count: 0, totalKg: 0, totalPiutang: 0, totalDibayar: 0, items: [] });
      }
      const p = map.get(item.nama);
      p.count += 1;
      p.totalKg += parseFloat(item.kg) || 0;
      p.totalPiutang += parseFloat(item.jumlah_total) || 0;
      p.totalDibayar += parseFloat(item.total_dibayar) || 0;
      p.totalKgDibayar = (p.totalKgDibayar || 0) + (parseFloat(item.total_kg_dibayar) || 0);
      p.items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => b.totalPiutang - a.totalPiutang);
  }, [filteredItems]);

  // Group by nama for list
  const groupedList = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.nama]) acc[item.nama] = [];
      acc[item.nama].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ tipe: 'piutang', tanggal: todayStr(), nama: '', kg: '', jumlah_total: '', keterangan: '' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      tipe: 'piutang',
      tanggal: item.tanggal?.split('T')[0] || '',
      nama: item.nama,
      kg: item.kg || '',
      jumlah_total: item.jumlah_total,
      keterangan: item.keterangan || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await updateHutangPiutang(editItem.id, { ...form, tipe: 'piutang' });
      } else {
        await createHutangPiutang({ ...form, tipe: 'piutang' });
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
    if (!confirm('Yakin hapus data ini? Semua cicilan terkait juga akan dihapus.')) return;
    try {
      await deleteHutangPiutang(id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  // Pembayaran
  const openBayar = async (nama) => {
    setSelectedHP(nama);
    setShowBayar(true);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
    try {
      const res = await getPembayaranPelanggan(nama);
      setBayarData(res.data);
    } catch (err) {
      console.error('Gagal memuat riwayat bayar:', err);
    }
  };

  const handleBayar = async (e) => {
    e.preventDefault();
    setSavingBayar(true);
    try {
      if (editPayment) {
        await updatePembayaranPiutang(editPayment.id, bayarForm);
        setEditPayment(null);
      } else {
        await addPembayaranPelanggan(selectedHP, bayarForm);
      }
      const res = await getPembayaranPelanggan(selectedHP);
      setBayarData(res.data);
      setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah pembayaran');
    } finally {
      setSavingBayar(false);
    }
  };

  const startEditPayment = (payment) => {
    setEditPayment(payment);
    setBayarForm({
      tanggal_bayar: payment.tanggal_bayar?.split('T')[0] || '',
      jumlah_bayar: payment.jumlah_bayar,
      kg_bayar: payment.kg_bayar || ''
    });
  };

  const cancelEditPayment = () => {
    setEditPayment(null);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
  };

  return (
    <div>
      <PageHeader
        title="Piutang"
        subtitle="Kelola tagihan pelanggan"
        action={
          <button onClick={openCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-orange-500/25 active:scale-95">
            + Tambah
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        {/* Filter Pelanggan */}
        <SearchableSelect
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          options={pelangganList.map(p => p.nama)}
          placeholder="Ketik & pilih pelanggan (kosongkan untuk tampil semua)"
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
                  ? 'bg-orange-500/80 text-white shadow-lg shadow-orange-500/20'
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
        <div className="mb-6 space-y-3">
          {/* Grand total */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-white/70 font-medium">Total Piutang ({filteredItems.length} transaksi)</p>
                <p className="text-xl font-bold text-white">{formatRupiah(grandTotal.total)}</p>
                <p className="text-xs text-white/80">{formatKg(grandTotal.kg)}</p>
                
                <div className="flex gap-4 pt-2 border-t border-white/20 mt-2">
                  <div>
                    <span className="text-[10px] text-white/70 block">Sudah Dibayar</span>
                    <span className="text-xs font-semibold text-white">✓ {formatRupiah(grandTotal.dibayar)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/70 block">Belum Dibayar</span>
                    <span className="text-xs font-semibold text-white">⏳ {formatRupiah(grandTotal.sisa)}</span>
                  </div>
                </div>
              </div>
              <span className="text-3xl opacity-80">📋</span>
            </div>
          </div>

          {/* Per-pelanggan breakdown */}
          {groupedTotals.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-text-muted font-medium">Rekap per Pelanggan</p>
              </div>
              <div className="divide-y divide-border">
                {groupedTotals.map((p) => {
                  const sisa = p.totalPiutang - p.totalDibayar;
                  const lunas = sisa <= 0;
                  return (
                    <div key={p.nama} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{p.nama}</p>
                          <p className="text-xs text-text-muted">{p.count}x · {formatKg(p.totalKg)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-text-primary">{formatRupiah(p.totalPiutang)}</p>
                          <div className="flex gap-1">
                            {(() => {
                              const pelanggan = pelangganList.find(pl => pl.nama === p.nama);
                              const hasToken = !!pelanggan?.share_token;
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasToken) {
                                      const link = `${window.location.origin}/u/${pelanggan.share_token}`;
                                      navigator.clipboard.writeText(link);
                                      alert('Link berhasil disalin:\n' + link);
                                    } else {
                                      alert(`Pelanggan "${p.nama}" belum punya link akses.\nCoba tambahkan transaksi baru untuk pelanggan ini agar token dibuat otomatis.`);
                                    }
                                  }} 
                                  className={`p-2 rounded-lg transition-colors ${hasToken ? 'hover:bg-indigo-500/10 text-text-muted hover:text-indigo-400' : 'hover:bg-surface-elevated text-text-muted/40'}`}
                                  title={hasToken ? 'Salin Link Akses Pelanggan' : 'Link belum tersedia'}
                                >
                                  🔗
                                </button>
                              );
                            })()}
                            <button onClick={() => openBayar(p.nama)} className="p-2 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-colors" title="Bayar Tagihan">💳</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-orange-400">✓ Dibayar: {formatRupiah(p.totalDibayar)} {p.totalKgDibayar > 0 ? `(${formatKg(p.totalKgDibayar)})` : ''}</span>
                          {!lunas && <span className="text-xs text-amber-400">⏳ Sisa: {formatRupiah(sisa)}</span>}
                          {lunas && <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-bold">Lunas</span>}
                        </div>
                        <button 
                          onClick={() => setExpandedPelanggan(expandedPelanggan === p.nama ? null : p.nama)}
                          className="text-[10px] text-orange-500 hover:bg-orange-50 font-medium px-2 py-1 border border-orange-100 rounded-lg transition-colors"
                        >
                          {expandedPelanggan === p.nama ? 'Tutup Detail' : 'Lihat Detail'}
                        </button>
                      </div>

                      {/* Expanded Transaction Details */}
                      {expandedPelanggan === p.nama && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-slide-down">
                          {p.items.map((item, idx) => (
                            <div key={item.id} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg border border-border">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-text-muted">Trx {p.items.length - idx} • {formatTanggal(item.tanggal)}</span>
                                {item.kg ? <span className="text-xs font-medium text-text-primary">{formatKg(item.kg)}</span> : null}
                              </div>
                              <span className="text-xs font-bold text-text-primary">{formatRupiah(item.jumlah_total)}</span>
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
          <span className="text-5xl mb-4 block">📋</span>
          <p className="text-text-muted">Data piutang tidak ditemukan</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedList).map(([nama, records]) => (
            <div key={nama}>
              <h3 className="text-sm font-semibold text-text-secondary mb-2 px-1">{nama}</h3>
              <div className="space-y-2">
                {records.map((item) => {
                  const sisa = parseFloat(item.sisa);
                  const lunas = sisa <= 0;
                  return (
                    <div key={item.id} className={`bg-surface-card rounded-2xl p-4 border transition-colors ${lunas ? 'border-orange-500/30' : 'border-border hover:border-orange-500/30'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => openBayar(item)} role="button">
                          <div className="flex items-center gap-2 mb-1">
                            {lunas && <span className="text-xs bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full font-bold">✓ Lunas</span>}
                            <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm mt-1">
                            <span className="text-text-primary font-medium">{formatRupiah(item.jumlah_total)}</span>
                            {item.kg && <span className="text-text-muted">{formatKg(item.kg)}</span>}
                          </div>
                          {!lunas && (
                            <p className="text-xs text-amber-400 mt-1">Sisa: {formatRupiah(sisa)}</p>
                          )}
                          {item.keterangan && <p className="text-xs text-text-muted mt-1">{item.keterangan}</p>}
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
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Data' : 'Tambah Piutang'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Nama Pelanggan</label>
            <SearchableSelect 
              options={pelangganList.map(p => p.nama)}
              value={form.nama} 
              onChange={(val) => setForm({ ...form, nama: val })}
              placeholder="Pilih atau ketik nama pelanggan baru" 
              required 
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Total Muatan/Berat (Opsional)</label>
            <NumberInput value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })}
              allowDecimals={true} suffix="kg" placeholder="Berat semangka" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Jumlah Tagihan</label>
            <CurrencyInput value={form.jumlah_total} onChange={(e) => setForm({ ...form, jumlah_total: e.target.value })}
              placeholder="Contoh: 500.000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Keterangan (opsional)</label>
            <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Catatan tambahan" rows={2} className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary resize-none" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Data'}
          </button>
        </form>
      </Modal>

      {/* Pembayaran Modal */}
      <Modal isOpen={showBayar} onClose={() => { setShowBayar(false); setSelectedHP(null); setBayarData(null); setEditPayment(null); }}
        title={selectedHP ? `Pembayaran — ${selectedHP}` : 'Pembayaran'}>
        {bayarData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Total Tagihan</span>
                <span className="text-text-primary font-medium">{formatRupiah(bayarData.hutang_piutang?.jumlah_total)} {bayarData.hutang_piutang?.kg ? `(${formatKg(bayarData.hutang_piutang?.kg)})` : ''}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Telah Dibayar</span>
                <span className="text-orange-400 font-medium">{formatRupiah(bayarData.total_dibayar)} {bayarData.total_kg_dibayar ? `(${formatKg(bayarData.total_kg_dibayar)})` : ''}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                <span className="text-text-secondary">Sisa Tagihan</span>
                <span className={bayarData.sisa_tagihan <= 0 ? 'text-orange-400' : 'text-amber-400'}>{formatRupiah(bayarData.sisa_tagihan)}</span>
              </div>
            </div>

            {/* Payment history */}
            {bayarData.pembayaran?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Riwayat Pembayaran</h4>
                <div className="space-y-2">
                  {bayarData.pembayaran.map((p) => (
                    <div key={p.id} className={`flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border transition-colors ${editPayment?.id === p.id ? 'border-orange-500 bg-orange-500/5' : 'border-border'}`}>
                      <div>
                        <span className="text-sm text-text-muted">{formatTanggal(p.tanggal_bayar)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-orange-400 font-medium">{formatRupiah(p.jumlah_bayar)}</span>
                        {p.kg_bayar && <span className="text-xs text-text-muted font-medium">({formatKg(p.kg_bayar)})</span>}
                        <button type="button" onClick={() => startEditPayment(p)}
                          className="p-1 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-colors text-xs"
                          title="Edit pembayaran">✏️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add payment form */}
            {(bayarData.sisa_tagihan > 0 || editPayment) && (
              <form onSubmit={handleBayar} className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-secondary">
                    {editPayment ? 'Edit Pembayaran' : 'Catat Pembayaran Masuk'}
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
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Muatan yg Dilunasi (Opsional)</label>
                  <NumberInput value={bayarForm.kg_bayar} onChange={(e) => setBayarForm({ ...bayarForm, kg_bayar: e.target.value })}
                    allowDecimals={true} suffix="kg" placeholder="Total berat untuk pembayaran ini" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-primary" />
                </div>
                <button type="submit" disabled={savingBayar}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]">
                  {savingBayar ? 'Menyimpan...' : editPayment ? 'Simpan Perubahan' : 'Simpan Pembayaran'}
                </button>
              </form>
            )}
          </div>
        )}
        {!bayarData && <div className="py-8 text-center text-text-muted">Memuat data...</div>}
      </Modal>
    </div>
  );
}
