import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { createBarangMasuk, updateBarangMasuk, deleteBarangMasuk, getBarangMasukById, getPengirimList } from '../../services/api';
import { todayStr } from '../../utils/format';
import { compressImage } from '../../utils/imageCompressor';
// PageHeader removed
import SearchableSelect from '../../components/SearchableSelect';
import CurrencyInput from '../../components/CurrencyInput';
import NumberInput from '../../components/NumberInput';

export default function BarangMasukForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const { onSuccess } = useOutletContext() || {};

  const [form, setForm] = useState({ tanggal: todayStr(), kg: '', nama_pengirim: '', harga: '', sudah_dibayar: '', gambar: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [pengirimList, setPengirimList] = useState([]);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    fetchPengirimList();
    if (isEdit) loadEditData();
  }, []);

  const fetchPengirimList = async () => {
    try { setPengirimList((await getPengirimList()).data); } catch {}
  };

  const loadEditData = async () => {
    if (location.state?.item) {
      const item = location.state.item;
      setForm({ tanggal: item.tanggal?.split('T')[0] || '', kg: item.kg, nama_pengirim: item.nama_pengirim, harga: item.harga, gambar: item.gambar || [] });
      setLoading(false);
      return;
    }
    try {
      const item = (await getBarangMasukById(id)).data;
      setForm({ tanggal: item.tanggal?.split('T')[0] || '', kg: item.kg, nama_pengirim: item.nama_pengirim, harga: item.harga, gambar: item.gambar || [] });
    } catch { alert('Gagal memuat data'); navigate('/barang-masuk'); }
    finally { setLoading(false); }
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if ((form.gambar || []).length + files.length > 5) { alert('Maksimal 5 gambar'); return; }
    setCompressing(true);
    const newImages = [...(form.gambar || [])];
    for (const file of files) {
      try { newImages.push(await compressImage(file)); } catch (err) { alert(err.message || 'Gagal memproses gambar'); }
    }
    setForm(prev => ({ ...prev, gambar: newImages }));
    setCompressing(false);
    e.target.value = '';
  };

  const removeImage = (index) => setForm(prev => ({ ...prev, gambar: (prev.gambar || []).filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await updateBarangMasuk(id, form);
      else await createBarangMasuk(form);
      if (onSuccess) onSuccess();
      navigate('/barang-masuk');
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Yakin hapus data ini?')) return;
    try { await deleteBarangMasuk(id); if (onSuccess) onSuccess(); navigate('/barang-masuk'); } catch { alert('Gagal menghapus'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-melon-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => navigate('/barang-masuk')}>
      <div className="w-full max-w-lg mx-auto bg-surface sm:rounded-2xl rounded-t-3xl border-t sm:border border-border p-5 shadow-2xl max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{isEdit ? 'Edit Stok Masuk' : 'Catat Stok Masuk'}</h2>
            <p className="text-xs text-text-muted">{isEdit ? 'Ubah data penerimaan' : 'Tambah penerimaan baru'}</p>
          </div>
          <button type="button" onClick={() => navigate('/barang-masuk')} className="p-2 bg-surface-elevated rounded-full text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Tanggal</label>
          <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" required />
        </div>
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Nama Pengirim</label>
          <SearchableSelect options={pengirimList.map(p => p.nama)} value={form.nama_pengirim}
            onChange={(val) => setForm({ ...form, nama_pengirim: val })} placeholder="Pilih atau ketik nama pengirim baru" />
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
        {!isEdit && (
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Sudah Dibayar (Uang Muka)</label>
            <CurrencyInput value={form.sudah_dibayar} onChange={(e) => setForm({ ...form, sudah_dibayar: e.target.value })}
              placeholder="Kosongkan jika belum ada DP" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary" />
          </div>
        )}
        <div>
          <label className="text-sm text-text-secondary mb-1 block">Foto Nota/Barang (Maks 5)</label>
          <input type="file" accept="image/jpeg, image/png, image/webp" multiple onChange={handleImageChange}
            disabled={compressing || (form.gambar || []).length >= 5}
            className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-melon-500/10 file:text-melon-400 hover:file:bg-melon-500/20" />
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
          {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Catat Stok'}
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
