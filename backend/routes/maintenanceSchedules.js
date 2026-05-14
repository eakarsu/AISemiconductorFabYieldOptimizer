const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/maintenance-schedules - Get all maintenance schedules
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM maintenance_schedules');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM maintenance_schedules ORDER BY scheduled_date ASC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching maintenance schedules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance-schedules/:id - Get maintenance schedule by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM maintenance_schedules WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching maintenance schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance-schedules - Create a new maintenance schedule
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, maintenance_type, scheduled_date, estimated_duration_hours,
      priority, description, assigned_technician, parts_required, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO maintenance_schedules
       (equipment_id, maintenance_type, scheduled_date, estimated_duration_hours,
        priority, description, assigned_technician, parts_required, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [equipment_id, maintenance_type, scheduled_date, estimated_duration_hours,
       priority || 'normal', description, assigned_technician,
       parts_required ? JSON.stringify(parts_required) : null,
       status || 'scheduled']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating maintenance schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/maintenance-schedules/:id - Update a maintenance schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, maintenance_type, scheduled_date, estimated_duration_hours,
      priority, description, assigned_technician, parts_required, status,
      completed_date, actual_duration_hours, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE maintenance_schedules SET
       equipment_id = COALESCE($1, equipment_id),
       maintenance_type = COALESCE($2, maintenance_type),
       scheduled_date = COALESCE($3, scheduled_date),
       estimated_duration_hours = COALESCE($4, estimated_duration_hours),
       priority = COALESCE($5, priority),
       description = COALESCE($6, description),
       assigned_technician = COALESCE($7, assigned_technician),
       parts_required = COALESCE($8, parts_required),
       status = COALESCE($9, status),
       completed_date = COALESCE($10, completed_date),
       actual_duration_hours = COALESCE($11, actual_duration_hours),
       notes = COALESCE($12, notes),
       updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [equipment_id, maintenance_type, scheduled_date, estimated_duration_hours,
       priority, description, assigned_technician,
       parts_required ? JSON.stringify(parts_required) : null,
       status, completed_date, actual_duration_hours, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating maintenance schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/maintenance-schedules/:id - Delete a maintenance schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM maintenance_schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    res.json({ message: 'Maintenance schedule deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting maintenance schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
