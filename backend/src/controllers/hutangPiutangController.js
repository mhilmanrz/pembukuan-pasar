const pool = require('../config/db');

// GET /api/hutang-piutang
const getAll = async (req, res) => {
  try {
    const { tipe, dari, sampai } = req.query;
    let query = `
      SELECT hp.*, 
        COALESCE(SUM(p.jumlah_bayar), 0) AS total_dibayar,
        hp.jumlah_total - COALESCE(SUM(p.jumlah_bayar), 0) AS sisa
      FROM hutang_piutang hp
      LEFT JOIN pembayaran p ON p.hutang_piutang_id = hp.id
    `;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tipe) {
      conditions.push(`hp.tipe = $${paramIndex++}`);
      params.push(tipe);
    }
    if (dari && sampai) {
      conditions.push(`hp.tanggal BETWEEN $${paramIndex++} AND $${paramIndex++}`);
      params.push(dari, sampai);
    } else if (dari) {
      conditions.push(`hp.tanggal >= $${paramIndex++}`);
      params.push(dari);
    } else if (sampai) {
      conditions.push(`hp.tanggal <= $${paramIndex++}`);
      params.push(sampai);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY hp.id ORDER BY hp.tanggal DESC, hp.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getAll hutang_piutang:', err);
    res.status(500).json({ error: 'Gagal mengambil data hutang/piutang' });
  }
};

// POST /api/hutang-piutang
const create = async (req, res) => {
  try {
    const { tipe, tanggal, nama, kg, jumlah_total, keterangan } = req.body;
    if (!tipe || !tanggal || !nama || jumlah_total === undefined) {
      return res.status(400).json({ error: 'Field tipe, tanggal, nama, dan jumlah_total wajib diisi' });
    }
    if (!['hutang', 'piutang'].includes(tipe)) {
      return res.status(400).json({ error: 'Tipe harus hutang atau piutang' });
    }
    const result = await pool.query(
      'INSERT INTO hutang_piutang (tipe, tanggal, nama, kg, jumlah_total, keterangan) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [tipe, tanggal, nama, kg || null, jumlah_total, keterangan || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error create hutang_piutang:', err);
    res.status(500).json({ error: 'Gagal menambah hutang/piutang' });
  }
};

// PUT /api/hutang-piutang/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipe, tanggal, nama, kg, jumlah_total, keterangan } = req.body;
    if (tipe && !['hutang', 'piutang'].includes(tipe)) {
      return res.status(400).json({ error: 'Tipe harus hutang atau piutang' });
    }
    const result = await pool.query(
      'UPDATE hutang_piutang SET tipe=$1, tanggal=$2, nama=$3, kg=$4, jumlah_total=$5, keterangan=$6 WHERE id=$7 RETURNING *',
      [tipe, tanggal, nama, kg || null, jumlah_total, keterangan || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error update hutang_piutang:', err);
    res.status(500).json({ error: 'Gagal mengupdate hutang/piutang' });
  }
};

// DELETE /api/hutang-piutang/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM hutang_piutang WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    console.error('Error delete hutang_piutang:', err);
    res.status(500).json({ error: 'Gagal menghapus hutang/piutang' });
  }
};

module.exports = { getAll, create, update, remove };
