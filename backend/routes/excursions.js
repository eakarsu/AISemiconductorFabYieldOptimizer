const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter, parseAIJson } = require('./aiHelper');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// POST /api/excursions/:lotId/war-room
router.post('/:lotId/war-room', aiRateLimiter, async (req, res) => {
  try {
    const { lotId } = req.params;

    // Fetch lot info
    const lotResult = await pool.query('SELECT * FROM wafer_lots WHERE lot_number=$1 OR id::text=$1', [lotId]);
    const lot = lotResult.rows[0] || { lot_number: lotId };

    // Fetch recent equipment maintenance logs as proxy for equipment logs
    const equipLogs = await pool.query('SELECT * FROM maintenance_schedules ORDER BY scheduled_date DESC LIMIT 10');

    // Fetch recipe history (process recipes used recently)
    const recipeHistory = await pool.query('SELECT * FROM process_recipes ORDER BY updated_at DESC LIMIT 5');

    // Fetch related SPC alerts (active/unacknowledged)
    const spcAlerts = await pool.query("SELECT * FROM spc_alerts WHERE status='active' ORDER BY triggered_at DESC LIMIT 15");

    // Fetch defects for this lot
    const defects = await pool.query('SELECT * FROM wafer_defects WHERE wafer_lot_id=$1 ORDER BY detected_at DESC', [lotId]);

    const systemPrompt = `You are an expert semiconductor yield excursion war room AI. Your job is to perform rapid root cause analysis during active yield excursions.
Analyze all available data and produce a structured cause chain with suspect tools and recommended actions.
Respond only in valid JSON format.`;

    const userMessage = `EXCURSION WAR ROOM ANALYSIS for Lot: ${lotId}

Lot Information: ${JSON.stringify(lot)}

Defects Found: ${JSON.stringify(defects.rows)}

Active SPC Alerts: ${JSON.stringify(spcAlerts.rows)}

Equipment Maintenance History: ${JSON.stringify(equipLogs.rows)}

Recent Recipe History: ${JSON.stringify(recipeHistory.rows)}

Provide structured war room analysis as JSON:
{
  "excursion_summary": string,
  "severity_level": "critical|high|medium|low",
  "estimated_yield_impact_percent": number,
  "cause_chain": [
    { "step": number, "cause": string, "evidence": string, "confidence": number }
  ],
  "suspect_tools": [
    { "equipment_id": string, "reason": string, "confidence": number, "action": string }
  ],
  "recommended_actions": [
    { "priority": number, "action": string, "owner": string, "timeline": string, "expected_impact": string }
  ],
  "lots_at_risk": string[],
  "containment_steps": string[],
  "monitoring_plan": string
}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const warRoom = parseAIJson(aiResponse);

    if (!warRoom) {
      console.error('War room AI returned invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }

    // Persist to excursion_war_rooms
    const saved = await pool.query(
      `INSERT INTO excursion_war_rooms (lot_id,cause_chain,suspect_tools,recommended_actions,ai_raw_response) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [lotId, JSON.stringify(warRoom.cause_chain), JSON.stringify(warRoom.suspect_tools), JSON.stringify(warRoom.recommended_actions), aiResponse]
    );

    // Persist to ai_results
    await pool.query(
      `INSERT INTO ai_results (endpoint,entity_type,user_id,prompt_summary,result,model) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['/excursions/war-room', 'excursion', req.user.id, `War room lot: ${lotId}`, JSON.stringify(warRoom), 'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ lot_id: lotId, war_room_id: saved.rows[0].id, analysis: warRoom });
  } catch (err) {
    console.error('War room error:', err);
    res.status(500).json({ error: 'War room analysis failed', details: err.message });
  }
});

// GET /api/excursions/:lotId/war-room - list past war rooms for lot
router.get('/:lotId/war-room', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM excursion_war_rooms WHERE lot_id=$1 ORDER BY created_at DESC', [req.params.lotId]);
    res.json({ data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
