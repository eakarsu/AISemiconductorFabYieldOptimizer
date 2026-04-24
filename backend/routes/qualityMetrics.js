const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/quality-metrics - Get all quality metrics
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quality_metrics ORDER BY measured_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quality metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quality-metrics/:id - Get quality metric by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM quality_metrics WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quality metric not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching quality metric:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quality-metrics - Create a new quality metric
router.post('/', async (req, res) => {
  try {
    const {
      wafer_lot_id, metric_name, metric_value, unit, target_value,
      lower_spec_limit, upper_spec_limit, process_step, equipment_id,
      measurement_site, cpk, cp
    } = req.body;

    const result = await pool.query(
      `INSERT INTO quality_metrics
       (wafer_lot_id, metric_name, metric_value, unit, target_value,
        lower_spec_limit, upper_spec_limit, process_step, equipment_id,
        measurement_site, cpk, cp, measured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [wafer_lot_id, metric_name, metric_value, unit, target_value,
       lower_spec_limit, upper_spec_limit, process_step, equipment_id,
       measurement_site, cpk, cp]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating quality metric:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quality-metrics/:id - Update a quality metric
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wafer_lot_id, metric_name, metric_value, unit, target_value,
      lower_spec_limit, upper_spec_limit, process_step, equipment_id,
      measurement_site, cpk, cp
    } = req.body;

    const result = await pool.query(
      `UPDATE quality_metrics SET
       wafer_lot_id = COALESCE($1, wafer_lot_id),
       metric_name = COALESCE($2, metric_name),
       metric_value = COALESCE($3, metric_value),
       unit = COALESCE($4, unit),
       target_value = COALESCE($5, target_value),
       lower_spec_limit = COALESCE($6, lower_spec_limit),
       upper_spec_limit = COALESCE($7, upper_spec_limit),
       process_step = COALESCE($8, process_step),
       equipment_id = COALESCE($9, equipment_id),
       measurement_site = COALESCE($10, measurement_site),
       cpk = COALESCE($11, cpk),
       cp = COALESCE($12, cp),
       updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [wafer_lot_id, metric_name, metric_value, unit, target_value,
       lower_spec_limit, upper_spec_limit, process_step, equipment_id,
       measurement_site, cpk, cp, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quality metric not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quality metric:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/quality-metrics/:id - Delete a quality metric
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM quality_metrics WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quality metric not found' });
    }

    res.json({ message: 'Quality metric deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting quality metric:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
