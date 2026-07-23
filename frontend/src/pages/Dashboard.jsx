import { useState, useEffect } from 'react';
import { getLaporan, getGrafikPenjualan } from '../services/api';
import { formatRupiah, formatKg, todayStr } from '../utils/format';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

const cards = [
  { key: 'sisa_stok_kg', label: 'Sisa Stok', icon: '🍉', format: formatKg, color: 'from-melon-600 to-melon-800' },
  { key: 'omzet', label: 'Omzet', icon: '📈', format: formatRupiah, color: 'from-watermelon-600 to-watermelon-800' },
  { key: 'modal', label: 'Modal', icon: '💰', format: formatRupiah, color: 'from-indigo-600 to-indigo-800' },
  { key: 'keuntungan', label: 'Keuntungan', icon: '📊', format: formatRupiah, color: 'from-teal-600 to-teal-800' },
  { key: 'kas_diterima', label: 'Kas Diterima', icon: '💵', format: formatRupiah, color: 'from-emerald-600 to-emerald-800' },
  { key: 'piutang_belum_tertagih', label: 'Piutang Belum Tertagih', icon: '📤', format: formatRupiah, color: 'from-amber-600 to-amber-800' },
  { key: 'hutang_belum_dibayar', label: 'Hutang Belum Dibayar', icon: '📥', format: formatRupiah, color: 'from-rose-600 to-rose-800' },
];

const periodeOptions = [
  { val: 'mingguan', label: 'Mingguan' },
  { val: 'bulanan', label: 'Bulanan' },
  { val: 'tahunan', label: 'Tahunan' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-elevated border border-border rounded-xl px-4 py-3 shadow-xl">
        <p className="text-xs text-text-muted mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name === 'total_penjualan'
              ? `Penjualan: ${formatRupiah(entry.value)}`
              : `Terjual: ${formatKg(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('bulan-ini');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState(todayStr());

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [periode, setPeriode] = useState('mingguan');

  useEffect(() => {
    fetchLaporan();
  }, [filter, dari, sampai]);

  useEffect(() => {
    fetchGrafik();
  }, [periode]);

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'hari-ini') {
        params.dari = todayStr();
        params.sampai = todayStr();
      } else if (filter === 'minggu-ini') {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        params.dari = start.toISOString().split('T')[0];
        params.sampai = todayStr();
      } else if (filter === 'bulan-ini') {
        const now = new Date();
        params.dari = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        params.sampai = todayStr();
      } else if (filter === 'custom' && dari && sampai) {
        params.dari = dari;
        params.sampai = sampai;
      }
      const res = await getLaporan(params);
      setData(res.data);
    } catch (err) {
      console.error('Gagal memuat laporan:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrafik = async () => {
    setChartLoading(true);
    try {
      const res = await getGrafikPenjualan({ periode });
      setChartData(res.data);
    } catch (err) {
      console.error('Gagal memuat grafik:', err);
    } finally {
      setChartLoading(false);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Ringkasan pembukuan semangka" 
        action={
          <button
            onClick={logout}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-card border border-border text-text-muted hover:text-watermelon-400 hover:bg-watermelon-500/10 transition-colors"
            title="Keluar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        }
      />

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
        {[
          { val: 'bulan-ini', label: 'Bulan Ini' },
          { val: 'minggu-ini', label: 'Minggu Ini' },
          { val: 'hari-ini', label: 'Hari Ini' },
          { val: 'semua', label: 'Semua' },
          { val: 'custom', label: 'Custom' },
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setFilter(f.val)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === f.val
                ? 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25'
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'custom' && (
        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">Dari</label>
            <input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-text-muted mb-1 block">Sampai</label>
            <input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="w-full bg-surface-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
            />
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, index) => (
          <div
            key={card.key}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 shadow-lg transition-transform duration-200 active:scale-[0.98] ${index === 0 ? 'col-span-2' : 'col-span-1'}`}
          >
            {index === 0 ? (
              // Layout untuk kartu pertama (Full width)
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loading ? (
                      <span className="inline-block w-24 h-8 bg-white/20 rounded-lg animate-pulse" />
                    ) : (
                      card.format(data?.[card.key] ?? 0)
                    )}
                  </p>
                </div>
                <span className="text-4xl opacity-80">{card.icon}</span>
              </div>
            ) : (
              // Layout untuk kartu lainnya (Setengah lebar)
              <div className="flex flex-col h-full gap-2">
                <span className="text-2xl opacity-80 mb-1">{card.icon}</span>
                <div className="mt-auto">
                  <p className="text-[11px] text-white/80 font-medium leading-tight mb-0.5">{card.label}</p>
                  <p className="text-[15px] sm:text-base font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                    {loading ? (
                      <span className="inline-block w-16 h-5 bg-white/20 rounded-lg animate-pulse" />
                    ) : (
                      card.format(data?.[card.key] ?? 0)
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grafik Penjualan */}
      <div className="mt-8 bg-surface-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">📈 Grafik Penjualan</h2>
        </div>

        {/* Periode selector */}
        <div className="flex gap-2 mb-5">
          {periodeOptions.map((opt) => (
            <button
              key={opt.val}
              onClick={() => setPeriode(opt.val)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                periode === opt.val
                  ? 'bg-watermelon-500 text-white shadow-lg shadow-watermelon-500/25'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {chartLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-watermelon-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted">
            <span className="text-4xl mb-3">📭</span>
            <p className="text-sm">Belum ada data penjualan</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Area Chart - Penjualan (Rupiah) */}
            <div>
              <p className="text-xs text-text-muted mb-3 font-medium">Penjualan (Rp)</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradientPenjualan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total_penjualan"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#gradientPenjualan)"
                    dot={{ r: 4, fill: '#ef4444', stroke: '#1e293b', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart - Kg Terjual */}
            <div>
              <p className="text-xs text-text-muted mb-3 font-medium">Kg Terjual</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="total_kg"
                    fill="#22c55e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
