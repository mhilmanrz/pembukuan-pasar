const pool = require('../config/db');

// GET /api/barang-masuk
const getAll = async (req, res) => {
  try {
    const { dari, sampai, status } = req.query;
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

    if (status === 'deleted') {
      conditions.push('bm.deleted_at IS NOT NULL');
    } else {
      conditions.push('bm.deleted_at IS NULL');
    }

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
    const { tanggal, kg, nama_pengirim, harga, sudah_dibayar, gambar } = req.body;
    if (!tanggal || !kg || !nama_pengirim || harga === undefined) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    if (parseFloat(kg) <= 0) return res.status(400).json({ error: 'Kg harus lebih dari 0' });
    if (parseFloat(harga) < 0) return res.status(400).json({ error: 'Harga tidak boleh negatif' });
    if (nama_pengirim.length > 100) return res.status(400).json({ error: 'Nama pengirim maksimal 100 karakter' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let pengirimResult = await client.query('SELECT id FROM pengirim WHERE nama = $1', [nama_pengirim]);
      let pengirimId;
      if (pengirimResult.rows.length === 0) {
        let newP = await client.query('INSERT INTO pengirim (nama) VALUES ($1) RETURNING id', [nama_pengirim]);
        pengirimId = newP.rows[0].id;
      } else {
        pengirimId = pengirimResult.rows[0].id;
      }

      const result = await client.query(
        'INSERT INTO barang_masuk (tanggal, kg, nama_pengirim, pengirim_id, harga, gambar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [tanggal, kg, nama_pengirim, pengirimId, harga, gambar ? JSON.stringify(gambar) : '[]']
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
    const { tanggal, kg, nama_pengirim, harga, gambar } = req.body;
    
    if (kg !== undefined && parseFloat(kg) <= 0) return res.status(400).json({ error: 'Kg harus lebih dari 0' });
    if (harga !== undefined && parseFloat(harga) < 0) return res.status(400).json({ error: 'Harga tidak boleh negatif' });
    if (nama_pengirim && nama_pengirim.length > 100) return res.status(400).json({ error: 'Nama pengirim maksimal 100 karakter' });

    // Get current record to preserve fields and handle pengirimId relation correctly
    const currentResult = await pool.query('SELECT nama_pengirim, pengirim_id FROM barang_masuk WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    const current = currentResult.rows[0];
    const finalNamaPengirim = nama_pengirim !== undefined ? nama_pengirim : current.nama_pengirim;

    let pengirimId = current.pengirim_id;
    if (finalNamaPengirim) {
      let pengirimResult = await pool.query('SELECT id FROM pengirim WHERE nama = $1', [finalNamaPengirim]);
      if (pengirimResult.rows.length === 0) {
        let newP = await pool.query('INSERT INTO pengirim (nama) VALUES ($1) RETURNING id', [finalNamaPengirim]);
        pengirimId = newP.rows[0].id;
      } else {
        pengirimId = pengirimResult.rows[0].id;
      }
    } else {
      pengirimId = null;
    }

    const result = await pool.query(
      'UPDATE barang_masuk SET tanggal=COALESCE($1, tanggal), kg=COALESCE($2, kg), nama_pengirim=COALESCE($3, nama_pengirim), pengirim_id=$4, harga=COALESCE($5, harga), gambar=COALESCE($6, gambar) WHERE id=$7 RETURNING *',
      [
        tanggal, 
        kg, 
        nama_pengirim, 
        pengirimId, 
        harga, 
        gambar ? JSON.stringify(gambar) : null, 
        id
      ]
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
    const result = await pool.query('UPDATE barang_masuk SET deleted_at = NOW() WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dipindahkan ke tempat sampah' });
  } catch (err) {
    console.error('Error delete barang_masuk:', err);
    res.status(500).json({ error: 'Gagal menghapus barang masuk' });
  }
};

// PUT /api/barang-masuk/:id/restore
const restore = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE barang_masuk SET deleted_at = NULL WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Data berhasil dipulihkan' });
  } catch (err) {
    console.error('Error restore barang_masuk:', err);
    res.status(500).json({ error: 'Gagal memulihkan barang masuk' });
  }
};

// GET /api/barang-masuk/pengirim — Unique sender names for autocomplete
const getPengirimList = async (req, res) => {
  try {
    // Auto-sync: insert any pengirim from barang_masuk that don't exist in pengirim table yet
    await pool.query(`
      INSERT INTO pengirim (nama)
      SELECT DISTINCT bm.nama_pengirim FROM barang_masuk bm
      WHERE bm.nama_pengirim IS NOT NULL AND bm.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM pengirim p WHERE p.nama = bm.nama_pengirim)
      ON CONFLICT (nama) DO NOTHING
    `);

    const result = await pool.query(
      'SELECT id, nama, share_token, telepon FROM pengirim ORDER BY nama ASC'
    );
    res.json(result.rows);
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

// POST /api/barang-masuk/pengirim/:nama/bayar — Add installment payment for a sender
const addPembayaranPengirim = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nama } = req.params;
    const { tanggal_bayar, jumlah_bayar } = req.body;
    let paymentLeft = parseFloat(jumlah_bayar);

    if (!tanggal_bayar || !jumlah_bayar || paymentLeft <= 0) {
      return res.status(400).json({ error: 'Data pembayaran tidak valid' });
    }

    await client.query('BEGIN');

    // Get all unpaid barang_masuk for this sender, sorted oldest first
    const unpaidQuery = `
      SELECT bm.id, bm.harga, COALESCE(SUM(pbm.jumlah_bayar), 0) AS total_dibayar
      FROM barang_masuk bm
      LEFT JOIN pembayaran_barang_masuk pbm ON pbm.barang_masuk_id = bm.id
      WHERE bm.nama_pengirim = $1 AND bm.deleted_at IS NULL
      GROUP BY bm.id
      HAVING bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) > 0
      ORDER BY bm.tanggal ASC, bm.created_at ASC
    `;
    const unpaidItems = await client.query(unpaidQuery, [nama]);

    for (const item of unpaidItems.rows) {
      if (paymentLeft <= 0) break;
      
      const sisa = parseFloat(item.harga) - parseFloat(item.total_dibayar);
      const toPay = Math.min(sisa, paymentLeft);
      
      await client.query(
        'INSERT INTO pembayaran_barang_masuk (barang_masuk_id, tanggal_bayar, jumlah_bayar) VALUES ($1, $2, $3)',
        [item.id, tanggal_bayar, toPay]
      );
      
      paymentLeft -= toPay;
    }

    if (paymentLeft > 0.01) { // allow tiny floating point inaccuracies
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Jumlah bayar melebihi total sisa tagihan' });
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Pembayaran berhasil dicatat' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error addPembayaranPengirim:', err);
    res.status(500).json({ error: 'Gagal menambah pembayaran' });
  } finally {
    client.release();
  }
};

// GET /api/barang-masuk/pengirim/:nama/bayar — Get payment history for a sender
const getPembayaranPengirim = async (req, res) => {
  try {
    const { nama } = req.params;

    const summaryQuery = `
      SELECT 
        COALESCE(SUM(bm.harga), 0) AS total_harga,
        (
          SELECT COALESCE(SUM(pbm.jumlah_bayar), 0)
          FROM pembayaran_barang_masuk pbm
          JOIN barang_masuk bm2 ON pbm.barang_masuk_id = bm2.id
          WHERE bm2.nama_pengirim = $1 AND bm2.deleted_at IS NULL
        ) AS total_dibayar
      FROM barang_masuk bm
      WHERE bm.nama_pengirim = $1 AND bm.deleted_at IS NULL
    `;
    const summary = await pool.query(summaryQuery, [nama]);
    
    // Individual payment records with IDs for editing
    const historyQuery = `
      SELECT pbm.id, pbm.tanggal_bayar, pbm.jumlah_bayar, pbm.created_at
      FROM pembayaran_barang_masuk pbm
      JOIN barang_masuk bm ON pbm.barang_masuk_id = bm.id
      WHERE bm.nama_pengirim = $1 AND bm.deleted_at IS NULL
      ORDER BY pbm.tanggal_bayar DESC, pbm.created_at DESC
    `;
    const payments = await pool.query(historyQuery, [nama]);

    // Unpaid items (FIFO)
    const unpaidQuery = `
      SELECT bm.id, bm.tanggal, bm.kg, bm.harga, 
        COALESCE(SUM(pbm.jumlah_bayar), 0) AS total_dibayar,
        bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) AS sisa_bayar
      FROM barang_masuk bm
      LEFT JOIN pembayaran_barang_masuk pbm ON pbm.barang_masuk_id = bm.id
      WHERE bm.nama_pengirim = $1 AND bm.deleted_at IS NULL
      GROUP BY bm.id
      HAVING bm.harga - COALESCE(SUM(pbm.jumlah_bayar), 0) > 0
      ORDER BY bm.tanggal ASC, bm.created_at ASC
    `;
    const unpaid = await pool.query(unpaidQuery, [nama]);

    const totalHarga = parseFloat(summary.rows[0].total_harga);
    const totalDibayar = parseFloat(summary.rows[0].total_dibayar);

    res.json({
      nama_pengirim: nama,
      pembayaran: payments.rows,
      total_hutang: totalHarga,
      total_dibayar: totalDibayar,
      sisa_tagihan: totalHarga - totalDibayar,
      rincian_belum_lunas: unpaid.rows,
    });
  } catch (err) {
    console.error('Error getPembayaranPengirim:', err);
    res.status(500).json({ error: 'Gagal mengambil data pembayaran pengirim' });
  }
};

// PUT /api/barang-masuk/pembayaran/:paymentId — Edit a payment record
const updatePembayaran = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { tanggal_bayar, jumlah_bayar } = req.body;

    if (!tanggal_bayar || !jumlah_bayar) {
      return res.status(400).json({ error: 'Tanggal dan jumlah bayar wajib diisi' });
    }

    // Get current payment
    const current = await pool.query('SELECT * FROM pembayaran_barang_masuk WHERE id = $1', [paymentId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Data pembayaran tidak ditemukan' });
    }

    const bmId = current.rows[0].barang_masuk_id;

    // Get barang masuk harga
    const bm = await pool.query('SELECT harga FROM barang_masuk WHERE id = $1', [bmId]);
    const harga = parseFloat(bm.rows[0].harga);

    // Get total paid for this BM excluding current payment
    const otherPaid = await pool.query(
      'SELECT COALESCE(SUM(jumlah_bayar), 0) AS total FROM pembayaran_barang_masuk WHERE barang_masuk_id = $1 AND id != $2',
      [bmId, paymentId]
    );
    const otherTotal = parseFloat(otherPaid.rows[0].total);

    if (otherTotal + parseFloat(jumlah_bayar) > harga) {
      return res.status(400).json({ error: `Jumlah melebihi sisa tagihan` });
    }

    const result = await pool.query(
      'UPDATE pembayaran_barang_masuk SET tanggal_bayar = $1, jumlah_bayar = $2 WHERE id = $3 RETURNING *',
      [tanggal_bayar, jumlah_bayar, paymentId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updatePembayaran:', err);
    res.status(500).json({ error: 'Gagal mengupdate pembayaran' });
  }
};

module.exports = { getAll, create, update, remove, restore, getPengirimList, addPembayaran, getPembayaran, addPembayaranPengirim, getPembayaranPengirim, updatePembayaran };
