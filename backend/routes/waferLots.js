const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/wafer-lots - Get all wafer lots (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM wafer_lots');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM wafer_lots ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching wafer lots:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wafer-lots/:id - Get wafer lot by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM wafer_lots WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wafer lot not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching wafer lot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wafer-lots - Create a new wafer lot
router.post('/', async (req, res) => {
  try {
    const {
      lot_number, product_name, technology_node, wafer_count,
      start_date, target_completion_date, priority, status, customer
    } = req.body;

    const result = await pool.query(
      `INSERT INTO wafer_lots
       (lot_number, product_name, technology_node, wafer_count,
        start_date, target_completion_date, priority, status, customer, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [lot_number, product_name, technology_node, wafer_count,
       start_date, target_completion_date, priority || 'normal', status || 'in_progress', customer]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating wafer lot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/wafer-lots/:id - Update a wafer lot
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lot_number, product_name, technology_node, wafer_count,
      start_date, target_completion_date, priority, status, customer
    } = req.body;

    const result = await pool.query(
      `UPDATE wafer_lots SET
       lot_number = COALESCE($1, lot_number),
       product_name = COALESCE($2, product_name),
       technology_node = COALESCE($3, technology_node),
       wafer_count = COALESCE($4, wafer_count),
       start_date = COALESCE($5, start_date),
       target_completion_date = COALESCE($6, target_completion_date),
       priority = COALESCE($7, priority),
       status = COALESCE($8, status),
       customer = COALESCE($9, customer),
       updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [lot_number, product_name, technology_node, wafer_count,
       start_date, target_completion_date, priority, status, customer, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wafer lot not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating wafer lot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wafer-lots/:id - Delete a wafer lot
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM wafer_lots WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wafer lot not found' });
    }

    res.json({ message: 'Wafer lot deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting wafer lot:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
