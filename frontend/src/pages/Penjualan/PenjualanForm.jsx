import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { createPenjualan, updatePenjualan, deletePenjualan, getPenjualanById } from '../../services/api';
import { todayStr } from '../../utils/format';
// PageHeader removed
import CurrencyInput from '../../components/CurrencyInput';
import NumberInput from '../../components/NumberInput';

export default function PenjualanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const { onSuccess } = useOutletContext() || {};

  const [form, setForm] = useState({ tanggal: todayStr(), sesi: 'siang', kg_terjual: '', total_uang: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => { if (isEdit) loadEditData(); }, []);

  const loadEditData = async () => {
    if (location.state?.item) {
      const item = location.state.item;
      setForm({ tanggal: item.tanggal?.split('T')[0] || '', sesi: item.sesi, kg_terjual: item.kg_terjual, total_uang: item.total_uang });
      setLoading(false);
      return;
    }
    try {
      const item = (await getPenjualanById(id)).data;
      setForm({ tanggal: item.tanggal?.split('T')[0] || '', sesi: item.sesi, kg_terjual: item.kg_terjual, total_uang: item.total_uang });
    } catch { alert('Gagal memuat data'); navigate('/penjualan'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await updatePenjualan(id, form);
      else await createPenjualan(form);
      if (onSuccess) onSuccess();
      navigate('/penjualan');
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin hapus data ini?')) return;
    try { await deletePenjualan(id); if (onSuccess) onSuccess(); navigate('/penjualan'); } catch { alert('Gagal menghapus'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-watermelon-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => navigate('/penjualan')}>
      <div className="w-full max-w-lg mx-auto bg-surface sm:rounded-2xl rounded-t-3xl border-t sm:border border-border p-5 shadow-2xl max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{isEdit ? 'Edit Penjualan' : 'Catat Penjualan'}</h2>
            <p className="text-xs text-text-muted">{isEdit ? 'Ubah data penjualan' : 'Tambah penjualan baru'}</p>
          </div>
          <button type="button" onClick={() => navigate('/penjualan')} className="p-2 bg-surface-elevated rounded-full text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

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
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Catat Penjualan'}
        </button>
      </form>

      {isEdit && (
        <button onClick={handleDelete}
          className="w-full mt-3 py-3 rounded-xl font-medium text-sm text-watermelon-400 border border-watermelon-500/20 hover:bg-watermelon-500/10 transition-colors">
          🗑️ Hapus Data Ini
        </button>
      )}
      </div>
    </div>
  );
}
