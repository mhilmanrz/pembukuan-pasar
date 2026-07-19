const pool = require('../config/db');

// GET /api/penjualan
const getAll = async (req, res) => {
  try {
    const { dari, sampai, status } = req.query;
    let query = 'SELECT * FROM penjualan WHERE ';
    const conditions = [];
    const params = [];

    if (status === 'deleted') {
      conditions.push('deleted_at IS NOT NULL');
    } else {
      conditions.push('deleted_at IS NULL');
    }

    if (dari && sampai) {
      conditions.push(`tanggal BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(dari, sampai);
    } else if (dari) {
      conditions.push(`tanggal >= $${params.length + 1}`);
      params.push(dari);
    } else if (sampai) {
      conditions.push(`tanggal <= $${params.length + 1}`);
      params.push(sampai);
    }

    query += conditions.join(' AND ');
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
    if (parseFloat(kg_terjual) <= 0) return res.status(400).json({ error: 'Kg terjual harus lebih dari 0' });
    if (parseFloat(total_uang) < 0) return res.status(400).json({ error: 'Total uang tidak boleh negatif' });
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
    if (kg_terjual !== undefined && parseFloat(kg_terjual) <= 0) return res.status(400).json({ error: 'Kg terjual harus lebih dari 0' });
    if (total_uang !== undefined && parseFloat(total_uang) < 0) return res.status(400).json({ error: 'Total uang tidak boleh negatif' });
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
    const result = await pool.query('UPDATE penjualan SET deleted_at = NOW() WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dipindahkan ke tempat sampah' });
  } catch (err) {
    console.error('Error delete penjualan:', err);
    res.status(500).json({ error: 'Gagal menghapus penjualan' });
  }
};

// PUT /api/penjualan/:id/restore
const restore = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE penjualan SET deleted_at = NULL WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dipulihkan' });
  } catch (err) {
    console.error('Error restore penjualan:', err);
    res.status(500).json({ error: 'Gagal memulihkan penjualan' });
  }
};

module.exports = { getAll, create, update, remove, restore };
