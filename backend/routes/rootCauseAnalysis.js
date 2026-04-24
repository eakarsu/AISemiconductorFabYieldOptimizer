const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter } = require('./aiHelper');

// GET /api/root-cause-analysis - Get all root cause analyses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM root_cause_analyses ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching root cause analyses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/root-cause-analysis/:id - Get root cause analysis by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM root_cause_analyses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Root cause analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching root cause analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/root-cause-analysis - Create a new root cause analysis
router.post('/', async (req, res) => {
  try {
    const {
      wafer_lot_id, failure_mode, root_cause, contributing_factors,
      corrective_action, preventive_action, severity, status, assigned_to
    } = req.body;

    const result = await pool.query(
      `INSERT INTO root_cause_analyses
       (wafer_lot_id, failure_mode, root_cause, contributing_factors,
        corrective_action, preventive_action, severity, status, assigned_to, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [wafer_lot_id, failure_mode, root_cause,
       contributing_factors ? JSON.stringify(contributing_factors) : null,
       corrective_action, preventive_action, severity, status || 'open', assigned_to]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating root cause analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/root-cause-analysis/:id - Update a root cause analysis
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wafer_lot_id, failure_mode, root_cause, contributing_factors,
      corrective_action, preventive_action, severity, status, assigned_to
    } = req.body;

    const result = await pool.query(
      `UPDATE root_cause_analyses SET
       wafer_lot_id = COALESCE($1, wafer_lot_id),
       failure_mode = COALESCE($2, failure_mode),
       root_cause = COALESCE($3, root_cause),
       contributing_factors = COALESCE($4, contributing_factors),
       corrective_action = COALESCE($5, corrective_action),
       preventive_action = COALESCE($6, preventive_action),
       severity = COALESCE($7, severity),
       status = COALESCE($8, status),
       assigned_to = COALESCE($9, assigned_to),
       updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [wafer_lot_id, failure_mode, root_cause,
       contributing_factors ? JSON.stringify(contributing_factors) : null,
       corrective_action, preventive_action, severity, status, assigned_to, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Root cause analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating root cause analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/root-cause-analysis/:id - Delete a root cause analysis
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM root_cause_analyses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Root cause analysis not found' });
    }

    res.json({ message: 'Root cause analysis deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting root cause analysis:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/root-cause-analysis/analyze - AI-powered root cause analysis
router.post('/analyze', async (req, res) => {
  try {
    const { failure_description, defect_data, process_history, equipment_logs, affected_lots } = req.body;

    const systemPrompt = `You are an expert semiconductor failure analysis engineer AI. You specialize in root cause analysis (RCA) for semiconductor manufacturing defects and yield excursions using systematic methodologies.

Your analytical frameworks include:
- 5-Why Analysis: Iterative questioning to identify fundamental cause
- Fishbone (Ishikawa) Diagram: Categorizing causes into Man, Machine, Method, Material, Measurement, Environment
- Fault Tree Analysis (FTA): Top-down deductive failure analysis
- FMEA: Failure Mode and Effects Analysis with severity, occurrence, and detection ratings

Common semiconductor failure modes you understand:
- Electrical failures: opens, shorts, leakage, parametric shifts
- Physical failures: cracks, delamination, voids, contamination
- Reliability failures: electromigration, TDDB, HCI, NBTI
- Process excursions: out-of-spec parameters, equipment drift, material variation
- Yield excursions: systematic vs. random defect mechanisms

For each analysis, consider:
- Temporal correlation (when did the issue start?)
- Spatial correlation (which tools, chambers, zones affected?)
- Lot/wafer correlation (common processing history?)
- Process of elimination across all possible causes
- Statistical significance of observations

Respond in valid JSON format with:
- root_cause: Primary identified root cause
- confidence: 0-1 confidence level
- methodology: Which RCA methodology was applied
- cause_chain: Array showing the chain of causation (5-why style)
- contributing_factors: Array of secondary contributing factors
- evidence: Key evidence supporting the conclusion
- corrective_actions: Immediate actions to fix the issue
- preventive_actions: Long-term actions to prevent recurrence
- risk_priority_number: RPN score (1-1000) based on severity x occurrence x detection
- similar_historical_cases: Description of similar known failure modes`;

    const userMessage = `Perform root cause analysis on this semiconductor failure:
- Failure Description: ${failure_description}
- Defect Data: ${JSON.stringify(defect_data || 'N/A')}
- Process History: ${JSON.stringify(process_history || 'N/A')}
- Equipment Logs: ${JSON.stringify(equipment_logs || 'N/A')}
- Affected Lots: ${JSON.stringify(affected_lots || 'N/A')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);

    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch {
      analysis = { raw_response: aiResponse };
    }

    res.json({ analysis });
  } catch (err) {
    console.error('Error performing root cause analysis:', err);
    res.status(500).json({ error: 'AI analysis failed', details: err.message });
  }
});

module.exports = router;
