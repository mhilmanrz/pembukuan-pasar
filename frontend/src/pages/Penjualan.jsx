import { useState, useEffect } from 'react';
import { getPenjualan, createPenjualan, updatePenjualan, deletePenjualan } from '../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import NumberInput from '../components/NumberInput';

export default function Penjualan() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ tanggal: todayStr(), sesi: 'siang', kg_terjual: '', total_uang: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPenjualan();
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

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
          <span className="text-5xl mb-4 block">💰</span>
          <p className="text-text-muted">Belum ada data penjualan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-surface-card rounded-2xl p-4 border border-border hover:border-watermelon-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.sesi === 'siang'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-indigo-500/15 text-indigo-400'
                    }`}>
                      {item.sesi === 'siang' ? '☀️ Siang' : '🌙 Malam'}
                    </span>
                    <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-1">
                    <span className="text-watermelon-400 font-medium">{formatKg(item.kg_terjual)}</span>
                    <span className="text-melon-400 font-bold">{formatRupiah(item.total_uang)}</span>
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
              {['siang', 'malam'].map((sesi) => (
                <button key={sesi} type="button"
                  onClick={() => setForm({ ...form, sesi })}
                  className={`py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    form.sesi === sesi
                      ? sesi === 'siang'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                        : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-surface-elevated text-text-secondary hover:bg-surface-card'
                  }`}>
                  {sesi === 'siang' ? '☀️ Siang' : '🌙 Malam'}
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
              placeholder="Contoh: 750.000" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
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
