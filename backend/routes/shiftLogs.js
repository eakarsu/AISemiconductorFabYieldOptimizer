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

// POST /api/shift-logs/digest - apply pass 4
// Body: { shift_label, raw_log_entries (text or array), context? }
// Returns an AI-generated shift digest: events of interest, anomalies, follow-ups, handoff notes.
router.post('/digest', aiRateLimiter, async (req, res) => {
  try {
    if (!checkOpenRouterKey(res)) return;

    const { shift_label, raw_log_entries, context } = req.body || {};
    if (!raw_log_entries) {
      return res.status(400).json({ error: 'raw_log_entries is required (string or array)' });
    }

    const normalized = Array.isArray(raw_log_entries)
      ? raw_log_entries.filter((x) => typeof x === 'string' || typeof x === 'object').map((x) =>
          typeof x === 'string' ? x : JSON.stringify(x)
        ).join('\n')
      : String(raw_log_entries);

    if (Buffer.byteLength(normalized, 'utf8') > 80 * 1024) {
      return res.status(400).json({ error: 'raw_log_entries exceeds 80KB limit' });
    }

    const systemPrompt = `You are a semiconductor fab shift-handoff AI. Read raw shift log entries and produce a structured digest for the next shift. Always respond with valid JSON.`;
    const userMessage = `Shift label: ${shift_label || 'unspecified'}
Context (optional): ${context || 'none'}

Raw shift log entries (chronological):
${normalized}

Return JSON: {
  "shift_summary": string,
  "lots_processed_or_touched": [{"lot_or_id": string, "operation": string, "status": string}],
  "events_of_interest": [{"timestamp_or_position": string, "category": "yield|equipment|safety|process|materials|other", "description": string, "severity": "low|medium|high|critical"}],
  "anomalies_or_excursions": [{"description": string, "suspected_cause": string, "containment_done": string}],
  "open_followups_for_next_shift": [{"action": string, "owner_role": string, "priority": "low|medium|high"}],
  "equipment_status_changes": [{"equipment": string, "from_state": string, "to_state": string, "note": string}],
  "kpi_callouts": [{"metric": string, "value": string, "vs_target": string}],
  "handoff_message": string
}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const digest = parseAIJson(aiResponse);
    if (!digest) {
      console.error('shift-logs digest invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }

    await pool.query(
      `INSERT INTO ai_results (endpoint,entity_type,entity_id,user_id,prompt_summary,result,model) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      ['/shift-logs/digest', 'shift_log', null, req.user?.id || null, `Shift digest: ${shift_label || 'n/a'}`, JSON.stringify(digest), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.json({ shift_label: shift_label || null, digest });
  } catch (err) {
    console.error('shift-logs digest error:', err);
    res.status(500).json({ error: 'Shift log digest failed', details: err.message });
  }
});

module.exports = router;
