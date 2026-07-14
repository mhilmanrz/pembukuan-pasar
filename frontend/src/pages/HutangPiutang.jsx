import { useState, useEffect } from 'react';
import { getHutangPiutang, createHutangPiutang, updateHutangPiutang, deleteHutangPiutang, getPembayaranByHP, createPembayaran } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';

// Helper to get date range params from filter
function getDateParams(filter) {
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
    default:
      return {};
  }
}
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import NumberInput from '../components/NumberInput';

export default function HutangPiutang() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipeFilter, setTipeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ tipe: 'piutang', tanggal: todayStr(), nama: '', kg: '', jumlah_total: '', keterangan: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('bulan-ini');

  // Pembayaran state
  const [showBayar, setShowBayar] = useState(false);
  const [selectedHP, setSelectedHP] = useState(null);
  const [bayarData, setBayarData] = useState(null);
  const [bayarForm, setBayarForm] = useState({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
  const [savingBayar, setSavingBayar] = useState(false);

  useEffect(() => { fetchData(); }, [tipeFilter, filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { ...getDateParams(filter) };
      if (tipeFilter) params.tipe = tipeFilter;
      const res = await getHutangPiutang(params);
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ tipe: 'piutang', tanggal: todayStr(), nama: '', kg: '', jumlah_total: '', keterangan: '' });
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      tipe: item.tipe,
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
        await updateHutangPiutang(editItem.id, form);
      } else {
        await createHutangPiutang(form);
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
  const openBayar = async (item) => {
    setSelectedHP(item);
    setShowBayar(true);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
    try {
      const res = await getPembayaranByHP(item.id);
      setBayarData(res.data);
    } catch (err) {
      console.error('Gagal memuat riwayat bayar:', err);
    }
  };

  const handleBayar = async (e) => {
    e.preventDefault();
    setSavingBayar(true);
    try {
      await createPembayaran({
        hutang_piutang_id: selectedHP.id,
        ...bayarForm,
      });
      const res = await getPembayaranByHP(selectedHP.id);
      setBayarData(res.data);
      setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah pembayaran');
    } finally {
      setSavingBayar(false);
    }
  };

  // Group by nama
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.nama]) acc[item.nama] = [];
    acc[item.nama].push(item);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Hutang & Piutang"
        subtitle="Kelola hutang dan piutang"
        action={
          <button onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-amber-500/25 active:scale-95">
            + Tambah
          </button>
        }
      />

      {/* Type filter */}
      <div className="flex gap-2 mb-3">
        {[
          { val: '', label: 'Semua' },
          { val: 'piutang', label: '📤 Piutang' },
          { val: 'hutang', label: '📥 Hutang' },
        ].map((f) => (
          <button key={f.val} onClick={() => setTipeFilter(f.val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              tipeFilter === f.val
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        {[
          { val: 'bulan-ini', label: 'Bulan Ini' },
          { val: 'minggu-ini', label: 'Minggu Ini' },
          { val: 'hari-ini', label: 'Hari Ini' },
          { val: 'semua', label: 'Semua' },
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setFilter(f.val)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === f.val
                ? 'bg-amber-500/80 text-white shadow-lg shadow-amber-500/20'
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-elevated rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">📋</span>
          <p className="text-text-muted">Belum ada data hutang/piutang</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([nama, records]) => (
            <div key={nama}>
              <h3 className="text-sm font-semibold text-text-secondary mb-2 px-1">{nama}</h3>
              <div className="space-y-2">
                {records.map((item) => {
                  const sisa = parseFloat(item.sisa);
                  const lunas = sisa <= 0;
                  return (
                    <div key={item.id} className={`bg-surface-card rounded-2xl p-4 border transition-colors ${lunas ? 'border-melon-500/30' : 'border-border hover:border-amber-500/30'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => openBayar(item)} role="button">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              item.tipe === 'piutang' ? 'bg-orange-500/15 text-orange-400' : 'bg-blue-500/15 text-blue-400'
                            }`}>
                              {item.tipe === 'piutang' ? '📤 Piutang' : '📥 Hutang'}
                            </span>
                            {lunas && <span className="text-xs bg-melon-500/15 text-melon-400 px-2 py-0.5 rounded-full font-bold">✓ Lunas</span>}
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
                          <button onClick={() => openBayar(item)} className="p-2 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors" title="Bayar">💳</button>
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
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Data' : 'Tambah Hutang/Piutang'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Tipe</label>
            <div className="grid grid-cols-2 gap-3">
              {['piutang', 'hutang'].map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, tipe: t })}
                  className={`py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    form.tipe === t
                      ? t === 'piutang'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-blue-500 text-white shadow-lg'
                      : 'bg-surface-elevated text-text-secondary'
                  }`}>
                  {t === 'piutang' ? '📤 Piutang' : '📥 Hutang'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Nama</label>
            <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Nama pembeli/pengirim" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">KG (opsional)</label>
            <NumberInput value={form.kg} onChange={(e) => setForm({ ...form, kg: e.target.value })}
              allowDecimals={true} suffix="kg" placeholder="Berat semangka" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Jumlah Total</label>
            <CurrencyInput value={form.jumlah_total} onChange={(e) => setForm({ ...form, jumlah_total: e.target.value })}
              placeholder="Contoh: 500.000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Keterangan (opsional)</label>
            <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Catatan tambahan" rows={2} className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary resize-none" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Data'}
          </button>
        </form>
      </Modal>

      {/* Pembayaran Modal */}
      <Modal isOpen={showBayar} onClose={() => { setShowBayar(false); setSelectedHP(null); setBayarData(null); }}
        title={selectedHP ? `Pembayaran — ${selectedHP.nama}` : 'Pembayaran'}>
        {bayarData && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-surface-elevated rounded-xl p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Total</span>
                <span className="text-text-primary font-medium">{formatRupiah(bayarData.hutang_piutang?.jumlah_total)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-muted">Dibayar</span>
                <span className="text-melon-400 font-medium">{formatRupiah(bayarData.total_dibayar)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                <span className="text-text-secondary">Sisa</span>
                <span className={bayarData.sisa <= 0 ? 'text-melon-400' : 'text-amber-400'}>{formatRupiah(bayarData.sisa)}</span>
              </div>
            </div>

            {/* Payment history */}
            {bayarData.pembayaran?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Riwayat Cicilan</h4>
                <div className="space-y-2">
                  {bayarData.pembayaran.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border border-border">
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
    </div>
  );
}
