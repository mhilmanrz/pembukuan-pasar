import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/barang-masuk', label: 'Stok Masuk', icon: '📦' },
  { to: '/penjualan', label: 'Penjualan', icon: '💰' },
  { to: '/hutang-piutang', label: 'Hutang/Piutang', icon: '📋' },
  { to: '/riwayat', label: 'Riwayat', icon: '📜' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center max-w-lg mx-auto px-1 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive
                  ? 'text-watermelon-400 bg-watermelon-500/10 scale-105'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
