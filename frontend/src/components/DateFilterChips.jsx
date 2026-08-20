import { useState } from 'react';
import { usePeriode } from '../context/PeriodeContext';
import { formatTanggal } from '../utils/format';

const colorMap = {
  melon: 'bg-melon-500 text-white shadow-lg shadow-melon-500/25',
  watermelon: 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25',
  orange: 'bg-orange-500/80 text-white shadow-lg shadow-orange-500/20',
};

export default function DateFilterChips({
  filter,
  onFilterChange,
  dari,
  onDariChange,
  sampai,
  onSampaiChange,
  color = 'watermelon',
}) {
  const { periodeAktif, periodeList } = usePeriode();
  const [showPeriodeMenu, setShowPeriodeMenu] = useState(false);
  const activeClass = colorMap[color] || colorMap.watermelon;

  // Build filter options — "Periode Ini" only shows if there's an active period
  const filterOptions = [
    ...(periodeAktif ? [{ val: 'periode-ini', label: '📖 Periode Ini' }] : []),
    { val: 'bulan-ini', label: 'Bulan Ini' },
    { val: 'hari-ini', label: 'Hari Ini' },
    { val: 'semua', label: 'Semua' },
    { val: 'custom', label: 'Custom' },
  ];

  // Check if current filter is a historical/specific period
  const isHistoricalPeriode = filter?.startsWith('periode-') && filter !== 'periode-ini';
  const selectedPeriode = isHistoricalPeriode
    ? periodeList.find(p => `periode-${p.id}` === filter)
    : null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {filterOptions.map((f) => (
          <button
            key={f.val}
            onClick={() => onFilterChange(f.val)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === f.val
                ? activeClass
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Riwayat Periode popup trigger */}
        {periodeList.length > 0 && (
          <button
            onClick={() => setShowPeriodeMenu(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              isHistoricalPeriode
                ? activeClass
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {selectedPeriode
              ? `📚 ${formatTanggal(selectedPeriode.tanggal_buka)} – ${selectedPeriode.tanggal_tutup ? formatTanggal(selectedPeriode.tanggal_tutup) : 'Sekarang'}`
              : '📚 Riwayat'}
          </button>
        )}
      </div>

      {showPeriodeMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowPeriodeMenu(false)}>
          <div className="w-full max-w-sm bg-surface-elevated rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-0.5">📚 Riwayat Periode</h3>
                <p className="text-xs text-text-muted">Pilih periode untuk difilter</p>
              </div>
              <button onClick={() => setShowPeriodeMenu(false)} className="p-2 rounded-xl bg-surface-card/50 text-text-muted hover:bg-surface-card hover:text-text-primary transition-colors">
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-3 space-y-2">
              {periodeList.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onFilterChange(`periode-${p.id}`);
                          setShowPeriodeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-surface-card transition-colors border-b border-border last:border-0 ${
                          filter === `periode-${p.id}` ? 'bg-surface-card' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-text-primary">
                            {formatTanggal(p.tanggal_buka)} – {p.tanggal_tutup ? formatTanggal(p.tanggal_tutup) : 'Sekarang'}
                          </p>
                          {!p.tanggal_tutup && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-md font-bold">Aktif</span>
                          )}
                        </div>
                        {p.catatan && (
                          <p className="text-xs text-text-muted mt-0.5">{p.catatan}</p>
                        )}
                      </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {filter === 'custom' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">Dari</label>
            <input type="date" value={dari} onChange={(e) => onDariChange(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">Sampai</label>
            <input type="date" value={sampai} onChange={(e) => onSampaiChange(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary" />
          </div>
        </div>
      )}
    </>
  );
}
