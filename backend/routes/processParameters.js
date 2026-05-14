const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter } = require('./aiHelper');

// GET /api/process-parameters - Get all process parameters
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM process_parameters');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM process_parameters ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching process parameters:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/process-parameters/:id - Get process parameter by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM process_parameters WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process parameter not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching process parameter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/process-parameters - Create a new process parameter
router.post('/', async (req, res) => {
  try {
    const {
      recipe_id, parameter_name, target_value, lower_limit, upper_limit,
      unit, process_step, equipment_id, measurement_frequency
    } = req.body;

    const result = await pool.query(
      `INSERT INTO process_parameters
       (recipe_id, parameter_name, target_value, lower_limit, upper_limit,
        unit, process_step, equipment_id, measurement_frequency, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [recipe_id, parameter_name, target_value, lower_limit, upper_limit,
       unit, process_step, equipment_id, measurement_frequency]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating process parameter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/process-parameters/:id - Update a process parameter
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      recipe_id, parameter_name, target_value, lower_limit, upper_limit,
      unit, process_step, equipment_id, measurement_frequency
    } = req.body;

    const result = await pool.query(
      `UPDATE process_parameters SET
       recipe_id = COALESCE($1, recipe_id),
       parameter_name = COALESCE($2, parameter_name),
       target_value = COALESCE($3, target_value),
       lower_limit = COALESCE($4, lower_limit),
       upper_limit = COALESCE($5, upper_limit),
       unit = COALESCE($6, unit),
       process_step = COALESCE($7, process_step),
       equipment_id = COALESCE($8, equipment_id),
       measurement_frequency = COALESCE($9, measurement_frequency),
       updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [recipe_id, parameter_name, target_value, lower_limit, upper_limit,
       unit, process_step, equipment_id, measurement_frequency, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process parameter not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating process parameter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/process-parameters/:id - Delete a process parameter
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM process_parameters WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process parameter not found' });
    }

    res.json({ message: 'Process parameter deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting process parameter:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/process-parameters/optimize - AI-powered parameter optimization
router.post('/optimize', async (req, res) => {
  try {
    const { process_step, equipment_type, current_parameters, target_yield, constraints } = req.body;

    const systemPrompt = `You are an expert semiconductor process engineer AI specializing in process parameter optimization for advanced fab operations. You understand the complex interdependencies between process parameters and their effects on yield, uniformity, and device performance.

Your knowledge covers:
- CVD/PVD deposition: temperature, pressure, gas flows, RF power, deposition rate
- Etching (RIE/ICP): etch rate, selectivity, uniformity, gas chemistry, bias power
- Lithography: exposure dose, focus, overlay, CD uniformity
- CMP: downforce, platen speed, slurry flow, removal rate, within-wafer non-uniformity
- Implantation: energy, dose, tilt, twist, beam current
- Diffusion/Anneal: temperature profile, ramp rates, soak time, ambient gas
- Wet processing: chemical concentrations, temperature, time, rinse parameters

When optimizing, consider:
- Parameter interactions and coupling effects
- Equipment-specific limitations and capabilities
- Process window margins and Cpk requirements
- Defect generation risks at extreme parameter values
- Throughput implications of parameter changes

Respond in valid JSON format with:
- optimized_parameters: Array of { name, current_value, recommended_value, unit, reasoning }
- expected_yield_improvement: Estimated percentage improvement
- confidence: 0-1 confidence in recommendations
- risk_assessment: Potential risks of the recommended changes
- implementation_notes: Step-by-step implementation guidance`;

    const userMessage = `Optimize process parameters for:
- Process Step: ${process_step}
- Equipment Type: ${equipment_type}
- Current Parameters: ${JSON.stringify(current_parameters)}
- Target Yield: ${target_yield}%
- Constraints: ${JSON.stringify(constraints || 'none')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);

    let optimization;
    try {
      optimization = JSON.parse(aiResponse);
    } catch {
      optimization = { raw_response: aiResponse };
    }

    res.json({ process_step, equipment_type, optimization });
  } catch (err) {
    console.error('Error optimizing parameters:', err);
    res.status(500).json({ error: 'AI optimization failed', details: err.message });
  }
});

module.exports = router;
