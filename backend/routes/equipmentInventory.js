const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/equipment-inventory - Get all equipment
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipment_inventory ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching equipment inventory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/equipment-inventory/:id - Get equipment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM equipment_inventory WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching equipment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/equipment-inventory - Create new equipment
router.post('/', async (req, res) => {
  try {
    const {
      equipment_name, equipment_type, manufacturer, model_number,
      serial_number, location, bay, status, installation_date,
      last_pm_date, next_pm_date, specifications
    } = req.body;

    const result = await pool.query(
      `INSERT INTO equipment_inventory
       (equipment_name, equipment_type, manufacturer, model_number,
        serial_number, location, bay, status, installation_date,
        last_pm_date, next_pm_date, specifications, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [equipment_name, equipment_type, manufacturer, model_number,
       serial_number, location, bay, status || 'operational',
       installation_date, last_pm_date, next_pm_date,
       specifications ? JSON.stringify(specifications) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating equipment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/equipment-inventory/:id - Update equipment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_name, equipment_type, manufacturer, model_number,
      serial_number, location, bay, status, installation_date,
      last_pm_date, next_pm_date, specifications
    } = req.body;

    const result = await pool.query(
      `UPDATE equipment_inventory SET
       equipment_name = COALESCE($1, equipment_name),
       equipment_type = COALESCE($2, equipment_type),
       manufacturer = COALESCE($3, manufacturer),
       model_number = COALESCE($4, model_number),
       serial_number = COALESCE($5, serial_number),
       location = COALESCE($6, location),
       bay = COALESCE($7, bay),
       status = COALESCE($8, status),
       installation_date = COALESCE($9, installation_date),
       last_pm_date = COALESCE($10, last_pm_date),
       next_pm_date = COALESCE($11, next_pm_date),
       specifications = COALESCE($12, specifications),
       updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [equipment_name, equipment_type, manufacturer, model_number,
       serial_number, location, bay, status, installation_date,
       last_pm_date, next_pm_date,
       specifications ? JSON.stringify(specifications) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating equipment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/equipment-inventory/:id - Delete equipment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM equipment_inventory WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ message: 'Equipment deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting equipment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
