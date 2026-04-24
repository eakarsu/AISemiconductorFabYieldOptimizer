const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/spc-alerts - Get all SPC alerts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM spc_alerts ORDER BY triggered_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SPC alerts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/spc-alerts/:id - Get SPC alert by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM spc_alerts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SPC alert not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching SPC alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/spc-alerts - Create a new SPC alert
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, parameter_name, rule_violated, current_value,
      control_limit_upper, control_limit_lower, center_line,
      severity, process_step, description
    } = req.body;

    const result = await pool.query(
      `INSERT INTO spc_alerts
       (equipment_id, parameter_name, rule_violated, current_value,
        control_limit_upper, control_limit_lower, center_line,
        severity, process_step, description, triggered_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [equipment_id, parameter_name, rule_violated, current_value,
       control_limit_upper, control_limit_lower, center_line,
       severity || 'warning', process_step, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating SPC alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/spc-alerts/:id - Update an SPC alert
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, parameter_name, rule_violated, current_value,
      control_limit_upper, control_limit_lower, center_line,
      severity, process_step, description, status
    } = req.body;

    const result = await pool.query(
      `UPDATE spc_alerts SET
       equipment_id = COALESCE($1, equipment_id),
       parameter_name = COALESCE($2, parameter_name),
       rule_violated = COALESCE($3, rule_violated),
       current_value = COALESCE($4, current_value),
       control_limit_upper = COALESCE($5, control_limit_upper),
       control_limit_lower = COALESCE($6, control_limit_lower),
       center_line = COALESCE($7, center_line),
       severity = COALESCE($8, severity),
       process_step = COALESCE($9, process_step),
       description = COALESCE($10, description),
       status = COALESCE($11, status),
       updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [equipment_id, parameter_name, rule_violated, current_value,
       control_limit_upper, control_limit_lower, center_line,
       severity, process_step, description, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SPC alert not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating SPC alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/spc-alerts/:id/acknowledge - Acknowledge an SPC alert
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by, notes } = req.body;

    const result = await pool.query(
      `UPDATE spc_alerts SET
       status = 'acknowledged',
       acknowledged_by = $1,
       acknowledged_at = NOW(),
       notes = COALESCE($2, notes),
       updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [acknowledged_by, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SPC alert not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error acknowledging SPC alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/spc-alerts/:id - Delete an SPC alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM spc_alerts WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SPC alert not found' });
    }

    res.json({ message: 'SPC alert deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting SPC alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
