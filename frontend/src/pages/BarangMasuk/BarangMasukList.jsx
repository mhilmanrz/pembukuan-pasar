import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { getBarangMasuk, getPengirimList, deleteBarangMasuk } from '../../services/api';
import { formatRupiah, formatKg, formatTanggal } from '../../utils/format';
import { getDateParams } from '../../utils/dateHelper';
import { usePeriode } from '../../context/PeriodeContext';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import DateFilterChips from '../../components/DateFilterChips';

export default function BarangMasukList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pengirimList, setPengirimList] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // Accordion state
  const [expandedPengirim, setExpandedPengirim] = useState(null);

  // Global Periode Context
  const { globalFilter, setGlobalFilter, globalDari, setGlobalDari, globalSampai, setGlobalSampai, periodeAktif, periodeList } = usePeriode();

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (globalFilter === 'custom' && (!globalDari || !globalSampai)) return;
    fetchData();
  }, [globalFilter, globalDari, globalSampai, periodeAktif, periodeList]);

  useEffect(() => { fetchPengirimList(); }, []);

  const fetchPengirimList = async () => {
    try {
      const res = await getPengirimList();
      setPengirimList(res.data);
    } catch (err) {
      console.error('Gagal memuat daftar pengirim:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = getDateParams(globalFilter, globalDari, globalSampai, periodeAktif, periodeList);
      const res = await getBarangMasuk(params);
      setItems(res.data);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter(item => item.nama_pengirim === searchQuery);
  }, [items, searchQuery]);

  const pengirimTotals = useMemo(() => {
    const map = {};
    filteredItems.forEach(item => {
      const name = item.nama_pengirim;
      if (!map[name]) {
        map[name] = { nama: name, totalKg: 0, totalHarga: 0, totalDibayar: 0, count: 0, items: [] };
      }
      map[name].totalKg += parseFloat(item.kg) || 0;
      map[name].totalHarga += parseFloat(item.harga) || 0;
      map[name].totalDibayar += parseFloat(item.total_dibayar) || 0;
      map[name].count += 1;
      map[name].items.push(item);
    });
    return Object.values(map).sort((a, b) => b.totalHarga - a.totalHarga);
  }, [filteredItems]);

  const grandTotal = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        kg: acc.kg + (parseFloat(item.kg) || 0),
        harga: acc.harga + (parseFloat(item.harga) || 0),
        dibayar: acc.dibayar + (parseFloat(item.total_dibayar) || 0),
        sisa: acc.sisa + (parseFloat(item.sisa_bayar) || 0),
      }),
      { kg: 0, harga: 0, dibayar: 0, sisa: 0 }
    );
  }, [filteredItems]);

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus data ini?')) return;
    try {
      await deleteBarangMasuk(id);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div>
      <PageHeader
        title="Stok Masuk"
        subtitle="Catat penerimaan semangka"
        action={
          <button onClick={() => navigate('/barang-masuk/tambah')}
            className="bg-melon-500 hover:bg-melon-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-melon-500/25 active:scale-95">
            + Catat
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <SearchableSelect
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
          options={pengirimList.map(p => p.nama)}
          placeholder="Ketik & pilih nama pengirim (kosongkan untuk tampil semua)"
          allowNew={false}
        />
        <DateFilterChips
          filter={globalFilter}
          onFilterChange={setGlobalFilter}
          dari={globalDari}
          onDariChange={setGlobalDari}
          sampai={globalSampai}
          onSampaiChange={setGlobalSampai}
          color="melon"
        />
      </div>

      {/* Summary Totals */}
      {!loading && filteredItems.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Grand total */}
          <div className="bg-gradient-to-br from-melon-600 to-melon-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-white/60 font-medium">Total Hutang ({filteredItems.length} transaksi)</p>
                <p className="text-xl font-bold text-white">{formatRupiah(grandTotal.harga)}</p>
                <p className="text-xs text-white/80">{formatKg(grandTotal.kg)}</p>
                <div className="flex gap-4 pt-2 border-t border-white/20 mt-2">
                  <div>
                    <span className="text-[10px] text-white/60 block">Sudah Dibayar</span>
                    <span className="text-xs font-semibold text-white">✓ {formatRupiah(grandTotal.dibayar)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/60 block">Belum Dibayar</span>
                    <span className="text-xs font-semibold text-white">⏳ {formatRupiah(grandTotal.sisa)}</span>
                  </div>
                </div>
              </div>
              <span className="text-3xl opacity-80">📦</span>
            </div>
          </div>

          {/* Per-pengirim breakdown */}
          {pengirimTotals.length > 0 && (
            <div className="bg-surface-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-text-muted font-medium">Rekap per Pengirim</p>
              </div>
              <div className="divide-y divide-border">
                {pengirimTotals.map((p) => {
                  const sisaBayar = p.totalHarga - p.totalDibayar;
                  const lunas = sisaBayar <= 0;
                  return (
                    <div key={p.nama} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{p.nama}</p>
                          <p className="text-xs text-text-muted">{p.count}x · {formatKg(p.totalKg)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-text-primary">{formatRupiah(p.totalHarga)}</p>
                          <div className="flex gap-1">
                            {(() => {
                              const pengirim = pengirimList.find(pl => pl.nama === p.nama);
                              const hasToken = !!pengirim?.share_token;
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasToken) {
                                      const link = `${window.location.origin}/p/${pengirim.share_token}`;
                                      navigator.clipboard.writeText(link);
                                      alert('Link berhasil disalin:\n' + link);
                                    } else {
                                      alert(`Pengirim "${p.nama}" belum punya link akses.\nCoba tambahkan transaksi baru untuk pengirim ini agar token dibuat otomatis.`);
                                    }
                                  }} 
                                  className={`p-2 rounded-lg transition-colors ${hasToken ? 'hover:bg-indigo-500/10 text-text-muted hover:text-indigo-400' : 'hover:bg-surface-elevated text-text-muted/40'}`}
                                  title={hasToken ? 'Salin Link Akses Pengirim' : 'Link belum tersedia'}
                                >
                                  🔗
                                </button>
                              );
                            })()}
                            <button onClick={() => navigate(`/barang-masuk/bayar/${encodeURIComponent(p.nama)}`)} className="p-2 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors" title="Bayar Tagihan">💳</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-melon-400">✓ Dibayar: {formatRupiah(p.totalDibayar)}</span>
                          {!lunas && <span className="text-xs text-amber-400">⏳ Sisa: {formatRupiah(sisaBayar)}</span>}
                          {lunas && <span className="text-xs text-melon-400 bg-melon-500/10 px-2 py-0.5 rounded-full font-bold">Lunas</span>}
                        </div>
                        <button 
                          onClick={() => setExpandedPengirim(expandedPengirim === p.nama ? null : p.nama)}
                          className="text-[10px] text-melon-500 hover:bg-melon-50 font-medium px-2 py-1 border border-melon-100 rounded-lg transition-colors"
                        >
                          {expandedPengirim === p.nama ? 'Tutup Detail' : 'Lihat Detail'}
                        </button>
                      </div>
                      
                      {/* Expanded Transaction Details */}
                      {expandedPengirim === p.nama && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-slide-down">
                          {p.items.map((item, idx) => (
                            <div key={item.id} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg border border-border">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-text-muted">Trx {p.items.length - idx} • {formatTanggal(item.tanggal)}</span>
                                <span className="text-xs font-medium text-text-primary">{formatKg(item.kg)}</span>
                              </div>
                              <span className="text-xs font-bold text-text-primary">{formatRupiah(item.harga)}</span>
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-card rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-elevated rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl mb-4 block">📦</span>
          <p className="text-text-muted">Data stok masuk tidak ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const sisa = parseFloat(item.sisa_bayar);
            const lunas = sisa <= 0;
            return (
              <div key={item.id} className={`bg-surface-card rounded-2xl p-4 border transition-colors ${lunas ? 'border-melon-500/30' : 'border-border hover:border-melon-500/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => navigate(`/barang-masuk/bayar/${encodeURIComponent(item.nama_pengirim)}`)} role="button">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-surface-elevated text-text-secondary px-2.5 py-1 rounded-full">{item.nama_pengirim}</span>
                      {lunas && <span className="text-xs bg-melon-500/15 text-melon-400 px-2 py-0.5 rounded-full font-bold">✓ Lunas</span>}
                      <span className="text-xs text-text-muted">{formatTanggal(item.tanggal)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mt-1">
                      <span className="text-text-primary font-medium">{formatKg(item.kg)}</span>
                      <span className="text-melon-400 font-bold">{formatRupiah(item.harga)}</span>
                    </div>
                    {!lunas && (
                      <p className="text-xs text-amber-400 mt-1">Sisa: {formatRupiah(sisa)}</p>
                    )}
                    {item.gambar?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-2" onClick={e => e.stopPropagation()}>
                        {item.gambar.map((g, i) => (
                          <img key={i} src={g} alt={`Nota ${i+1}`} className="h-16 w-16 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80" onClick={() => setPreviewImage(g)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => navigate(`/barang-masuk/bayar/${encodeURIComponent(item.nama_pengirim)}`)} className="p-2 rounded-lg hover:bg-melon-500/10 text-text-muted hover:text-melon-400 transition-colors" title="Bayar">💳</button>
                    <button onClick={() => navigate(`/barang-masuk/${item.id}/edit`, { state: { item } })} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-watermelon-500/10 text-text-muted hover:text-watermelon-400 transition-colors">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 bg-surface p-2 rounded-full text-text-primary">✕</button>
        </div>
      )}
      <Outlet context={{ onSuccess: () => { fetchData(); fetchPengirimList(); } }} />
    </div>
  );
}
