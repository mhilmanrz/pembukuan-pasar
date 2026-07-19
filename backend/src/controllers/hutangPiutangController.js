const pool = require('../config/db');

// GET /api/hutang-piutang
const getAll = async (req, res) => {
  try {
    const { tipe, dari, sampai, status } = req.query;
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

    if (status === 'deleted') {
      conditions.push('hp.deleted_at IS NOT NULL');
    } else {
      conditions.push('hp.deleted_at IS NULL');
    }

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
    const result = await pool.query('UPDATE hutang_piutang SET deleted_at = NOW() WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dipindahkan ke tempat sampah' });
  } catch (err) {
    console.error('Error delete hutang_piutang:', err);
    res.status(500).json({ error: 'Gagal menghapus hutang/piutang' });
  }
};

// PUT /api/hutang-piutang/:id/restore
const restore = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE hutang_piutang SET deleted_at = NULL WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dipulihkan' });
  } catch (err) {
    console.error('Error restore hutang_piutang:', err);
    res.status(500).json({ error: 'Gagal memulihkan hutang/piutang' });
  }
};

// GET /api/hutang-piutang/pelanggan/:nama/bayar
const getPembayaranPelanggan = async (req, res) => {
  try {
    const { nama } = req.params;

    const summaryQuery = `
      SELECT 
        COALESCE(SUM(hp.jumlah_total), 0) AS total_piutang,
        (
          SELECT COALESCE(SUM(p.jumlah_bayar), 0)
          FROM pembayaran p
          JOIN hutang_piutang hp2 ON p.hutang_piutang_id = hp2.id
          WHERE hp2.nama = $1 AND hp2.tipe = 'piutang' AND hp2.deleted_at IS NULL
        ) AS total_dibayar
      FROM hutang_piutang hp
      WHERE hp.nama = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
    `;
    const summary = await pool.query(summaryQuery, [nama]);
    
    // Individual payment records with IDs for editing
    const historyQuery = `
      SELECT p.id, p.tanggal_bayar, p.jumlah_bayar, p.created_at
      FROM pembayaran p
      JOIN hutang_piutang hp ON p.hutang_piutang_id = hp.id
      WHERE hp.nama = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
      ORDER BY p.tanggal_bayar DESC, p.created_at DESC
    `;
    const payments = await pool.query(historyQuery, [nama]);

    const totalPiutang = parseFloat(summary.rows[0].total_piutang);
    const totalDibayar = parseFloat(summary.rows[0].total_dibayar);

    res.json({
      nama_pelanggan: nama,
      pembayaran: payments.rows,
      hutang_piutang: { jumlah_total: totalPiutang },
      total_dibayar: totalDibayar,
      sisa: totalPiutang - totalDibayar,
    });
  } catch (err) {
    console.error('Error getPembayaranPelanggan:', err);
    res.status(500).json({ error: 'Gagal mengambil data pembayaran' });
  }
};

// POST /api/hutang-piutang/pelanggan/:nama/bayar
const addPembayaranPelanggan = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nama } = req.params;
    const { tanggal_bayar, jumlah_bayar } = req.body;
    let paymentLeft = parseFloat(jumlah_bayar);

    if (!tanggal_bayar || !jumlah_bayar || paymentLeft <= 0) {
      return res.status(400).json({ error: 'Data pembayaran tidak valid' });
    }

    await client.query('BEGIN');

    // Get all unpaid for this sender (FIFO)
    const unpaidQuery = `
      SELECT hp.id, hp.jumlah_total, COALESCE(SUM(p.jumlah_bayar), 0) AS total_dibayar
      FROM hutang_piutang hp
      LEFT JOIN pembayaran p ON p.hutang_piutang_id = hp.id
      WHERE hp.nama = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
      GROUP BY hp.id
      HAVING hp.jumlah_total - COALESCE(SUM(p.jumlah_bayar), 0) > 0
      ORDER BY hp.tanggal ASC, hp.created_at ASC
    `;
    const unpaid = await client.query(unpaidQuery, [nama]);

    for (const item of unpaid.rows) {
      if (paymentLeft <= 0) break;
      const sisaTagihan = parseFloat(item.jumlah_total) - parseFloat(item.total_dibayar);
      const toPay = Math.min(sisaTagihan, paymentLeft);
      
      await client.query(
        'INSERT INTO pembayaran (hutang_piutang_id, tanggal_bayar, jumlah_bayar) VALUES ($1, $2, $3)',
        [item.id, tanggal_bayar, toPay]
      );
      paymentLeft -= toPay;
    }

    if (paymentLeft > 0) {
      throw new Error(`Uang berlebih Rp ${paymentLeft.toLocaleString('id-ID')}, tidak ada tagihan untuk dilunasi.`);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Pembayaran berhasil dicatat' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error addPembayaranPelanggan:', err);
    res.status(400).json({ error: err.message || 'Gagal menambah pembayaran' });
  } finally {
    client.release();
  }
};

// PUT /api/hutang-piutang/pembayaran/:paymentId — Edit a piutang payment record
const updatePembayaranPiutang = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { tanggal_bayar, jumlah_bayar } = req.body;

    if (!tanggal_bayar || !jumlah_bayar) {
      return res.status(400).json({ error: 'Tanggal dan jumlah bayar wajib diisi' });
    }

    const current = await pool.query('SELECT * FROM pembayaran WHERE id = $1', [paymentId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Data pembayaran tidak ditemukan' });
    }

    const hpId = current.rows[0].hutang_piutang_id;

    const hp = await pool.query('SELECT jumlah_total FROM hutang_piutang WHERE id = $1', [hpId]);
    const jumlahTotal = parseFloat(hp.rows[0].jumlah_total);

    const otherPaid = await pool.query(
      'SELECT COALESCE(SUM(jumlah_bayar), 0) AS total FROM pembayaran WHERE hutang_piutang_id = $1 AND id != $2',
      [hpId, paymentId]
    );
    const otherTotal = parseFloat(otherPaid.rows[0].total);

    if (otherTotal + parseFloat(jumlah_bayar) > jumlahTotal) {
      return res.status(400).json({ error: 'Jumlah melebihi sisa tagihan' });
    }

    const result = await pool.query(
      'UPDATE pembayaran SET tanggal_bayar = $1, jumlah_bayar = $2 WHERE id = $3 RETURNING *',
      [tanggal_bayar, jumlah_bayar, paymentId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updatePembayaranPiutang:', err);
    res.status(500).json({ error: 'Gagal mengupdate pembayaran' });
  }
};

module.exports = { getAll, create, update, remove, restore, getPembayaranPelanggan, addPembayaranPelanggan, updatePembayaranPiutang };

