import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { getPembayaranPelanggan, addPembayaranPelanggan, updatePembayaranPiutang } from '../../services/api';
import { formatRupiah, formatKg, formatTanggal, todayStr } from '../../utils/format';
// PageHeader removed
import CurrencyInput from '../../components/CurrencyInput';
import NumberInput from '../../components/NumberInput';

export default function PiutangBayar() {
  const { nama } = useParams();
  const navigate = useNavigate();
  const decodedNama = decodeURIComponent(nama);
  const { onSuccess } = useOutletContext() || {};

  const [bayarData, setBayarData] = useState(null);
  const [bayarForm, setBayarForm] = useState({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
  const [savingBayar, setSavingBayar] = useState(false);
  const [editPayment, setEditPayment] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { setBayarData((await getPembayaranPelanggan(decodedNama)).data); }
    catch (err) { console.error('Gagal memuat riwayat bayar:', err); }
  };

  const handleBayar = async (e) => {
    e.preventDefault();
    setSavingBayar(true);
    try {
      if (editPayment) { await updatePembayaranPiutang(editPayment.id, bayarForm); setEditPayment(null); }
      else { await addPembayaranPelanggan(decodedNama, bayarForm); }
      setBayarData((await getPembayaranPelanggan(decodedNama)).data);
      setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
      if (onSuccess) onSuccess();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menambah pembayaran'); }
    finally { setSavingBayar(false); }
  };

  const startEditPayment = (payment) => {
    setEditPayment(payment);
    setBayarForm({ tanggal_bayar: payment.tanggal_bayar?.split('T')[0] || '', jumlah_bayar: payment.jumlah_bayar, kg_bayar: payment.kg_bayar || '' });
  };

  const cancelEditPayment = () => {
    setEditPayment(null);
    setBayarForm({ tanggal_bayar: todayStr(), jumlah_bayar: '', kg_bayar: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => navigate('/piutang')}>
      <div className="w-full max-w-lg mx-auto bg-surface sm:rounded-2xl rounded-t-3xl border-t sm:border border-border p-5 shadow-2xl max-h-[90dvh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Pembayaran — {decodedNama}</h2>
            <p className="text-xs text-text-muted">Detail tagihan pelanggan</p>
          </div>
          <button type="button" onClick={() => navigate('/piutang')} className="p-2 bg-surface-elevated rounded-full text-text-muted hover:text-text-primary transition-colors">✕</button>
        </div>

      {!bayarData ? (
        <div className="py-16 text-center text-text-muted">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Memuat data...
        </div>
      ) : (
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
              <span className={bayarData.sisa_tagihan <= 0 ? 'text-emerald-500' : 'text-amber-400'}>{formatRupiah(bayarData.sisa_tagihan)}</span>
            </div>
          </div>

          {/* Payment history */}
          {bayarData.pembayaran?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-secondary mb-2">Riwayat Pembayaran</h4>
              <div className="space-y-2">
                {bayarData.pembayaran.map((p) => (
                  <div key={p.id} className={`flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border transition-colors ${editPayment?.id === p.id ? 'border-orange-500 bg-orange-500/5' : 'border-border'}`}>
                    <span className="text-sm text-text-muted">{formatTanggal(p.tanggal_bayar)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-orange-400 font-medium">{formatRupiah(p.jumlah_bayar)}</span>
                      {p.kg_bayar && <span className="text-xs text-text-muted font-medium">({formatKg(p.kg_bayar)})</span>}
                      <button type="button" onClick={() => startEditPayment(p)}
                        className="p-1 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-colors text-xs" title="Edit pembayaran">✏️</button>
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
                <h4 className="text-sm font-semibold text-text-secondary">{editPayment ? 'Edit Pembayaran' : 'Catat Pembayaran Masuk'}</h4>
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
      </div>
    </div>
  );
}
