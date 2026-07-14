const pool = require('../config/db');

// GET /api/barang-masuk
const getAll = async (req, res) => {
  try {
    const { dari, sampai } = req.query;
    let query = `
      SELECT bm.*, 
        COALESCE(SUM(pbm.jumlah_bayar), 0) AS total_dibayar,
        bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) AS sisa_bayar
      FROM barang_masuk bm
      LEFT JOIN pembayaran_barang_masuk pbm ON pbm.barang_masuk_id = bm.id
    `;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (dari && sampai) {
      conditions.push(`bm.tanggal BETWEEN $${paramIndex++} AND $${paramIndex++}`);
      params.push(dari, sampai);
    } else if (dari) {
      conditions.push(`bm.tanggal >= $${paramIndex++}`);
      params.push(dari);
    } else if (sampai) {
      conditions.push(`bm.tanggal <= $${paramIndex++}`);
      params.push(sampai);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY bm.id ORDER BY bm.tanggal DESC, bm.created_at DESC';
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
    const { tanggal, kg, nama_pengirim, harga, sudah_dibayar } = req.body;
    if (!tanggal || !kg || !nama_pengirim || harga === undefined) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, harga) VALUES ($1, $2, $3, $4) RETURNING *',
        [tanggal, kg, nama_pengirim, harga]
      );
      const barangMasuk = result.rows[0];

      // If initial payment provided, record it
      const initialPayment = parseFloat(sudah_dibayar) || 0;
      if (initialPayment > 0) {
        if (initialPayment > parseFloat(harga)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Jumlah bayar melebihi harga' });
        }
        await client.query(
          'INSERT INTO pembayaran_barang_masuk (barang_masuk_id, tanggal_bayar, jumlah_bayar) VALUES ($1, $2, $3)',
          [barangMasuk.id, tanggal, initialPayment]
        );
      }

      await client.query('COMMIT');

      // Return with payment info
      barangMasuk.total_dibayar = initialPayment;
      barangMasuk.sisa_bayar = parseFloat(harga) - initialPayment;
      res.status(201).json(barangMasuk);
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    } finally {
      client.release();
    }
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

// POST /api/barang-masuk/:id/bayar — Add installment payment
const addPembayaran = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal_bayar, jumlah_bayar } = req.body;

    if (!tanggal_bayar || !jumlah_bayar) {
      return res.status(400).json({ error: 'Tanggal bayar dan jumlah bayar wajib diisi' });
    }

    // Get the barang_masuk record
    const bm = await pool.query('SELECT * FROM barang_masuk WHERE id = $1', [id]);
    if (bm.rows.length === 0) {
      return res.status(404).json({ error: 'Data barang masuk tidak ditemukan' });
    }

    // Check remaining balance
    const paid = await pool.query(
      'SELECT COALESCE(SUM(jumlah_bayar), 0) AS total_paid FROM pembayaran_barang_masuk WHERE barang_masuk_id = $1',
      [id]
    );
    const sisa = parseFloat(bm.rows[0].harga) - parseFloat(paid.rows[0].total_paid);

    if (parseFloat(jumlah_bayar) > sisa) {
      return res.status(400).json({ error: `Jumlah bayar melebihi sisa (${sisa})` });
    }

    const result = await pool.query(
      'INSERT INTO pembayaran_barang_masuk (barang_masuk_id, tanggal_bayar, jumlah_bayar) VALUES ($1, $2, $3) RETURNING *',
      [id, tanggal_bayar, jumlah_bayar]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error addPembayaran barang_masuk:', err);
    res.status(500).json({ error: 'Gagal menambah pembayaran' });
  }
};

// GET /api/barang-masuk/:id/bayar — Get payment history for a barang_masuk record
const getPembayaran = async (req, res) => {
  try {
    const { id } = req.params;

    const bm = await pool.query('SELECT * FROM barang_masuk WHERE id = $1', [id]);
    if (bm.rows.length === 0) {
      return res.status(404).json({ error: 'Data barang masuk tidak ditemukan' });
    }

    const payments = await pool.query(
      'SELECT * FROM pembayaran_barang_masuk WHERE barang_masuk_id = $1 ORDER BY tanggal_bayar DESC, created_at DESC',
      [id]
    );

    const totalDibayar = payments.rows.reduce((sum, p) => sum + parseFloat(p.jumlah_bayar), 0);

    res.json({
      barang_masuk: bm.rows[0],
      pembayaran: payments.rows,
      total_dibayar: totalDibayar,
      sisa: parseFloat(bm.rows[0].harga) - totalDibayar,
    });
  } catch (err) {
    console.error('Error getPembayaran barang_masuk:', err);
    res.status(500).json({ error: 'Gagal mengambil data pembayaran' });
  }
};

module.exports = { getAll, create, update, remove, getPengirimList, addPembayaran, getPembayaran };
