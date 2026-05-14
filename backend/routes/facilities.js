const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM facilities');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM facilities ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM facilities WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { fab_name, location, technology_nodes, capacity_wafers_per_month, status } = req.body;
    if (!fab_name) return res.status(400).json({ error: 'fab_name is required' });
    const result = await pool.query(
      `INSERT INTO facilities (fab_name,location,technology_nodes,capacity_wafers_per_month,status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [fab_name, location, technology_nodes, capacity_wafers_per_month, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { fab_name, location, technology_nodes, capacity_wafers_per_month, status } = req.body;
    const result = await pool.query(
      `UPDATE facilities SET fab_name=COALESCE($1,fab_name),location=COALESCE($2,location),technology_nodes=COALESCE($3,technology_nodes),capacity_wafers_per_month=COALESCE($4,capacity_wafers_per_month),status=COALESCE($5,status),updated_at=NOW() WHERE id=$6 RETURNING *`,
      [fab_name, location, technology_nodes, capacity_wafers_per_month, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM facilities WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json({ message: 'Facility deleted', deleted: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
