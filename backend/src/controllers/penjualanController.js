const pool = require('../config/db');

// GET /api/penjualan
const getAll = async (req, res) => {
  try {
    const { dari, sampai } = req.query;
    let query = 'SELECT * FROM penjualan';
    const params = [];

    if (dari && sampai) {
      query += ' WHERE tanggal BETWEEN $1 AND $2';
      params.push(dari, sampai);
    } else if (dari) {
      query += ' WHERE tanggal >= $1';
      params.push(dari);
    } else if (sampai) {
      query += ' WHERE tanggal <= $1';
      params.push(sampai);
    }

    query += ' ORDER BY tanggal DESC, created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error getAll penjualan:', err);
    res.status(500).json({ error: 'Gagal mengambil data penjualan' });
  }
};

// POST /api/penjualan
const create = async (req, res) => {
  try {
    const { tanggal, sesi, kg_terjual, total_uang } = req.body;
    if (!tanggal || !sesi || !kg_terjual || total_uang === undefined) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    if (!['siang', 'malam'].includes(sesi)) {
      return res.status(400).json({ error: 'Sesi harus siang atau malam' });
    }
    const result = await pool.query(
      'INSERT INTO penjualan (tanggal, sesi, kg_terjual, total_uang) VALUES ($1, $2, $3, $4) RETURNING *',
      [tanggal, sesi, kg_terjual, total_uang]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error create penjualan:', err);
    res.status(500).json({ error: 'Gagal menambah penjualan' });
  }
};

// PUT /api/penjualan/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, sesi, kg_terjual, total_uang } = req.body;
    if (sesi && !['siang', 'malam'].includes(sesi)) {
      return res.status(400).json({ error: 'Sesi harus siang atau malam' });
    }
    const result = await pool.query(
      'UPDATE penjualan SET tanggal=$1, sesi=$2, kg_terjual=$3, total_uang=$4 WHERE id=$5 RETURNING *',
      [tanggal, sesi, kg_terjual, total_uang, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error update penjualan:', err);
    res.status(500).json({ error: 'Gagal mengupdate penjualan' });
  }
};

// DELETE /api/penjualan/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM penjualan WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    console.error('Error delete penjualan:', err);
    res.status(500).json({ error: 'Gagal menghapus penjualan' });
  }
};

module.exports = { getAll, create, update, remove };
