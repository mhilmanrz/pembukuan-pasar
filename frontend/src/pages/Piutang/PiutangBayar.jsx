import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { getPembayaranPelanggan, addPembayaranPelanggan, updatePembayaranPiutang, deletePembayaranPiutang } from '../../services/api';
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
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [payFilter, setPayFilter] = useState('semua');
  const [showAllPay, setShowAllPay] = useState(false);

  // Group split payments (FIFO) by tanggal_bayar + created_at so they display as one
  const groupedPayments = useMemo(() => {
    if (!bayarData?.pembayaran) return [];
    const now = new Date();
    const filtered = bayarData.pembayaran.filter(p => {
      if (payFilter === 'bulan-ini') {
        const d = new Date(p.tanggal_bayar);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (payFilter === '3-bulan') {
        const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3);
        return new Date(p.tanggal_bayar) >= cutoff;
      }
      return true;
    });
    const groups = {};
    filtered.forEach(p => {
      const key = `${p.tanggal_bayar}_${p.created_at?.split('.')[0]}`;
      if (!groups[key]) {
        groups[key] = { key, tanggal_bayar: p.tanggal_bayar, created_at: p.created_at, total: 0, totalKg: 0, items: [] };
      }
      groups[key].total += parseFloat(p.jumlah_bayar);
      groups[key].totalKg += parseFloat(p.kg_bayar) || 0;
      groups[key].items.push(p);
    });
    return Object.values(groups);
  }, [bayarData?.pembayaran]);

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

  const handleDeletePayment = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePembayaranPiutang(confirmDelete.id);
      setConfirmDelete(null);
      setBayarData((await getPembayaranPelanggan(decodedNama)).data);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus pembayaran');
    } finally {
      setDeleting(false);
    }
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
              {/* Header + filter chips */}
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-text-secondary">
                  Riwayat Pembayaran
                  {groupedPayments.length > 0 && <span className="ml-1.5 text-xs font-normal text-text-muted">({groupedPayments.length})</span>}
                </h4>
                <div className="flex gap-1">
                  {[['semua','Semua'],['bulan-ini','Bln Ini'],['3-bulan','3 Bln']].map(([val,label]) => (
                    <button key={val} type="button" onClick={() => { setPayFilter(val); setShowAllPay(false); }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                        payFilter === val ? 'bg-orange-500 text-white' : 'bg-surface-elevated text-text-muted hover:text-text-primary'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>

              {groupedPayments.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">Tidak ada pembayaran di periode ini</p>
              ) : (
                <div className={`overflow-y-auto transition-all duration-300 space-y-2 ${
                  showAllPay ? 'max-h-[600px]' : 'max-h-[300px]'
                } pr-0.5`}>
                  {groupedPayments.map((group) => (
                    <div key={group.key}>
                      <div className={`flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border transition-colors ${
                        group.items.some(i => editPayment?.id === i.id) ? 'border-orange-500 bg-orange-500/5' : 'border-border'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text-muted">{formatTanggal(group.tanggal_bayar)}</span>
                          {group.items.length > 1 && (
                            <span className="text-[10px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded-md font-medium">{group.items.length}x split</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-orange-400 font-medium">{formatRupiah(group.total)}</span>
                          {group.totalKg > 0 && <span className="text-xs text-text-muted font-medium">({formatKg(group.totalKg)})</span>}
                          {group.items.length === 1 ? (
                            <>
                              <button type="button" onClick={() => startEditPayment(group.items[0])}
                                className="p-1 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-colors text-xs" title="Edit pembayaran">✏️</button>
                              <button type="button" onClick={() => setConfirmDelete(group.items[0])}
                                className="p-1 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors text-xs" title="Hapus pembayaran">🗑️</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setExpandedGroup(expandedGroup === group.key ? null : group.key)}
                              className={`p-1 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-all text-xs ${expandedGroup === group.key ? 'rotate-180' : ''}`} title="Lihat detail">▾</button>
                          )}
                        </div>
                      </div>
                      {expandedGroup === group.key && group.items.length > 1 && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-500/20 pl-3">
                          {group.items.map((p) => (
                            <div key={p.id} className={`flex justify-between items-center bg-surface-elevated/50 rounded-lg px-3 py-2 text-xs transition-colors ${
                              editPayment?.id === p.id ? 'ring-1 ring-orange-500' : ''
                            }`}>
                              <span className="text-text-muted">Split #{group.items.indexOf(p) + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-orange-400 font-medium">{formatRupiah(p.jumlah_bayar)}</span>
                                {p.kg_bayar && <span className="text-text-muted">({formatKg(p.kg_bayar)})</span>}
                                <button type="button" onClick={() => startEditPayment(p)}
                                  className="p-1 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-colors" title="Edit">✏️</button>
                                <button type="button" onClick={() => setConfirmDelete(p)}
                                  className="p-1 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors" title="Hapus">🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {groupedPayments.length > 4 && (
                <button type="button" onClick={() => setShowAllPay(!showAllPay)}
                  className="w-full mt-2 py-1.5 text-xs text-text-muted hover:text-text-primary text-center transition-colors">
                  {showAllPay ? '▲ Sembunyikan' : `▼ Lihat ${groupedPayments.length - 4} lainnya`}
                </button>
              )}
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm bg-surface-elevated rounded-2xl border border-border shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-watermelon-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Hapus Pembayaran?</h3>
              <p className="text-sm text-text-muted">Pembayaran sebesar <span className="font-semibold text-watermelon-400">{formatRupiah(confirmDelete.jumlah_bayar)}</span> pada tanggal <span className="font-medium text-text-secondary">{formatTanggal(confirmDelete.tanggal_bayar)}</span> akan dihapus permanen.</p>
            </div>
            <div className="bg-watermelon-500/5 border border-watermelon-500/20 rounded-xl p-3 mb-5">
              <p className="text-xs text-watermelon-400 font-medium">⚠️ Tindakan ini tidak bisa dibatalkan. Sisa tagihan pelanggan akan bertambah kembali.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-surface-card border border-border text-text-secondary font-medium text-sm hover:bg-surface-elevated transition-colors">
                Batal
              </button>
              <button onClick={handleDeletePayment} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-watermelon-500 text-white font-semibold text-sm hover:bg-watermelon-600 transition-colors disabled:opacity-50 shadow-lg shadow-watermelon-500/25">
                {deleting ? 'Menghapus...' : '🗑️ Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
