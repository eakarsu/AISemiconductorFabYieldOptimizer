const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/process-recipes - Get all process recipes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM process_recipes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching process recipes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/process-recipes/:id - Get process recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM process_recipes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process recipe not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching process recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/process-recipes - Create a new process recipe
router.post('/', async (req, res) => {
  try {
    const {
      recipe_name, process_type, technology_node, version,
      equipment_type, steps, parameters, approved_by, status
    } = req.body;

    const result = await pool.query(
      `INSERT INTO process_recipes
       (recipe_name, process_type, technology_node, version,
        equipment_type, steps, parameters, approved_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [recipe_name, process_type, technology_node, version || '1.0',
       equipment_type, steps ? JSON.stringify(steps) : null,
       parameters ? JSON.stringify(parameters) : null,
       approved_by, status || 'draft']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating process recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/process-recipes/:id - Update a process recipe
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      recipe_name, process_type, technology_node, version,
      equipment_type, steps, parameters, approved_by, status
    } = req.body;

    const result = await pool.query(
      `UPDATE process_recipes SET
       recipe_name = COALESCE($1, recipe_name),
       process_type = COALESCE($2, process_type),
       technology_node = COALESCE($3, technology_node),
       version = COALESCE($4, version),
       equipment_type = COALESCE($5, equipment_type),
       steps = COALESCE($6, steps),
       parameters = COALESCE($7, parameters),
       approved_by = COALESCE($8, approved_by),
       status = COALESCE($9, status),
       updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [recipe_name, process_type, technology_node, version,
       equipment_type, steps ? JSON.stringify(steps) : null,
       parameters ? JSON.stringify(parameters) : null,
       approved_by, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process recipe not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating process recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/process-recipes/:id - Delete a process recipe
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM process_recipes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process recipe not found' });
    }

    res.json({ message: 'Process recipe deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting process recipe:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
