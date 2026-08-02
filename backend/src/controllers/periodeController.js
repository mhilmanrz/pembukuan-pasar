const pool = require('../config/db');

// GET /api/periode — List all periods (newest first)
const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM periode_pembukuan ORDER BY tanggal_buka DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getAll periode:', err);
    res.status(500).json({ error: 'Gagal mengambil data periode' });
  }
};

// GET /api/periode/aktif — Get the currently active period
const getAktif = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM periode_pembukuan WHERE tanggal_tutup IS NULL LIMIT 1'
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error getAktif periode:', err);
    res.status(500).json({ error: 'Gagal mengambil periode aktif' });
  }
};

// POST /api/periode/buka — Open a new bookkeeping period
const bukaBuku = async (req, res) => {
  try {
    const { tanggal_buka, catatan } = req.body;

    if (!tanggal_buka) {
      return res.status(400).json({ error: 'Tanggal buka wajib diisi' });
    }

    // Check if there's already an active period
    const existing = await pool.query(
      'SELECT id FROM periode_pembukuan WHERE tanggal_tutup IS NULL'
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Masih ada periode aktif. Tutup buku dulu sebelum membuka periode baru.' 
      });
    }

    const result = await pool.query(
      'INSERT INTO periode_pembukuan (tanggal_buka, catatan) VALUES ($1, $2) RETURNING *',
      [tanggal_buka, catatan || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error bukaBuku:', err);
    res.status(500).json({ error: 'Gagal membuka periode baru' });
  }
};

// PUT /api/periode/tutup — Close the active period
const tutupBuku = async (req, res) => {
  try {
    const { tanggal_tutup, catatan } = req.body;

    // Find active period
    const active = await pool.query(
      'SELECT * FROM periode_pembukuan WHERE tanggal_tutup IS NULL LIMIT 1'
    );
    if (active.rows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada periode aktif untuk ditutup' });
    }

    const periode = active.rows[0];
    const closingDate = tanggal_tutup || new Date().toISOString().split('T')[0];

    // Validate: closing date must be >= opening date
    if (closingDate < periode.tanggal_buka.toISOString().split('T')[0]) {
      return res.status(400).json({ error: 'Tanggal tutup tidak boleh sebelum tanggal buka' });
    }

    const updates = ['tanggal_tutup = $1'];
    const params = [closingDate];

    if (catatan !== undefined) {
      updates.push(`catatan = $${params.length + 1}`);
      params.push(catatan);
    }

    params.push(periode.id);
    const result = await pool.query(
      `UPDATE periode_pembukuan SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error tutupBuku:', err);
    res.status(500).json({ error: 'Gagal menutup periode' });
  }
};

// PUT /api/periode/:id — Edit a period (fix dates, catatan, etc.)
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal_buka, tanggal_tutup, catatan } = req.body;

    // Get current period
    const current = await pool.query('SELECT * FROM periode_pembukuan WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Periode tidak ditemukan' });
    }

    const updates = [];
    const params = [];

    if (tanggal_buka !== undefined) {
      params.push(tanggal_buka);
      updates.push(`tanggal_buka = $${params.length}`);
    }

    if (tanggal_tutup !== undefined) {
      // Allow setting to null (reopen) or a date
      params.push(tanggal_tutup);
      updates.push(`tanggal_tutup = $${params.length}`);
    }

    if (catatan !== undefined) {
      params.push(catatan);
      updates.push(`catatan = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diubah' });
    }

    // Validate: if both dates present, tutup >= buka
    const newBuka = tanggal_buka || current.rows[0].tanggal_buka?.toISOString?.()?.split('T')[0];
    const newTutup = tanggal_tutup !== undefined ? tanggal_tutup : current.rows[0].tanggal_tutup?.toISOString?.()?.split('T')[0];
    if (newBuka && newTutup && newTutup < newBuka) {
      return res.status(400).json({ error: 'Tanggal tutup tidak boleh sebelum tanggal buka' });
    }

    // If reopening (setting tanggal_tutup to null), check no other active period
    if (tanggal_tutup === null) {
      const existing = await pool.query(
        'SELECT id FROM periode_pembukuan WHERE tanggal_tutup IS NULL AND id != $1', [id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Sudah ada periode aktif lain. Tutup dulu periode tersebut.' });
      }
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE periode_pembukuan SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error update periode:', err);
    res.status(500).json({ error: 'Gagal mengubah periode' });
  }
};

// DELETE /api/periode/:id — Delete a period
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM periode_pembukuan WHERE id = $1', [id]);
    res.json({ message: 'Periode berhasil dihapus' });
  } catch (err) {
    console.error('Error remove periode:', err);
    res.status(500).json({ error: 'Gagal menghapus periode' });
  }
};

module.exports = { getAll, getAktif, bukaBuku, tutupBuku, update, remove };

