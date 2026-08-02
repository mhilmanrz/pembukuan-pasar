import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { getHutangPiutang, deleteHutangPiutang, getPelangganList } from '../../services/api';
import { formatRupiah, formatKg, formatTanggal } from '../../utils/format';
import { getDateParams } from '../../utils/dateHelper';
import { usePeriode } from '../../context/PeriodeContext';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import DateFilterChips from '../../components/DateFilterChips';

export default function PiutangList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pelangganList, setPelangganList] = useState([]);

  const { globalFilter, setGlobalFilter, globalDari, setGlobalDari, globalSampai, setGlobalSampai, periodeAktif, periodeList } = usePeriode();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPelanggan, setExpandedPelanggan] = useState(null);

  useEffect(() => {
    if (globalFilter === 'custom' && (!globalDari || !globalSampai)) return;
    fetchData();
  }, [globalFilter, globalDari, globalSampai, periodeAktif, periodeList]);

  useEffect(() => { fetchPelangganList(); }, []);

  const fetchPelangganList = async () => {
    try { setPelangganList((await getPelangganList()).data); } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try { setItems((await getHutangPiutang({ ...getDateParams(globalFilter, globalDari, globalSampai, periodeAktif, periodeList), tipe: 'piutang' })).data); }
    catch (err) { console.error('Gagal memuat data:', err); }
    finally { setLoading(false); }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.nama === searchQuery);
  }, [items, searchQuery]);

  const grandTotal = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({ kg: acc.kg + (parseFloat(item.kg) || 0), total: acc.total + (parseFloat(item.jumlah_total) || 0), dibayar: acc.dibayar + (parseFloat(item.total_dibayar) || 0), sisa: acc.sisa + (parseFloat(item.sisa_tagihan) || 0) }),
      { kg: 0, total: 0, dibayar: 0, sisa: 0 }
    );
  }, [filteredItems]);

  const groupedTotals = useMemo(() => {
    const map = new Map();
    filteredItems.forEach(item => {
      if (!map.has(item.nama)) map.set(item.nama, { nama: item.nama, count: 0, totalKg: 0, totalPiutang: 0, totalDibayar: 0, totalKgDibayar: 0, items: [] });
      const p = map.get(item.nama);
      p.count += 1;
      p.totalKg += parseFloat(item.kg) || 0;
      p.totalPiutang += parseFloat(item.jumlah_total) || 0;
      p.totalDibayar += parseFloat(item.total_dibayar) || 0;
      p.totalKgDibayar += parseFloat(item.total_kg_dibayar) || 0;
      p.items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => b.totalPiutang - a.totalPiutang);
  }, [filteredItems]);

  const groupedList = useMemo(() => {
    return filteredItems.reduce((acc, item) => { if (!acc[item.nama]) acc[item.nama] = []; acc[item.nama].push(item); return acc; }, {});
  }, [filteredItems]);

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini? Semua cicilan terkait juga akan dihapus.')) return;
    try { await deleteHutangPiutang(id); fetchData(); } catch { alert('Gagal menghapus data'); }
  };

  return (
    <div>
      <PageHeader title="Piutang" subtitle="Kelola tagihan pelanggan"
        action={<button onClick={() => navigate('/piutang/tambah')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-orange-500/25 active:scale-95">+ Tambah</button>} />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <SearchableSelect value={searchQuery} onChange={(val) => setSearchQuery(val)} options={pelangganList.map(p => p.nama)}
          placeholder="Ketik & pilih pelanggan (kosongkan untuk tampil semua)" allowNew={false} />
        <DateFilterChips
          filter={globalFilter} onFilterChange={setGlobalFilter}
          dari={globalDari} onDariChange={setGlobalDari}
          sampai={globalSampai} onSampaiChange={setGlobalSampai}
          color="orange"
        />  </div>

      {/* Summary */}
      {!loading && filteredItems.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-white/70 font-medium">Total Piutang ({filteredItems.length} transaksi)</p>
                <p className="text-xl font-bold text-white">{formatRupiah(grandTotal.total)}</p>
                <p className="text-xs text-white/80">{formatKg(grandTotal.kg)}</p>
                <div className="flex gap-4 pt-2 border-t border-white/20 mt-2">
                  <div><span className="text-[10px] text-white/70 block">Sudah Dibayar</span><span className="text-xs font-semibold text-white">✓ {formatRupiah(grandTotal.dibayar)}</span></div>
                  <div><span className="text-[10px] text-white/70 block">Belum Dibayar</span><span className="text-xs font-semibold text-white">⏳ {formatRupiah(grandTotal.sisa)}</span></div>
                </div>
              </div>
              <span className="text-3xl opacity-80">📋</span>
            </div>
          </div>

          {/* Per-pelanggan breakdown */}
          {groupedTotals.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><p className="text-xs text-text-muted font-medium">Rekap per Pelanggan</p></div>
              <div className="divide-y divide-border">
                {groupedTotals.map((p) => {
                  const sisa = p.totalPiutang - p.totalDibayar;
                  const lunas = sisa <= 0;
                  return (
                    <div key={p.nama} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{p.nama}</p>
                          <p className="text-xs text-text-muted">{p.count}x · {formatKg(p.totalKg)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-text-primary">{formatRupiah(p.totalPiutang)}</p>
                          <div className="flex gap-1">
                            {(() => {
                              const pelanggan = pelangganList.find(pl => pl.nama === p.nama);
                              const hasToken = !!pelanggan?.share_token;
                              return (
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasToken) { const link = `${window.location.origin}/u/${pelanggan.share_token}`; navigator.clipboard.writeText(link); alert('Link berhasil disalin:\n' + link); }
                                  else { alert(`Pelanggan "${p.nama}" belum punya link akses.\nCoba tambahkan transaksi baru agar token dibuat otomatis.`); }
                                }} className={`p-2 rounded-lg transition-colors ${hasToken ? 'hover:bg-indigo-500/10 text-text-muted hover:text-indigo-400' : 'hover:bg-surface-elevated text-text-muted/40'}`}
                                  title={hasToken ? 'Salin Link Akses Pelanggan' : 'Link belum tersedia'}>🔗</button>
                              );
                            })()}
                            <button onClick={() => navigate(`/piutang/bayar/${encodeURIComponent(p.nama)}`)} className="p-2 rounded-lg hover:bg-orange-500/10 text-text-muted hover:text-orange-400 transition-colors" title="Bayar Tagihan">💳</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-orange-400">✓ Dibayar: {formatRupiah(p.totalDibayar)} {p.totalKgDibayar > 0 ? `(${formatKg(p.totalKgDibayar)})` : ''}</span>
                          {!lunas && <span className="text-xs text-amber-400">⏳ Sisa: {formatRupiah(sisa)}</span>}
                          {lunas && <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">Lunas</span>}
                        </div>
                        <button onClick={() => setExpandedPelanggan(expandedPelanggan === p.nama ? null : p.nama)}
                          className="text-[10px] text-orange-500 hover:bg-orange-50 font-medium px-2 py-1 border border-orange-100 rounded-lg transition-colors">
                          {expandedPelanggan === p.nama ? 'Tutup Detail' : 'Lihat Detail'}
                        </button>
                      </div>
                      {expandedPelanggan === p.nama && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-slide-down">
                          {p.items.map((item, idx) => (
                            <div key={item.id} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg border border-border">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-text-muted">Trx {p.items.length - idx} • {formatTanggal(item.tanggal)}</span>
                                {item.kg ? <span className="text-xs font-medium text-text-primary">{formatKg(item.kg)}</span> : null}
                              </div>
                              <span className="text-xs font-bold text-text-primary">{formatRupiah(item.jumlah_total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse"><div className="h-4 bg-surface-elevated rounded w-3/4 mb-2" /><div className="h-3 bg-surface-elevated rounded w-1/2" /></div>))}</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16"><span className="text-5xl mb-4 block">📋</span><p className="text-text-muted">Data piutang tidak ditemukan</p></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedList).map(([nama, records]) => (
            <div key={nama}>
              <h3 className="text-sm font-semibold text-text-secondary mb-2 px-1">{nama}</h3>
              <div className="space-y-2">
                {records.map((item) => {
                  const sisa = parseFloat(item.sisa_tagihan);
                  const lunas = sisa <= 0;
                  return (
                    <div key={item.id} className={`bg-surface-card rounded-2xl p-4 border transition-colors ${lunas ? 'border-emerald-500/30' : 'border-border hover:border-orange-500/30'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => navigate(`/piutang/bayar/${encodeURIComponent(item.nama)}`)} role="button">
                          <div className="flex items-center gap-2 mb-1">
                            {lunas && <span className="text-xs bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full font-bold">✓ Lunas</span>}
                            <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm mt-1">
                            <span className="text-text-primary font-medium">{formatRupiah(item.jumlah_total)}</span>
                            {item.kg && <span className="text-text-muted">{formatKg(item.kg)}</span>}
                          </div>
                          {!lunas && <p className="text-xs text-amber-400 mt-1">Sisa: {formatRupiah(sisa)}</p>}
                          {item.keterangan && <p className="text-xs text-text-muted mt-1">{item.keterangan}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => navigate(`/piutang/${item.id}/edit`, { state: { item } })} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <Outlet context={{ onSuccess: () => { fetchData(); fetchPelangganList(); } }} />
    </div>
  );
}
