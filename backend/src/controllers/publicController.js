const pool = require('../config/db');

// GET /api/public/pengirim/:token
const getPengirimByToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Validate UUID format roughly
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(token)) {
      return res.status(400).json({ error: 'Token tidak valid' });
    }

    const pengirimResult = await pool.query('SELECT id, nama, share_token, telepon FROM pengirim WHERE share_token = $1', [token]);
    if (pengirimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Link tidak ditemukan atau tidak valid' });
    }

    const pengirim = pengirimResult.rows[0];
    const nama = pengirim.nama;

    // Get summary and unpaid details similar to getPembayaranPengirim
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(bm.harga), 0) AS total_harga,
        (
          SELECT COALESCE(SUM(pbm.jumlah_bayar), 0)
          FROM pembayaran_barang_masuk pbm
          JOIN barang_masuk bm2 ON pbm.barang_masuk_id = bm2.id
          WHERE bm2.pengirim_id = $1 AND bm2.deleted_at IS NULL
        ) AS total_dibayar
      FROM barang_masuk bm
      WHERE bm.pengirim_id = $1 AND bm.deleted_at IS NULL
    `;
    const summary = await pool.query(summaryQuery, [pengirim.id]);

    const historyQuery = `
      SELECT pbm.id, pbm.tanggal_bayar, pbm.jumlah_bayar, pbm.created_at
      FROM pembayaran_barang_masuk pbm
      JOIN barang_masuk bm ON pbm.barang_masuk_id = bm.id
      WHERE bm.pengirim_id = $1 AND bm.deleted_at IS NULL
      ORDER BY pbm.tanggal_bayar DESC, pbm.created_at DESC
    `;
    const payments = await pool.query(historyQuery, [pengirim.id]);

    const unpaidQuery = `
      SELECT bm.id, bm.tanggal, bm.kg, bm.harga, 
        COALESCE(SUM(pbm.jumlah_bayar), 0) AS total_dibayar,
        bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) AS sisa_bayar
      FROM barang_masuk bm
      LEFT JOIN pembayaran_barang_masuk pbm ON pbm.barang_masuk_id = bm.id
      WHERE bm.pengirim_id = $1 AND bm.deleted_at IS NULL
      GROUP BY bm.id
      HAVING bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) > 0
      ORDER BY bm.tanggal ASC, bm.created_at ASC
    `;
    const unpaid = await pool.query(unpaidQuery, [pengirim.id]);

    const allTrxQuery = `
      SELECT bm.id, bm.tanggal, bm.kg, bm.harga, bm.gambar,
        COALESCE(SUM(pbm.jumlah_bayar), 0) AS total_dibayar,
        bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) AS sisa_bayar
      FROM barang_masuk bm
      LEFT JOIN pembayaran_barang_masuk pbm ON pbm.barang_masuk_id = bm.id
      WHERE bm.pengirim_id = $1 AND bm.deleted_at IS NULL
      GROUP BY bm.id
      ORDER BY bm.tanggal DESC, bm.created_at DESC
    `;
    const allTrx = await pool.query(allTrxQuery, [pengirim.id]);

    const totalHarga = parseFloat(summary.rows[0].total_harga);
    const totalDibayar = parseFloat(summary.rows[0].total_dibayar);

    res.json({
      pengirim: pengirim,
      total_hutang: totalHarga,
      total_dibayar: totalDibayar,
      sisa_tagihan: totalHarga - totalDibayar,
      riwayat_pembayaran: payments.rows,
      rincian_belum_lunas: unpaid.rows,
      semua_transaksi: allTrx.rows
    });

  } catch (err) {
    console.error('Error getPengirimByToken:', err);
    res.status(500).json({ error: 'Gagal mengambil data dari link' });
  }
};

// GET /api/public/pelanggan/:token
const getPelangganByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(token)) {
      return res.status(400).json({ error: 'Token tidak valid' });
    }

    const pelangganResult = await pool.query('SELECT id, nama, share_token, telepon FROM pelanggan WHERE share_token = $1', [token]);
    if (pelangganResult.rows.length === 0) {
      return res.status(404).json({ error: 'Link tidak ditemukan atau tidak valid' });
    }

    const pelanggan = pelangganResult.rows[0];

    const summaryQuery = `
      SELECT 
        COALESCE(SUM(hp.jumlah_total), 0) AS total_piutang,
        COALESCE(SUM(hp.kg), 0) AS total_kg_piutang,
        (
          SELECT COALESCE(SUM(p.jumlah_bayar), 0)
          FROM pembayaran p
          JOIN hutang_piutang hp2 ON p.hutang_piutang_id = hp2.id
          WHERE hp2.pelanggan_id = $1 AND hp2.tipe = 'piutang' AND hp2.deleted_at IS NULL
        ) AS total_dibayar,
        (
          SELECT COALESCE(SUM(p.kg_bayar), 0)
          FROM pembayaran p
          JOIN hutang_piutang hp2 ON p.hutang_piutang_id = hp2.id
          WHERE hp2.pelanggan_id = $1 AND hp2.tipe = 'piutang' AND hp2.deleted_at IS NULL
        ) AS total_kg_dibayar
      FROM hutang_piutang hp
      WHERE hp.pelanggan_id = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
    `;
    const summary = await pool.query(summaryQuery, [pelanggan.id]);

    const historyQuery = `
      SELECT p.id, p.tanggal_bayar, p.jumlah_bayar, p.kg_bayar, p.created_at
      FROM pembayaran p
      JOIN hutang_piutang hp ON p.hutang_piutang_id = hp.id
      WHERE hp.pelanggan_id = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
      ORDER BY p.tanggal_bayar DESC, p.created_at DESC
    `;
    const payments = await pool.query(historyQuery, [pelanggan.id]);

    const allTrxQuery = `
      SELECT hp.id, hp.tanggal, hp.kg, hp.jumlah_total, hp.keterangan,
        COALESCE(SUM(p.jumlah_bayar), 0) AS total_dibayar,
        hp.jumlah_total - COALESCE(SUM(p.jumlah_bayar), 0) AS sisa_bayar
      FROM hutang_piutang hp
      LEFT JOIN pembayaran p ON p.hutang_piutang_id = hp.id
      WHERE hp.pelanggan_id = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
      GROUP BY hp.id
      ORDER BY hp.tanggal DESC, hp.created_at DESC
    `;
    const allTrx = await pool.query(allTrxQuery, [pelanggan.id]);

    const totalPiutang = parseFloat(summary.rows[0].total_piutang);
    const totalDibayar = parseFloat(summary.rows[0].total_dibayar);
    const totalKgPiutang = parseFloat(summary.rows[0].total_kg_piutang);
    const totalKgDibayar = parseFloat(summary.rows[0].total_kg_dibayar);

    res.json({
      pelanggan: pelanggan,
      total_piutang: totalPiutang,
      total_dibayar: totalDibayar,
      total_kg_piutang: totalKgPiutang,
      total_kg_dibayar: totalKgDibayar,
      sisa_tagihan: totalPiutang - totalDibayar,
      sisa_kg: totalKgPiutang - totalKgDibayar,
      riwayat_pembayaran: payments.rows,
      semua_transaksi: allTrx.rows
    });

  } catch (err) {
    console.error('Error getPelangganByToken:', err);
    res.status(500).json({ error: 'Gagal mengambil data dari link' });
  }
};

module.exports = { getPengirimByToken, getPelangganByToken };
