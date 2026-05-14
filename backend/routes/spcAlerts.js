const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, parseAIJson } = require('./aiHelper');

function checkOpenRouterKey(res) {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-key-here') {
    res.status(503).json({ error: 'OpenRouter API key not configured.' });
    return false;
  }
  return true;
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM spc_alerts');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM spc_alerts ORDER BY triggered_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching SPC alerts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM spc_alerts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'SPC alert not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { equipment_id, parameter_name, rule_violated, current_value, control_limit_upper, control_limit_lower, center_line, severity, process_step, description } = req.body;
    const result = await pool.query(
      `INSERT INTO spc_alerts (equipment_id, parameter_name, rule_violated, current_value, control_limit_upper, control_limit_lower, center_line, severity, process_step, description, triggered_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
      [equipment_id, parameter_name, rule_violated, current_value, control_limit_upper, control_limit_lower, center_line, severity || 'warning', process_step, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { equipment_id, parameter_name, rule_violated, current_value, control_limit_upper, control_limit_lower, center_line, severity, process_step, description, status } = req.body;
    const result = await pool.query(
      `UPDATE spc_alerts SET equipment_id=COALESCE($1,equipment_id), parameter_name=COALESCE($2,parameter_name), rule_violated=COALESCE($3,rule_violated), current_value=COALESCE($4,current_value), control_limit_upper=COALESCE($5,control_limit_upper), control_limit_lower=COALESCE($6,control_limit_lower), center_line=COALESCE($7,center_line), severity=COALESCE($8,severity), process_step=COALESCE($9,process_step), description=COALESCE($10,description), status=COALESCE($11,status), updated_at=NOW() WHERE id=$12 RETURNING *`,
      [equipment_id, parameter_name, rule_violated, current_value, control_limit_upper, control_limit_lower, center_line, severity, process_step, description, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'SPC alert not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { acknowledged_by, notes } = req.body;
    const result = await pool.query(
      `UPDATE spc_alerts SET status='acknowledged', acknowledged_by=$1, acknowledged_at=NOW(), notes=COALESCE($2,notes), updated_at=NOW() WHERE id=$3 RETURNING *`,
      [acknowledged_by, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'SPC alert not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM spc_alerts WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'SPC alert not found' });
    res.json({ message: 'SPC alert deleted successfully', deleted: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/spc-alerts/evaluate - Western Electric Rules engine
router.post('/evaluate', async (req, res) => {
  try {
    const paramsResult = await pool.query(`
      SELECT DISTINCT parameter_name, equipment_id, process_step,
        AVG(target_value) as center, AVG(upper_limit) as ucl, AVG(lower_limit) as lcl
      FROM process_parameters GROUP BY parameter_name, equipment_id, process_step
    `);
    const violations = [];
    for (const param of paramsResult.rows) {
      const readings = await pool.query(
        `SELECT target_value as value, upper_limit, lower_limit FROM process_parameters
         WHERE parameter_name=$1 AND equipment_id=$2 ORDER BY created_at DESC LIMIT 25`,
        [param.parameter_name, param.equipment_id]
      );
      const values = readings.rows.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
      if (values.length < 3 || !param.ucl || !param.lcl) continue;
      const center = parseFloat(param.center);
      const ucl = parseFloat(param.ucl);
      const lcl = parseFloat(param.lcl);
      const sigma = (ucl - lcl) / 6;
      if (sigma <= 0) continue;
      const twoUp = center + 2 * sigma;
      const twoDn = center - 2 * sigma;
      // Rule 1: point beyond 3sigma
      for (const v of values) {
        if (v > ucl || v < lcl) {
          const r = await pool.query(
            `INSERT INTO spc_alerts (equipment_id,parameter_name,rule_violated,current_value,control_limit_upper,control_limit_lower,center_line,severity,process_step,description,triggered_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
            [param.equipment_id, param.parameter_name, 'Rule 1: Point beyond 3sigma', v, ucl, lcl, center, 'critical', param.process_step, `Value ${v} outside 3sigma limits [${lcl},${ucl}]`]
          );
          violations.push(r.rows[0]);
          break;
        }
      }
      // Rule 2: 2 of 3 beyond 2sigma
      for (let i = 0; i <= values.length - 3; i++) {
        const w = [values[i], values[i+1], values[i+2]];
        if (w.filter(v => v > twoUp || v < twoDn).length >= 2) {
          const r = await pool.query(
            `INSERT INTO spc_alerts (equipment_id,parameter_name,rule_violated,current_value,control_limit_upper,control_limit_lower,center_line,severity,process_step,description,triggered_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
            [param.equipment_id, param.parameter_name, 'Rule 2: 2 of 3 beyond 2sigma', values[i], ucl, lcl, center, 'warning', param.process_step, `2 of 3 consecutive values beyond 2sigma [${twoDn.toFixed(3)},${twoUp.toFixed(3)}]`]
          );
          violations.push(r.rows[0]);
          break;
        }
      }
    }
    res.json({ evaluated_parameters: paramsResult.rows.length, violations_found: violations.length, alerts_created: violations });
  } catch (err) {
    console.error('SPC eval error:', err);
    res.status(500).json({ error: 'SPC evaluation failed', details: err.message });
  }
});

// POST /api/spc-alerts/:id/analyze-pattern - AI pattern analysis (Apply pass 4)
router.post('/:id/analyze-pattern', aiRateLimiter, async (req, res) => {
  try {
    if (!checkOpenRouterKey(res)) return;
    const { id } = req.params;
    const alertResult = await pool.query('SELECT * FROM spc_alerts WHERE id=$1', [id]);
    if (alertResult.rows.length === 0) return res.status(404).json({ error: 'SPC alert not found' });
    const alert = alertResult.rows[0];

    // Pull recent process readings on the same parameter and equipment for context
    const history = await pool.query(
      `SELECT target_value as value, upper_limit, lower_limit, created_at
       FROM process_parameters
       WHERE parameter_name=$1 AND equipment_id=$2
       ORDER BY created_at DESC LIMIT 30`,
      [alert.parameter_name, alert.equipment_id]
    );

    const systemPrompt = `You are an SPC and process engineering expert. Always respond with valid JSON only.`;
    const userMessage = `Analyze this SPC violation and the recent reading window. Identify the most likely Western Electric / Nelson rule patterns, the probable root causes (drift, shift, cyclic, mixture, trend), and recommended next-step investigations.

Alert: ${JSON.stringify({
  rule_violated: alert.rule_violated,
  parameter_name: alert.parameter_name,
  equipment_id: alert.equipment_id,
  process_step: alert.process_step,
  current_value: alert.current_value,
  ucl: alert.control_limit_upper,
  lcl: alert.control_limit_lower,
  center_line: alert.center_line,
  severity: alert.severity,
  description: alert.description,
})}
Recent readings (newest first): ${JSON.stringify(history.rows)}

Return JSON: {
  "detected_patterns": [{"pattern": string, "evidence": string, "rule_reference": string}],
  "primary_root_cause_hypotheses": [{"cause": string, "rationale": string, "likelihood_0_to_100": number}],
  "secondary_root_cause_hypotheses": [string],
  "recommended_investigations": [{"step": string, "owner_role": string, "expected_outcome": string}],
  "containment_actions": [string],
  "process_drift_estimate_per_window": string,
  "tool_health_concerns": [string],
  "data_quality_caveats": [string]
}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const analysis = parseAIJson(aiResponse);
    if (!analysis) {
      console.error('SPC analyze-pattern invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }

    await pool.query(
      `INSERT INTO ai_results (endpoint,entity_type,entity_id,user_id,prompt_summary,result,model) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      ['/spc-alerts/analyze-pattern', 'spc_alert', id, req.user?.id || null, `SPC pattern analysis: ${alert.parameter_name}`, JSON.stringify(analysis), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.json({ alert_id: id, parameter_name: alert.parameter_name, analysis });
  } catch (err) {
    console.error('SPC analyze-pattern error:', err);
    res.status(500).json({ error: 'SPC pattern analysis failed', details: err.message });
  }
});

module.exports = router;
