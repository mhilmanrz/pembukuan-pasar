import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPeriodeAktif, getPeriodeAll, bukaBuku as apiBukaBuku, tutupBuku as apiTutupBuku, updatePeriode as apiUpdatePeriode, deletePeriode as apiDeletePeriode } from '../services/api';
import { useAuth } from './AuthContext';
import { startOfMonthStr, todayStr } from '../utils/format';

const PeriodeContext = createContext(null);

export function PeriodeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [periodeAktif, setPeriodeAktif] = useState(null);
  const [periodeList, setPeriodeList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global Filter State
  const [globalFilter, setGlobalFilter] = useState('bulan-ini');
  const [globalDari, setGlobalDari] = useState(startOfMonthStr());
  const [globalSampai, setGlobalSampai] = useState(todayStr());

  const fetchPeriode = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [aktifRes, allRes] = await Promise.all([
        getPeriodeAktif(),
        getPeriodeAll(),
      ]);
      setPeriodeAktif(aktifRes.data);
      setPeriodeList(allRes.data);
      // Auto-set filter to active period if present and current filter is default
      if (aktifRes.data && globalFilter === 'bulan-ini') {
        setGlobalFilter('periode-ini');
      }
    } catch (err) {
      console.error('Gagal memuat periode:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPeriode();
  }, [fetchPeriode]);

  const bukaBuku = async (data) => {
    await apiBukaBuku(data);
    await fetchPeriode();
  };

  const tutupBuku = async (data) => {
    await apiTutupBuku(data);
    await fetchPeriode();
  };

  const updatePeriode = async (id, data) => {
    await apiUpdatePeriode(id, data);
    await fetchPeriode();
  };

  const deletePeriode = async (id) => {
    await apiDeletePeriode(id);
    await fetchPeriode();
  };

  const value = {
    periodeAktif,
    periodeList,
    loading,
    refreshPeriode: fetchPeriode,
    bukaBuku,
    tutupBuku,
    updatePeriode,
    deletePeriode,
    // Filter
    globalFilter,
    setGlobalFilter,
    globalDari,
    setGlobalDari,
    globalSampai,
    setGlobalSampai,
  };

  return (
    <PeriodeContext.Provider value={value}>
      {children}
    </PeriodeContext.Provider>
  );
}

export function usePeriode() {
  const context = useContext(PeriodeContext);
  if (!context) {
    throw new Error('usePeriode must be used within a PeriodeProvider');
  }
  return context;
}
