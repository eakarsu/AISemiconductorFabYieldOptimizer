const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter, parseAIJson } = require('./aiHelper');
const { aiRateLimiter } = require('../middleware/rateLimiter');

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM root_cause_analyses');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM root_cause_analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM root_cause_analyses WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Root cause analysis not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { wafer_lot_id, failure_mode, root_cause, contributing_factors, corrective_action, preventive_action, severity, status, assigned_to } = req.body;
    const result = await pool.query(
      `INSERT INTO root_cause_analyses (wafer_lot_id,failure_mode,root_cause,contributing_factors,corrective_action,preventive_action,severity,status,assigned_to,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [wafer_lot_id, failure_mode, root_cause, contributing_factors ? JSON.stringify(contributing_factors) : null, corrective_action, preventive_action, severity, status || 'open', assigned_to]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { wafer_lot_id, failure_mode, root_cause, contributing_factors, corrective_action, preventive_action, severity, status, assigned_to } = req.body;
    const result = await pool.query(
      `UPDATE root_cause_analyses SET wafer_lot_id=COALESCE($1,wafer_lot_id),failure_mode=COALESCE($2,failure_mode),root_cause=COALESCE($3,root_cause),contributing_factors=COALESCE($4,contributing_factors),corrective_action=COALESCE($5,corrective_action),preventive_action=COALESCE($6,preventive_action),severity=COALESCE($7,severity),status=COALESCE($8,status),assigned_to=COALESCE($9,assigned_to),updated_at=NOW() WHERE id=$10 RETURNING *`,
      [wafer_lot_id, failure_mode, root_cause, contributing_factors ? JSON.stringify(contributing_factors) : null, corrective_action, preventive_action, severity, status, assigned_to, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Root cause analysis not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM root_cause_analyses WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Root cause analysis not found' });
    res.json({ message: 'Root cause analysis deleted successfully', deleted: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/root-cause-analysis/analyze
router.post('/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { failure_description, defect_data, process_history, equipment_logs, affected_lots } = req.body;
    const systemPrompt = `You are an expert semiconductor failure analysis engineer AI. Respond only in valid JSON format.`;
    const userMessage = `Perform root cause analysis:
- Failure: ${failure_description}
- Defect Data: ${JSON.stringify(defect_data || 'N/A')}
- Process History: ${JSON.stringify(process_history || 'N/A')}
- Equipment Logs: ${JSON.stringify(equipment_logs || 'N/A')}
- Affected Lots: ${JSON.stringify(affected_lots || 'N/A')}

Return JSON: { "root_cause": string, "confidence": number, "methodology": string, "cause_chain": string[], "contributing_factors": string[], "evidence": string[], "corrective_actions": string[], "preventive_actions": string[], "risk_priority_number": number, "similar_historical_cases": string }`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const analysis = parseAIJson(aiResponse);
    if (!analysis) {
      console.error('RCA analyze returned invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }
    await pool.query(
      `INSERT INTO ai_results (endpoint,entity_type,user_id,prompt_summary,result,model) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['/root-cause-analysis/analyze', 'rca', req.user.id, `RCA: ${failure_description}`.slice(0, 200), JSON.stringify(analysis), 'anthropic/claude-3-5-sonnet-20241022']
    );
    res.json({ analysis });
  } catch (err) {
    console.error('RCA error:', err);
    res.status(500).json({ error: 'AI analysis failed', details: err.message });
  }
});

module.exports = router;
