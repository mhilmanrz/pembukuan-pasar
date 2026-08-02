import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { createHutangPiutang, updateHutangPiutang, deleteHutangPiutang, getHutangPiutangById, getPelangganList } from '../../services/api';
import { todayStr } from '../../utils/format';
// PageHeader removed
import SearchableSelect from '../../components/SearchableSelect';
import CurrencyInput from '../../components/CurrencyInput';
import NumberInput from '../../components/NumberInput';

export default function PiutangForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const { onSuccess } = useOutletContext() || {};

  const [form, setForm] = useState({ tipe: 'piutang', tanggal: todayStr(), nama: '', kg: '', jumlah_total: '', keterangan: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [pelangganList, setPelangganList] = useState([]);

  useEffect(() => {
    fetchPelangganList();
    if (isEdit) loadEditData();
  }, []);

  const fetchPelangganList = async () => {
    try { setPelangganList((await getPelangganList()).data); } catch {}
  };

  const loadEditData = async () => {
    if (location.state?.item) {
      const item = location.state.item;
      setForm({ tipe: 'piutang', tanggal: item.tanggal?.split('T')[0] || '', nama: item.nama, kg: item.kg || '', jumlah_total: item.jumlah_total, keterangan: item.keterangan || '' });
      setLoading(false);
      return;
    }
    try {
      const item = (await getHutangPiutangById(id)).data;
      setForm({ tipe: 'piutang', tanggal: item.tanggal?.split('T')[0] || '', nama: item.nama, kg: item.kg || '', jumlah_total: item.jumlah_total, keterangan: item.keterangan || '' });
    } catch { alert('Gagal memuat data'); navigate('/piutang'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await updateHutangPiutang(id, { ...form, tipe: 'piutang' });
      else await createHutangPiutang({ ...form, tipe: 'piutang' });
      if (onSuccess) onSuccess();
      navigate('/piutang');
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin hapus data ini? Semua cicilan terkait juga akan dihapus.')) return;
    try { await deleteHutangPiutang(id); if (onSuccess) onSuccess(); navigate('/piutang'); } catch { alert('Gagal menghapus'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => navigate('/piutang')}>
      <div className="w-full max-w-lg mx-auto bg-surface sm:rounded-2xl rounded-t-3xl border-t sm:border border-border p-5 shadow-2xl max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{isEdit ? 'Edit Piutang' : 'Tambah Piutang'}</h2>
            <p className="text-xs text-text-muted">{isEdit ? 'Ubah data piutang' : 'Catat piutang baru'}</p>
          </div>
          <button type="button" onClick={() => navigate('/piutang')} className="p-2 bg-surface-elevated rounded-full text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
          <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
        </div>
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Nama Pelanggan</label>
          <SearchableSelect options={pelangganList.map(p => p.nama)} value={form.nama}
            onChange={(val) => setForm({ ...form, nama: val })} placeholder="Pilih atau ketik nama pelanggan baru" required />
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
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Data'}
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
