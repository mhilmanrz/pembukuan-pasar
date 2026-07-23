const pool = require('../config/db');

// GET /api/hutang-piutang
const getAll = async (req, res) => {
  try {
    const { tipe, dari, sampai, status } = req.query;
    let query = `
      SELECT hp.*, 
        COALESCE(SUM(p.jumlah_bayar), 0) AS total_dibayar,
        COALESCE(SUM(p.kg_bayar), 0) AS total_kg_dibayar,
        hp.jumlah_total - COALESCE(SUM(p.jumlah_bayar), 0) AS sisa_tagihan
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
    if (kg && parseFloat(kg) < 0) return res.status(400).json({ error: 'Kg tidak boleh negatif' });
    if (parseFloat(jumlah_total) < 0) return res.status(400).json({ error: 'Jumlah total tidak boleh negatif' });
    if (nama.length > 100) return res.status(400).json({ error: 'Nama maksimal 100 karakter' });
    let pelangganId = null;
    if (tipe === 'piutang') {
      let pelangganResult = await pool.query('SELECT id FROM pelanggan WHERE nama = $1', [nama]);
      if (pelangganResult.rows.length === 0) {
        let newP = await pool.query('INSERT INTO pelanggan (nama) VALUES ($1) RETURNING id', [nama]);
        pelangganId = newP.rows[0].id;
      } else {
        pelangganId = pelangganResult.rows[0].id;
      }
    }

    const result = await pool.query(
      'INSERT INTO hutang_piutang (tipe, tanggal, nama, pelanggan_id, kg, jumlah_total, keterangan) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [tipe, tanggal, nama, pelangganId, kg || null, jumlah_total, keterangan || null]
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
    if (kg !== undefined && kg !== null && parseFloat(kg) < 0) return res.status(400).json({ error: 'Kg tidak boleh negatif' });
    if (jumlah_total !== undefined && parseFloat(jumlah_total) < 0) return res.status(400).json({ error: 'Jumlah total tidak boleh negatif' });
    if (nama && nama.length > 100) return res.status(400).json({ error: 'Nama maksimal 100 karakter' });
    // Get current record to preserve fields and handle pelangganId relation correctly
    const currentResult = await pool.query('SELECT tipe, nama, pelanggan_id FROM hutang_piutang WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    const current = currentResult.rows[0];
    const finalTipe = tipe !== undefined ? tipe : current.tipe;
    const finalNama = nama !== undefined ? nama : current.nama;

    let pelangganId = current.pelanggan_id;
    if (finalTipe === 'piutang') {
      if (finalNama) {
        let pelangganResult = await pool.query('SELECT id FROM pelanggan WHERE nama = $1', [finalNama]);
        if (pelangganResult.rows.length === 0) {
          let newP = await pool.query('INSERT INTO pelanggan (nama) VALUES ($1) RETURNING id', [finalNama]);
          pelangganId = newP.rows[0].id;
        } else {
          pelangganId = pelangganResult.rows[0].id;
        }
      }
    } else {
      pelangganId = null;
    }

    const result = await pool.query(
      'UPDATE hutang_piutang SET tipe=COALESCE($1, tipe), tanggal=COALESCE($2, tanggal), nama=COALESCE($3, nama), pelanggan_id=$4, kg=COALESCE($5, kg), jumlah_total=COALESCE($6, jumlah_total), keterangan=COALESCE($7, keterangan) WHERE id=$8 RETURNING *',
      [tipe, tanggal, nama, pelangganId, kg || null, jumlah_total, keterangan || null, id]
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
        COALESCE(SUM(hp.kg), 0) AS total_kg_piutang,
        (
          SELECT COALESCE(SUM(p.jumlah_bayar), 0)
          FROM pembayaran p
          JOIN hutang_piutang hp2 ON p.hutang_piutang_id = hp2.id
          WHERE hp2.nama = $1 AND hp2.tipe = 'piutang' AND hp2.deleted_at IS NULL
        ) AS total_dibayar,
        (
          SELECT COALESCE(SUM(p.kg_bayar), 0)
          FROM pembayaran p
          JOIN hutang_piutang hp2 ON p.hutang_piutang_id = hp2.id
          WHERE hp2.nama = $1 AND hp2.tipe = 'piutang' AND hp2.deleted_at IS NULL
        ) AS total_kg_dibayar
      FROM hutang_piutang hp
      WHERE hp.nama = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
    `;
    const summary = await pool.query(summaryQuery, [nama]);
    
    // Individual payment records with IDs for editing
    const historyQuery = `
      SELECT p.id, p.tanggal_bayar, p.jumlah_bayar, p.kg_bayar, p.created_at
      FROM pembayaran p
      JOIN hutang_piutang hp ON p.hutang_piutang_id = hp.id
      WHERE hp.nama = $1 AND hp.tipe = 'piutang' AND hp.deleted_at IS NULL
      ORDER BY p.tanggal_bayar DESC, p.created_at DESC
    `;
    const payments = await pool.query(historyQuery, [nama]);

    const totalPiutang = parseFloat(summary.rows[0].total_piutang);
    const totalDibayar = parseFloat(summary.rows[0].total_dibayar);
    const totalKgPiutang = parseFloat(summary.rows[0].total_kg_piutang);
    const totalKgDibayar = parseFloat(summary.rows[0].total_kg_dibayar);

    res.json({
      nama_pelanggan: nama,
      pembayaran: payments.rows,
      hutang_piutang: { jumlah_total: totalPiutang, kg: totalKgPiutang },
      total_dibayar: totalDibayar,
      total_kg_dibayar: totalKgDibayar,
      sisa_tagihan: totalPiutang - totalDibayar,
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
    const { tanggal_bayar, jumlah_bayar, kg_bayar } = req.body;
    let paymentLeft = parseFloat(jumlah_bayar);
    let kgLeft = kg_bayar ? parseFloat(kg_bayar) : 0;

    if (!tanggal_bayar || !jumlah_bayar || paymentLeft <= 0) {
      return res.status(400).json({ error: 'Data pembayaran tidak valid' });
    }

    await client.query('BEGIN');

    // Get all unpaid for this sender (FIFO)
    const unpaidQuery = `
      SELECT hp.id, hp.jumlah_total, hp.kg, COALESCE(SUM(p.jumlah_bayar), 0) AS total_dibayar, COALESCE(SUM(p.kg_bayar), 0) AS total_kg_dibayar
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
      const sisaKg = (parseFloat(item.kg) || 0) - parseFloat(item.total_kg_dibayar);
      const toPay = Math.min(sisaTagihan, paymentLeft);
      // For KG we distribute proportionally or just greedily up to sisaKg
      const toPayKg = Math.min(Math.max(sisaKg, 0), kgLeft);
      
      await client.query(
        'INSERT INTO pembayaran (hutang_piutang_id, tanggal_bayar, jumlah_bayar, kg_bayar) VALUES ($1, $2, $3, $4)',
        [item.id, tanggal_bayar, toPay, toPayKg || null]
      );
      paymentLeft -= toPay;
      kgLeft -= toPayKg;
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
    const { tanggal_bayar, jumlah_bayar, kg_bayar } = req.body;

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
      'UPDATE pembayaran SET tanggal_bayar = $1, jumlah_bayar = $2, kg_bayar = $3 WHERE id = $4 RETURNING *',
      [tanggal_bayar, jumlah_bayar, kg_bayar || null, paymentId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updatePembayaranPiutang:', err);
    res.status(500).json({ error: 'Gagal mengupdate pembayaran' });
  }
};

// GET /api/hutang-piutang/pelanggan
const getPelangganList = async (req, res) => {
  try {
    // Auto-sync: insert any pelanggan from hutang_piutang that don't exist in pelanggan table yet
    await pool.query(`
      INSERT INTO pelanggan (nama)
      SELECT DISTINCT hp.nama FROM hutang_piutang hp
      WHERE hp.tipe = 'piutang' AND hp.nama IS NOT NULL AND hp.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM pelanggan p WHERE p.nama = hp.nama)
      ON CONFLICT (nama) DO NOTHING
    `);

    const result = await pool.query(
      'SELECT id, nama, share_token, telepon FROM pelanggan ORDER BY nama ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getPelangganList:', err);
    res.status(500).json({ error: 'Gagal mengambil daftar pelanggan' });
  }
};

module.exports = { getAll, create, update, remove, restore, getPembayaranPelanggan, addPembayaranPelanggan, updatePembayaranPiutang, getPelangganList };

