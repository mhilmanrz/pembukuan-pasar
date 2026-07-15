const pool = require('../config/db');

// GET /api/laporan?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
const getLaporan = async (req, res) => {
  try {
    const { dari, sampai } = req.query;
    
    // Build date filter conditions
    let dateFilterBM = '';
    let dateFilterPJ = '';
    let dateFilterHP = '';
    const paramsBM = [];
    const paramsPJ = [];
    const paramsHP = [];
    
    if (dari && sampai) {
      dateFilterBM = 'WHERE deleted_at IS NULL AND tanggal BETWEEN $1 AND $2';
      paramsBM.push(dari, sampai);
      dateFilterPJ = 'WHERE deleted_at IS NULL AND tanggal BETWEEN $1 AND $2';
      paramsPJ.push(dari, sampai);
      dateFilterHP = 'WHERE deleted_at IS NULL AND tanggal BETWEEN $1 AND $2';
      paramsHP.push(dari, sampai);
    } else if (dari) {
      dateFilterBM = 'WHERE deleted_at IS NULL AND tanggal >= $1';
      paramsBM.push(dari);
      dateFilterPJ = 'WHERE deleted_at IS NULL AND tanggal >= $1';
      paramsPJ.push(dari);
      dateFilterHP = 'WHERE deleted_at IS NULL AND tanggal >= $1';
      paramsHP.push(dari);
    } else if (sampai) {
      dateFilterBM = 'WHERE deleted_at IS NULL AND tanggal <= $1';
      paramsBM.push(sampai);
      dateFilterPJ = 'WHERE deleted_at IS NULL AND tanggal <= $1';
      paramsPJ.push(sampai);
      dateFilterHP = 'WHERE deleted_at IS NULL AND tanggal <= $1';
      paramsHP.push(sampai);
    } else {
      dateFilterBM = 'WHERE deleted_at IS NULL';
      dateFilterPJ = 'WHERE deleted_at IS NULL';
      dateFilterHP = 'WHERE deleted_at IS NULL';
    }

    // Total kg barang masuk & total harga (modal)
    const totalBarangMasuk = await pool.query(
      `SELECT COALESCE(SUM(kg), 0) AS total, COALESCE(SUM(harga), 0) AS total_harga FROM barang_masuk ${dateFilterBM}`, paramsBM
    );

    // Total kg terjual
    const totalKgTerjual = await pool.query(
      `SELECT COALESCE(SUM(kg_terjual), 0) AS total FROM penjualan ${dateFilterPJ}`, paramsPJ
    );

    // Total uang penjualan
    const totalUangPenjualan = await pool.query(
      `SELECT COALESCE(SUM(total_uang), 0) AS total FROM penjualan ${dateFilterPJ}`, paramsPJ
    );

    // Hutang (kg & jumlah_total)
    const hutangData = await pool.query(
      `SELECT COALESCE(SUM(kg), 0) AS total_kg, COALESCE(SUM(jumlah_total), 0) AS total_jumlah 
       FROM hutang_piutang ${dateFilterHP ? dateFilterHP + " AND tipe='hutang'" : "WHERE tipe='hutang'"}`,
      paramsHP
    );

    // Piutang (kg & jumlah_total)
    const piutangData = await pool.query(
      `SELECT COALESCE(SUM(kg), 0) AS total_kg, COALESCE(SUM(jumlah_total), 0) AS total_jumlah 
       FROM hutang_piutang ${dateFilterHP ? dateFilterHP + " AND tipe='piutang'" : "WHERE tipe='piutang'"}`,
      paramsHP
    );

    // Total pembayaran terkait piutang (dalam rentang tanggal hutang_piutang)
    const pembayaranPiutang = await pool.query(
      `SELECT COALESCE(SUM(p.jumlah_bayar), 0) AS total 
       FROM pembayaran p 
       JOIN hutang_piutang hp ON p.hutang_piutang_id = hp.id 
       WHERE hp.tipe = 'piutang' AND hp.deleted_at IS NULL${dari && sampai ? ' AND hp.tanggal BETWEEN $1 AND $2' : dari ? ' AND hp.tanggal >= $1' : sampai ? ' AND hp.tanggal <= $1' : ''}`,
      dari && sampai ? [dari, sampai] : dari ? [dari] : sampai ? [sampai] : []
    );

    // Total pembayaran terkait hutang
    const pembayaranHutang = await pool.query(
      `SELECT COALESCE(SUM(p.jumlah_bayar), 0) AS total 
       FROM pembayaran p 
       JOIN hutang_piutang hp ON p.hutang_piutang_id = hp.id 
       WHERE hp.tipe = 'hutang' AND hp.deleted_at IS NULL${dari && sampai ? ' AND hp.tanggal BETWEEN $1 AND $2' : dari ? ' AND hp.tanggal >= $1' : sampai ? ' AND hp.tanggal <= $1' : ''}`,
      dari && sampai ? [dari, sampai] : dari ? [dari] : sampai ? [sampai] : []
    );

    // Total pembayaran terkait barang masuk (cicilan modal)
    const pembayaranBM = await pool.query(
      `SELECT COALESCE(SUM(pbm.jumlah_bayar), 0) AS total 
       FROM pembayaran_barang_masuk pbm 
       JOIN barang_masuk bm ON pbm.barang_masuk_id = bm.id 
       WHERE bm.deleted_at IS NULL${dari && sampai ? ' AND bm.tanggal BETWEEN $1 AND $2' : dari ? ' AND bm.tanggal >= $1' : sampai ? ' AND bm.tanggal <= $1' : ''}`,
      dari && sampai ? [dari, sampai] : dari ? [dari] : sampai ? [sampai] : []
    );

    const kgBarangMasuk = parseFloat(totalBarangMasuk.rows[0].total);
    const totalHargaBarangMasuk = parseFloat(totalBarangMasuk.rows[0].total_harga);
    const kgHutang = parseFloat(hutangData.rows[0].total_kg);
    const kgTerjual = parseFloat(totalKgTerjual.rows[0].total);
    const kgPiutang = parseFloat(piutangData.rows[0].total_kg);
    const uangPenjualan = parseFloat(totalUangPenjualan.rows[0].total);
    const jumlahPiutang = parseFloat(piutangData.rows[0].total_jumlah);
    const jumlahHutang = parseFloat(hutangData.rows[0].total_jumlah);
    const dibayarPiutang = parseFloat(pembayaranPiutang.rows[0].total);
    const dibayarHutang = parseFloat(pembayaranHutang.rows[0].total);
    const dibayarBM = parseFloat(pembayaranBM.rows[0].total);

    // Formulas from spec
    // kgPiutang is just a note, doesn't reduce stock
    const sisaStok = (kgBarangMasuk + kgHutang) - kgTerjual;
    const omzet = uangPenjualan + jumlahPiutang;
    const modal = totalHargaBarangMasuk;
    const keuntungan = omzet - modal;
    const kasDiterima = uangPenjualan + dibayarPiutang;
    const piutangBelumTertagih = jumlahPiutang - dibayarPiutang;
    const hutangBelumDibayar = (jumlahHutang - dibayarHutang) + (totalHargaBarangMasuk - dibayarBM);

    res.json({
      sisa_stok_kg: sisaStok,
      omzet,
      modal,
      keuntungan,
      kas_diterima: kasDiterima,
      piutang_belum_tertagih: piutangBelumTertagih,
      hutang_belum_dibayar: hutangBelumDibayar,
      // Detail breakdown
      detail: {
        total_kg_masuk: kgBarangMasuk,
        total_kg_hutang: kgHutang,
        total_kg_terjual: kgTerjual,
        total_kg_piutang: kgPiutang,
        total_uang_penjualan: uangPenjualan,
        total_jumlah_piutang: jumlahPiutang,
        total_jumlah_hutang: jumlahHutang,
        total_dibayar_piutang: dibayarPiutang,
        total_dibayar_hutang: dibayarHutang,
        total_dibayar_barang_masuk: dibayarBM,
        total_harga_barang_masuk: totalHargaBarangMasuk,
      },
    });
  } catch (err) {
    console.error('Error getLaporan:', err);
    res.status(500).json({ error: 'Gagal mengambil laporan' });
  }
};

// GET /api/laporan/grafik?periode=mingguan|bulanan|tahunan
const getGrafikPenjualan = async (req, res) => {
  try {
    const { periode = 'mingguan' } = req.query;

    let query;
    if (periode === 'mingguan') {
      // Last 12 weeks
      query = `
        SELECT 
          TO_CHAR(DATE_TRUNC('week', tanggal), 'DD Mon') AS label,
          DATE_TRUNC('week', tanggal) AS period_start,
          COALESCE(SUM(total_uang), 0) AS total_penjualan,
          COALESCE(SUM(kg_terjual), 0) AS total_kg
        FROM penjualan
        WHERE deleted_at IS NULL AND tanggal >= CURRENT_DATE - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', tanggal)
        ORDER BY period_start ASC
      `;
    } else if (periode === 'bulanan') {
      // Last 12 months
      query = `
        SELECT 
          TO_CHAR(DATE_TRUNC('month', tanggal), 'Mon YYYY') AS label,
          DATE_TRUNC('month', tanggal) AS period_start,
          COALESCE(SUM(total_uang), 0) AS total_penjualan,
          COALESCE(SUM(kg_terjual), 0) AS total_kg
        FROM penjualan
        WHERE deleted_at IS NULL AND tanggal >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', tanggal)
        ORDER BY period_start ASC
      `;
    } else if (periode === 'tahunan') {
      // All years
      query = `
        SELECT 
          TO_CHAR(DATE_TRUNC('year', tanggal), 'YYYY') AS label,
          DATE_TRUNC('year', tanggal) AS period_start,
          COALESCE(SUM(total_uang), 0) AS total_penjualan,
          COALESCE(SUM(kg_terjual), 0) AS total_kg
        FROM penjualan
        WHERE deleted_at IS NULL
        GROUP BY DATE_TRUNC('year', tanggal)
        ORDER BY period_start ASC
      `;
    } else {
      return res.status(400).json({ error: 'Periode harus: mingguan, bulanan, atau tahunan' });
    }

    const result = await pool.query(query);
    res.json(result.rows.map(row => ({
      label: row.label.trim(),
      total_penjualan: parseFloat(row.total_penjualan),
      total_kg: parseFloat(row.total_kg),
    })));
  } catch (err) {
    console.error('Error getGrafikPenjualan:', err);
    res.status(500).json({ error: 'Gagal mengambil data grafik' });
  }
};

module.exports = { getLaporan, getGrafikPenjualan };
