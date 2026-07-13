const pool = require('../config/db');

// GET /api/barang-masuk
const getAll = async (req, res) => {
  try {
    const { dari, sampai } = req.query;
    let query = 'SELECT * FROM barang_masuk';
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
    console.error('Error getAll barang_masuk:', err);
    res.status(500).json({ error: 'Gagal mengambil data barang masuk' });
  }
};

// POST /api/barang-masuk
const create = async (req, res) => {
  try {
    const { tanggal, kg, nama_pengirim, harga } = req.body;
    if (!tanggal || !kg || !nama_pengirim || harga === undefined) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    const result = await pool.query(
      'INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, harga) VALUES ($1, $2, $3, $4) RETURNING *',
      [tanggal, kg, nama_pengirim, harga]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error create barang_masuk:', err);
    res.status(500).json({ error: 'Gagal menambah barang masuk' });
  }
};

// PUT /api/barang-masuk/:id
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, kg, nama_pengirim, harga } = req.body;
    const result = await pool.query(
      'UPDATE barang_masuk SET tanggal=$1, kg=$2, nama_pengirim=$3, harga=$4 WHERE id=$5 RETURNING *',
      [tanggal, kg, nama_pengirim, harga, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error update barang_masuk:', err);
    res.status(500).json({ error: 'Gagal mengupdate barang masuk' });
  }
};

// DELETE /api/barang-masuk/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM barang_masuk WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    console.error('Error delete barang_masuk:', err);
    res.status(500).json({ error: 'Gagal menghapus barang masuk' });
  }
};

// GET /api/barang-masuk/pengirim — Unique sender names for autocomplete
const getPengirimList = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT nama_pengirim FROM barang_masuk ORDER BY nama_pengirim ASC'
    );
    res.json(result.rows.map(r => r.nama_pengirim));
  } catch (err) {
    console.error('Error getPengirimList:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar pengirim' });
  }
};

module.exports = { getAll, create, update, remove, getPengirimList };
