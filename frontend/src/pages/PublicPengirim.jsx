import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicPengirim } from '../services/api';
import { formatRupiah, formatKg, formatTanggal } from '../utils/format';
import PageHeader from '../components/PageHeader';

export default function PublicPengirim() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await getPublicPengirim(token);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data. Link mungkin tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-melon-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-text-muted">Memuat rincian...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl mb-4">🔗</span>
        <h2 className="text-xl font-bold text-text-primary mb-2">Akses Ditolak</h2>
        <p className="text-text-secondary">{error}</p>
      </div>
    );
  }

  const { pengirim, total_hutang, total_dibayar, sisa_tagihan, riwayat_pembayaran, rincian_belum_lunas, semua_transaksi } = data;
  const lunas = sisa_tagihan <= 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="bg-surface border-b border-border p-4 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-md mx-auto">
          <PageHeader title={`Halo, ${pengirim.nama} 👋`} subtitle="Rincian Transaksi Semangka" />
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Ringkasan */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-5 shadow-xl text-white">
          <p className="text-xs text-white/70 font-medium mb-1">Status Tagihan</p>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold">{formatRupiah(sisa_tagihan)}</h2>
            {lunas && <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">LUNAS</span>}
          </div>

          <div className="flex justify-between border-t border-white/20 pt-4 mt-2">
            <div>
              <p className="text-[10px] text-white/60 mb-0.5">Total Keseluruhan</p>
              <p className="text-sm font-semibold">{formatRupiah(total_hutang)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/60 mb-0.5">Sudah Dibayar</p>
              <p className="text-sm font-semibold">{formatRupiah(total_dibayar)}</p>
            </div>
          </div>
        </div>

        {/* Riwayat Pembayaran */}
        <section>
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <span>💳</span> Riwayat Pembayaran (Cicilan)
          </h3>
          <div className="bg-surface-card border border-border rounded-2xl overflow-hidden">
            {riwayat_pembayaran.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">Belum ada riwayat pembayaran.</p>
            ) : (
              <div className="divide-y divide-border">
                {riwayat_pembayaran.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-text-muted">{formatTanggal(p.tanggal_bayar)}</span>
                    <span className="text-sm font-bold text-emerald-400">+{formatRupiah(p.jumlah_bayar)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Semua Transaksi */}
        <section>
          <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
            <span>📦</span> Riwayat Stok Masuk
          </h3>
          <div className="space-y-3">
            {semua_transaksi.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Belum ada transaksi stok masuk.</p>
            ) : (
              semua_transaksi.map((trx, idx) => {
                const trxLunas = parseFloat(trx.sisa_bayar) <= 0;
                return (
                  <div key={trx.id} className="bg-surface-card border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-text-muted mb-1">{formatTanggal(trx.tanggal)}</p>
                        <p className="text-sm font-semibold text-text-primary">Muatan: {formatKg(trx.kg)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-melon-400">{formatRupiah(trx.harga)}</p>
                        {trxLunas ? (
                          <span className="text-[10px] text-emerald-400 font-medium">✓ Lunas</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-medium">Sisa: {formatRupiah(trx.sisa_bayar)}</span>
                        )}
                      </div>
                    </div>
                    {trx.gambar && trx.gambar.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {trx.gambar.map((g, i) => (
                          <img key={i} src={g} alt={`Nota ${i+1}`} className="h-14 w-14 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 active:scale-95 transition-all" onClick={() => setPreviewImage(g)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* Modal Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
          <button className="absolute top-6 right-6 bg-surface/50 p-2 rounded-full text-white backdrop-blur-md">✕</button>
        </div>
      )}
    </div>
  );
}
