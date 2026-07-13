const pool = require('../config/db');

// POST /api/pembayaran
const create = async (req, res) => {
  try {
    const { hutang_piutang_id, tanggal_bayar, jumlah_bayar } = req.body;
    if (!hutang_piutang_id || !tanggal_bayar || !jumlah_bayar) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Verify hutang_piutang exists
    const hp = await pool.query('SELECT * FROM hutang_piutang WHERE id = $1', [hutang_piutang_id]);
    if (hp.rows.length === 0) {
      return res.status(404).json({ error: 'Data hutang/piutang tidak ditemukan' });
    }

    // Check remaining balance
    const paid = await pool.query(
      'SELECT COALESCE(SUM(jumlah_bayar), 0) AS total_paid FROM pembayaran WHERE hutang_piutang_id = $1',
      [hutang_piutang_id]
    );
    const sisa = parseFloat(hp.rows[0].jumlah_total) - parseFloat(paid.rows[0].total_paid);
    if (parseFloat(jumlah_bayar) > sisa) {
      return res.status(400).json({ error: `Jumlah bayar melebihi sisa (Rp ${sisa.toLocaleString('id-ID')})` });
    }

    const result = await pool.query(
      'INSERT INTO pembayaran (hutang_piutang_id, tanggal_bayar, jumlah_bayar) VALUES ($1, $2, $3) RETURNING *',
      [hutang_piutang_id, tanggal_bayar, jumlah_bayar]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error create pembayaran:', err);
    res.status(500).json({ error: 'Gagal menambah pembayaran' });
  }
};

// GET /api/pembayaran/:hutangPiutangId
const getByHutangPiutang = async (req, res) => {
  try {
    const { hutangPiutangId } = req.params;

    // Get hutang_piutang info
    const hp = await pool.query('SELECT * FROM hutang_piutang WHERE id = $1', [hutangPiutangId]);
    if (hp.rows.length === 0) {
      return res.status(404).json({ error: 'Data hutang/piutang tidak ditemukan' });
    }

    // Get all payments
    const payments = await pool.query(
      'SELECT * FROM pembayaran WHERE hutang_piutang_id = $1 ORDER BY tanggal_bayar DESC, created_at DESC',
      [hutangPiutangId]
    );

    const totalDibayar = payments.rows.reduce((sum, p) => sum + parseFloat(p.jumlah_bayar), 0);

    res.json({
      hutang_piutang: hp.rows[0],
      pembayaran: payments.rows,
      total_dibayar: totalDibayar,
      sisa: parseFloat(hp.rows[0].jumlah_total) - totalDibayar,
    });
  } catch (err) {
    console.error('Error getByHutangPiutang:', err);
    res.status(500).json({ error: 'Gagal mengambil data pembayaran' });
  }
};

module.exports = { create, getByHutangPiutang };
