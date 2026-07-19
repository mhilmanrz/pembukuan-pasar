import { todayStr } from './format';

/**
 * Convert a filter string + custom date range into API query params.
 * Used across BarangMasuk, Penjualan, and Piutang pages.
 *
 * @param {'bulan-ini'|'minggu-ini'|'hari-ini'|'semua'|'custom'} filter
 * @param {string} dari - Start date (YYYY-MM-DD), used when filter='custom'
 * @param {string} sampai - End date (YYYY-MM-DD), used when filter='custom'
 * @returns {{ dari?: string, sampai?: string }}
 */
export function getDateParams(filter, dari, sampai) {
  const now = new Date();
  const today = todayStr();
  switch (filter) {
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
