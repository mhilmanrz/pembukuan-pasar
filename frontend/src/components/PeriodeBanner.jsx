import { useState } from 'react';
import { usePeriode } from '../context/PeriodeContext';
import { formatTanggal, todayStr } from '../utils/format';

export default function PeriodeBanner({ onPeriodeSelect }) {
  const { periodeAktif, periodeList, loading, bukaBuku, tutupBuku, updatePeriode, deletePeriode } = usePeriode();
  const [showKelola, setShowKelola] = useState(false);
  
  // Modals state
  const [showBukaModal, setShowBukaModal] = useState(false);
  const [showTutupModal, setShowTutupModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form state
  const [bukaTanggal, setBukaTanggal] = useState(todayStr());
  const [bukaCatatan, setBukaCatatan] = useState('');
  const [tutupTanggal, setTutupTanggal] = useState(todayStr());
  const [tutupCatatan, setTutupCatatan] = useState('');
  
  // Edit state
  const [editTarget, setEditTarget] = useState(null);
  const [editBuka, setEditBuka] = useState('');
  const [editTutup, setEditTutup] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  const periodeHari = periodeAktif
    ? Math.floor((new Date() - new Date(periodeAktif.tanggal_buka)) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const handleBukaBuku = async () => {
    setActionLoading(true);
    try {
      await bukaBuku({ tanggal_buka: bukaTanggal, catatan: bukaCatatan || null });
      setShowBukaModal(false);
      setBukaTanggal(todayStr());
      setBukaCatatan('');
      if (onPeriodeSelect) onPeriodeSelect('periode-ini');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membuka buku');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTutupBuku = async () => {
    setActionLoading(true);
    try {
      await tutupBuku({ tanggal_tutup: tutupTanggal, catatan: tutupCatatan || undefined });
      setShowTutupModal(false);
      setTutupTanggal(todayStr());
      setTutupCatatan('');
      if (onPeriodeSelect) onPeriodeSelect('bulan-ini'); // Fallback to bulan-ini after close
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menutup buku');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (p) => {
    setEditTarget(p);
    setEditBuka(p.tanggal_buka?.split('T')[0] || '');
    setEditTutup(p.tanggal_tutup?.split('T')[0] || '');
    setEditCatatan(p.catatan || '');
    setShowEditModal(true);
  };

  const handleEditPeriode = async () => {
    if (!editTarget) return;
    setActionLoading(true);
    try {
      await updatePeriode(editTarget.id, {
        tanggal_buka: editBuka,
        tanggal_tutup: editTutup || null,
        catatan: editCatatan || null,
      });
      setShowEditModal(false);
      setEditTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah periode');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePeriode = async (id) => {
    if (!confirm('Yakin hapus periode ini?')) return;
    try {
      await deletePeriode(id);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus periode');
    }
  };

  if (loading) {
    return (
      <div className="mb-5 bg-surface-card border border-border rounded-2xl p-4 animate-pulse h-[88px]" />
    );
  }

  return (
    <>
      {periodeAktif ? (
        <div className="mb-5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs font-semibold text-emerald-400">Periode Aktif</p>
                </div>
                <p className="text-sm font-bold text-text-primary">
                  📗 {formatTanggal(periodeAktif.tanggal_buka)} – Sekarang
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Berjalan {periodeHari} hari
                  {periodeAktif.catatan && ` · ${periodeAktif.catatan}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(periodeAktif)}
                  className="p-2 rounded-xl bg-surface-card/50 text-text-muted hover:text-amber-400 transition-colors border border-white/10"
                  title="Edit Periode"
                >✏️</button>
                <button
                  onClick={() => setShowTutupModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-400 text-sm font-semibold hover:bg-rose-500/25 transition-colors border border-rose-500/20"
                >
                  📕 Tutup Buku
                </button>
              </div>
            </div>
          </div>

          {/* Riwayat periode inside banner */}
          {periodeList.length > 1 && (
            <>
              <button
                onClick={() => setShowKelola(!showKelola)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-400/70 hover:text-emerald-400 border-t border-emerald-500/20 hover:bg-emerald-500/5 transition-colors"
              >
                📚 Riwayat Periode ({periodeList.length - 1})
                <span className={`transition-transform duration-200 ${showKelola ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showKelola && (
                <div className="border-t border-emerald-500/20 divide-y divide-border/50 bg-surface-card/50 max-h-60 overflow-y-auto">
                  {periodeList.filter(p => p.id !== periodeAktif?.id).map((p) => (
                    <div key={p.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-elevated/50 transition-colors">
                      <button 
                        className="text-left flex-1"
                        onClick={() => {
                          if (onPeriodeSelect) onPeriodeSelect(`periode-${p.id}`);
                        }}
                      >
                        <p className="text-xs font-medium text-text-primary hover:text-emerald-400 transition-colors">
                          {formatTanggal(p.tanggal_buka)} – {p.tanggal_tutup ? formatTanggal(p.tanggal_tutup) : 'Sekarang'}
                        </p>
                        {p.catatan && <p className="text-[11px] text-text-muted">{p.catatan}</p>}
                      </button>
                      <div className="flex gap-1 justify-end sm:justify-start">
                        <button onClick={() => openEditModal(p)} className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors text-xs">✏️</button>
                        <button onClick={() => handleDeletePeriode(p.id)} className="p-1.5 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mb-5 bg-surface-card border border-border border-dashed rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-secondary">Belum ada periode aktif</p>
              <p className="text-xs text-text-muted mt-0.5">Buka buku untuk mulai pembukuan baru</p>
            </div>
            <button
              onClick={() => setShowBukaModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/25 transition-colors border border-emerald-500/20 whitespace-nowrap"
            >
              📗 Buka Buku
            </button>
          </div>

          {/* Riwayat periode when no active period */}
          {periodeList.length > 0 && (
            <>
              <button
                onClick={() => setShowKelola(!showKelola)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-text-muted hover:text-text-primary border-t border-border hover:bg-surface-elevated transition-colors"
              >
                📚 Riwayat Periode ({periodeList.length})
                <span className={`transition-transform duration-200 ${showKelola ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showKelola && (
                <div className="border-t border-border divide-y divide-border max-h-60 overflow-y-auto">
                  {periodeList.map((p) => (
                    <div key={p.id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-elevated transition-colors">
                      <button 
                        className="text-left flex-1"
                        onClick={() => {
                          if (onPeriodeSelect) onPeriodeSelect(`periode-${p.id}`);
                        }}
                      >
                        <p className="text-xs font-medium text-text-primary hover:text-emerald-400 transition-colors">
                          {formatTanggal(p.tanggal_buka)} – {p.tanggal_tutup ? formatTanggal(p.tanggal_tutup) : 'Sekarang'}
                        </p>
                        {p.catatan && <p className="text-[11px] text-text-muted">{p.catatan}</p>}
                      </button>
                      <div className="flex gap-1 justify-end sm:justify-start">
                        <button onClick={() => openEditModal(p)} className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors text-xs">✏️</button>
                        <button onClick={() => handleDeletePeriode(p.id)} className="p-1.5 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal: Buka Buku */}
      {showBukaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowBukaModal(false)}>
          <div className="w-full max-w-md bg-surface-elevated rounded-2xl border border-border shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-1">📗 Buka Buku Baru</h3>
            <p className="text-xs text-text-muted mb-5">Mulai periode pembukuan baru</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Tanggal Mulai</label>
                <input
                  type="date"
                  value={bukaTanggal}
                  onChange={(e) => setBukaTanggal(e.target.value)}
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Catatan (opsional)</label>
                <input
                  type="text"
                  value={bukaCatatan}
                  onChange={(e) => setBukaCatatan(e.target.value)}
                  placeholder="Misal: Periode Juli-Agustus"
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBukaModal(false)} className="flex-1 py-2.5 rounded-xl bg-surface-card border border-border text-text-secondary font-medium text-sm hover:bg-surface-elevated transition-colors">
                Batal
              </button>
              <button
                onClick={handleBukaBuku}
                disabled={actionLoading || !bukaTanggal}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/25"
              >
                {actionLoading ? 'Memproses...' : '📗 Buka Buku'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tutup Buku */}
      {showTutupModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowTutupModal(false)}>
          <div className="w-full max-w-md bg-surface-elevated rounded-2xl border border-border shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-1">📕 Tutup Buku</h3>
            <p className="text-xs text-text-muted mb-2">Akhiri periode aktif saat ini</p>
            
            {periodeAktif && (
              <div className="bg-surface-card border border-border rounded-xl p-3 mb-5">
                <p className="text-xs text-text-muted">Periode saat ini</p>
                <p className="text-sm font-semibold text-text-primary">
                  {formatTanggal(periodeAktif.tanggal_buka)} – Sekarang ({periodeHari} hari)
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Tanggal Tutup</label>
                <input
                  type="date"
                  value={tutupTanggal}
                  onChange={(e) => setTutupTanggal(e.target.value)}
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Catatan (opsional)</label>
                <input
                  type="text"
                  value={tutupCatatan}
                  onChange={(e) => setTutupCatatan(e.target.value)}
                  placeholder="Misal: Tutup buku akhir periode"
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTutupModal(false)} className="flex-1 py-2.5 rounded-xl bg-surface-card border border-border text-text-secondary font-medium text-sm hover:bg-surface-elevated transition-colors">
                Batal
              </button>
              <button
                onClick={handleTutupBuku}
                disabled={actionLoading || !tutupTanggal}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition-colors disabled:opacity-50 shadow-lg shadow-rose-500/25"
              >
                {actionLoading ? 'Memproses...' : '📕 Tutup Buku'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Periode */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-md bg-surface-elevated rounded-2xl border border-border shadow-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-1">✏️ Edit Periode</h3>
            <p className="text-xs text-text-muted mb-5">Koreksi tanggal atau catatan periode</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Tanggal Buka</label>
                <input type="date" value={editBuka} onChange={(e) => setEditBuka(e.target.value)}
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Tanggal Tutup</label>
                <input type="date" value={editTutup} onChange={(e) => setEditTutup(e.target.value)}
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary" />
                <p className="text-[11px] text-text-muted mt-1">Kosongkan jika periode masih aktif</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Catatan</label>
                <input type="text" value={editCatatan} onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Misal: Periode Juli-Agustus"
                  className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl bg-surface-card border border-border text-text-secondary font-medium text-sm hover:bg-surface-elevated transition-colors">
                Batal
              </button>
              <button onClick={handleEditPeriode} disabled={actionLoading || !editBuka}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/25">
                {actionLoading ? 'Memproses...' : '💾 Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
