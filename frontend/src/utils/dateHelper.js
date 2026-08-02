import { todayStr } from './format';

/**
 * Convert a filter string + custom date range into API query params.
 * Used across BarangMasuk, Penjualan, Piutang, and Dashboard pages.
 *
 * @param {'periode-ini'|'bulan-ini'|'minggu-ini'|'hari-ini'|'semua'|'custom'|'periode-xxx'} filter
 * @param {string} dari - Start date (YYYY-MM-DD), used when filter='custom'
 * @param {string} sampai - End date (YYYY-MM-DD), used when filter='custom'
 * @param {object} periodeAktif - Active period object { tanggal_buka, tanggal_tutup }
 * @param {Array} periodeList - List of all periods for 'periode-xxx' lookup
 * @returns {{ dari?: string, sampai?: string }}
 */
export function getDateParams(filter, dari, sampai, periodeAktif = null, periodeList = []) {
  const now = new Date();
  const today = todayStr();

  // Handle selecting a specific historical period by id: 'periode-123'
  if (filter?.startsWith('periode-') && filter !== 'periode-ini') {
    const periodeId = parseInt(filter.replace('periode-', ''), 10);
    const found = periodeList.find(p => p.id === periodeId);
    if (found) {
      return {
        dari: found.tanggal_buka.split('T')[0],
        sampai: found.tanggal_tutup ? found.tanggal_tutup.split('T')[0] : today,
      };
    }
    return {};
  }

  switch (filter) {
    case 'periode-ini':
      if (periodeAktif?.tanggal_buka) {
        return {
          dari: periodeAktif.tanggal_buka.split('T')[0],
          sampai: today,
        };
      }
      // Fallback to bulan-ini if no active period
      return { dari: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, sampai: today };
    case 'hari-ini':
      return { dari: today, sampai: today };
    case 'minggu-ini': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { dari: start.toISOString().split('T')[0], sampai: today };
    }
    case 'bulan-ini':
      return { dari: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, sampai: today };
    case 'custom':
      return { dari, sampai };
    default:
      return {};
  }
}
