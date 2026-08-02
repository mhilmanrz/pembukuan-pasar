import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { getPembayaranPengirim, addPembayaranPengirim, updatePembayaranBM } from '../../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../../utils/format';
// PageHeader removed
import CurrencyInput from '../../components/CurrencyInput';

export default function BarangMasukBayar() {
  const { nama } = useParams();
  const navigate = useNavigate();
  const decodedNama = decodeURIComponent(nama);
  const { onSuccess } = useOutletContext() || {};

  const [bayarData, setBayarData] = useState(null);
  const [bayarForm, setBayarForm] = useState({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
  const [savingBayar, setSavingBayar] = useState(false);
  const [editPayment, setEditPayment] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { setBayarData((await getPembayaranPengirim(decodedNama)).data); }
    catch (err) { console.error('Gagal memuat data tagihan:', err); }
  };

  const handleBayar = async (e) => {
    e.preventDefault();
    setSavingBayar(true);
    try {
      if (editPayment) {
        await updatePembayaranBM(editPayment.id, bayarForm);
        setEditPayment(null);
      } else {
        await addPembayaranPengirim(decodedNama, bayarForm);
      }
      setBayarData((await getPembayaranPengirim(decodedNama)).data);
      setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
      if (onSuccess) onSuccess();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan pembayaran'); }
    finally { setSavingBayar(false); }
  };

  const startEditPayment = (payment) => {
    setEditPayment(payment);
    setBayarForm({ tanggal_bayar: payment.tanggal_bayar?.split('T')[0] || '', jumlah_bayar: payment.jumlah_bayar });
  };

  const cancelEditPayment = () => {
    setEditPayment(null);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => navigate('/barang-masuk')}>
      <div className="w-full max-w-lg mx-auto bg-surface sm:rounded-2xl rounded-t-3xl border-t sm:border border-border p-5 shadow-2xl max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Tagihan — {decodedNama}</h2>
            <p className="text-xs text-text-muted">Detail pembayaran ke pengirim</p>
          </div>
          <button type="button" onClick={() => navigate('/barang-masuk')} className="p-2 bg-surface-elevated rounded-full text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

      {!bayarData ? (
        <div className="py-16 text-center text-text-muted">
          <div className="w-8 h-8 border-2 border-melon-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Memuat data tagihan...
        </div>
      ) : (
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

          {/* Unpaid items (FIFO) */}
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
                    <span className="text-sm text-text-muted">{formatTanggal(p.tanggal_bayar)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-melon-400 font-medium">{formatRupiah(p.jumlah_bayar)}</span>
                      <button type="button" onClick={() => startEditPayment(p)}
                        className="p-1 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors text-xs" title="Edit pembayaran">✏️</button>
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
                <h4 className="text-sm font-semibold text-text-secondary">{editPayment ? 'Edit Pembayaran' : 'Catat Pembayaran'}</h4>
                {editPayment && <button type="button" onClick={cancelEditPayment} className="text-xs text-text-muted hover:text-watermelon-400 transition-colors">Batal Edit</button>}
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
      </div>
    </div>
  );
}
