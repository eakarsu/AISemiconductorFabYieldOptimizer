const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter } = require('./aiHelper');

// GET /api/equipment-matching - Get all equipment matching records
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipment_matching ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching equipment matching records:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/equipment-matching/:id - Get equipment matching by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM equipment_matching WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment matching record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching equipment matching record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/equipment-matching - Create a new equipment matching record
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, process_step, compatibility_score, qualification_status,
      last_qualified_date, performance_metrics, restrictions
    } = req.body;

    const result = await pool.query(
      `INSERT INTO equipment_matching
       (equipment_id, process_step, compatibility_score, qualification_status,
        last_qualified_date, performance_metrics, restrictions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [equipment_id, process_step, compatibility_score, qualification_status,
       last_qualified_date, performance_metrics ? JSON.stringify(performance_metrics) : null,
       restrictions]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating equipment matching record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/equipment-matching/:id - Update an equipment matching record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, process_step, compatibility_score, qualification_status,
      last_qualified_date, performance_metrics, restrictions
    } = req.body;

    const result = await pool.query(
      `UPDATE equipment_matching SET
       equipment_id = COALESCE($1, equipment_id),
       process_step = COALESCE($2, process_step),
       compatibility_score = COALESCE($3, compatibility_score),
       qualification_status = COALESCE($4, qualification_status),
       last_qualified_date = COALESCE($5, last_qualified_date),
       performance_metrics = COALESCE($6, performance_metrics),
       restrictions = COALESCE($7, restrictions),
       updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [equipment_id, process_step, compatibility_score, qualification_status,
       last_qualified_date, performance_metrics ? JSON.stringify(performance_metrics) : null,
       restrictions, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment matching record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating equipment matching record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/equipment-matching/:id - Delete an equipment matching record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM equipment_matching WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment matching record not found' });
    }

    res.json({ message: 'Equipment matching record deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting equipment matching record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/equipment-matching/match - AI-powered equipment recommendation
router.post('/match', async (req, res) => {
  try {
    const { process_step, recipe_requirements, available_equipment, priority, lot_data } = req.body;

    const systemPrompt = `You are an expert semiconductor fab equipment matching and scheduling AI. You specialize in recommending the optimal equipment for specific process steps based on equipment capabilities, qualification status, historical performance, and current fab conditions.

Your knowledge covers equipment types:
- Lithography: steppers, scanners (DUV, EUV), track systems
- Etch: RIE, ICP, CDE, wet etch benches
- Deposition: PECVD, LPCVD, ALD, PVD/sputtering, evaporation
- Implantation: high-energy, medium-current, high-current implanters
- CMP: multi-platen polishers, single-wafer systems
- Metrology: CD-SEM, overlay, ellipsometry, XRF, defect inspection
- Wet processing: spray tools, immersion tanks, single-wafer cleaners
- Thermal: furnaces, RTP systems

Equipment matching criteria you evaluate:
- Process qualification status and date
- Historical yield performance on similar products
- Equipment health and PM schedule proximity
- Chamber matching and tool-to-tool variation
- Throughput and cycle time impact
- Queue time and WIP considerations
- Recipe availability and version compatibility
- Contamination risk (metal/non-metal segregation)

Respond in valid JSON format with:
- recommended_equipment: Array of { equipment_id, name, score, reasoning } ranked best to worst
- primary_recommendation: The top equipment choice with detailed justification
- matching_criteria_scores: Breakdown of scores by criteria
- scheduling_notes: Timing and scheduling considerations
- risk_factors: Potential risks with each recommendation
- alternatives: Backup options if primary is unavailable`;

    const userMessage = `Recommend equipment for this process:
- Process Step: ${process_step}
- Recipe Requirements: ${JSON.stringify(recipe_requirements)}
- Available Equipment: ${JSON.stringify(available_equipment)}
- Priority: ${priority || 'normal'}
- Lot Data: ${JSON.stringify(lot_data || 'N/A')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);

    let recommendation;
    try {
      recommendation = JSON.parse(aiResponse);
    } catch {
      recommendation = { raw_response: aiResponse };
    }

    res.json({ process_step, recommendation });
  } catch (err) {
    console.error('Error matching equipment:', err);
    res.status(500).json({ error: 'AI equipment matching failed', details: err.message });
  }
});

module.exports = router;
