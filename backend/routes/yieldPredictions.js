const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter, parseAIJson } = require('./aiHelper');

// GET /api/yield-predictions - paginated
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM yield_predictions');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM yield_predictions ORDER BY predicted_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching yield predictions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/yield-predictions/:id - Get yield prediction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM yield_predictions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Yield prediction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching yield prediction:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/yield-predictions - Create a new yield prediction record
router.post('/', async (req, res) => {
  try {
    const {
      wafer_lot_id, predicted_yield, actual_yield, model_version,
      prediction_type, confidence_interval_low, confidence_interval_high, features_used
    } = req.body;

    const result = await pool.query(
      `INSERT INTO yield_predictions
       (wafer_lot_id, predicted_yield, actual_yield, model_version,
        prediction_type, confidence_interval_low, confidence_interval_high, features_used, predicted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [wafer_lot_id, predicted_yield, actual_yield, model_version,
       prediction_type, confidence_interval_low, confidence_interval_high,
       features_used ? JSON.stringify(features_used) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating yield prediction:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/yield-predictions/:id - Update a yield prediction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wafer_lot_id, predicted_yield, actual_yield, model_version,
      prediction_type, confidence_interval_low, confidence_interval_high, features_used
    } = req.body;

    const result = await pool.query(
      `UPDATE yield_predictions SET
       wafer_lot_id = COALESCE($1, wafer_lot_id),
       predicted_yield = COALESCE($2, predicted_yield),
       actual_yield = COALESCE($3, actual_yield),
       model_version = COALESCE($4, model_version),
       prediction_type = COALESCE($5, prediction_type),
       confidence_interval_low = COALESCE($6, confidence_interval_low),
       confidence_interval_high = COALESCE($7, confidence_interval_high),
       features_used = COALESCE($8, features_used),
       updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [wafer_lot_id, predicted_yield, actual_yield, model_version,
       prediction_type, confidence_interval_low, confidence_interval_high,
       features_used ? JSON.stringify(features_used) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Yield prediction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating yield prediction:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/yield-predictions/:id - Delete a yield prediction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM yield_predictions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Yield prediction not found' });
    }

    res.json({ message: 'Yield prediction deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting yield prediction:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/yield-predictions/predict - AI-powered yield prediction
router.post('/predict', async (req, res) => {
  try {
    const { wafer_lot_id, lot_data, process_conditions, historical_yields, technology_node } = req.body;

    const systemPrompt = `You are an expert semiconductor yield prediction AI with deep knowledge of factors affecting die yield in advanced semiconductor manufacturing.

Key yield-influencing factors you understand:
- Defect density (D0) and its relationship to die size via Poisson/negative binomial models
- Process uniformity (within-wafer and wafer-to-wafer variation)
- Lithography overlay and CD control
- Film thickness and composition uniformity
- Contamination levels and particle counts
- Equipment health and maintenance state
- Environmental factors (cleanroom class, vibration, temperature/humidity)
- Technology node specific challenges (e.g., EUV at 5nm and below, multi-patterning)
- Electrical test parameters and their correlation to yield
- Historical lot trends and learning curve effects

Yield models you can apply:
- Poisson yield model: Y = exp(-D0 * A)
- Murphy's yield model: Y = ((1 - exp(-D0 * A)) / (D0 * A))^2
- Negative binomial: Y = (1 + D0 * A / alpha)^(-alpha)
- Empirical correlation models based on process parameters

Respond in valid JSON format with:
- predicted_yield: Percentage (0-100)
- confidence_interval: { low, high } in percentage
- yield_limiters: Array of top factors limiting yield, ordered by impact
- risk_factors: Array of identified risks that could reduce yield
- recommendations: Array of actions to improve yield
- model_explanation: Brief explanation of how the prediction was derived`;

    const userMessage = `Predict yield for this semiconductor lot:
- Wafer Lot ID: ${wafer_lot_id || 'N/A'}
- Technology Node: ${technology_node || 'N/A'}
- Lot Data: ${JSON.stringify(lot_data)}
- Process Conditions: ${JSON.stringify(process_conditions)}
- Historical Yields: ${JSON.stringify(historical_yields || 'N/A')}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const prediction = parseAIJson(aiResponse);
    if (!prediction) {
      console.error('Yield prediction AI returned invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }

    // Save prediction to database if wafer_lot_id provided
    if (wafer_lot_id && prediction.predicted_yield) {
      await pool.query(
        `INSERT INTO yield_predictions
         (wafer_lot_id, predicted_yield, model_version, prediction_type,
          confidence_interval_low, confidence_interval_high, features_used, predicted_at)
         VALUES ($1, $2, 'openrouter-ai-v1', 'ai_prediction', $3, $4, $5, NOW())`,
        [
          wafer_lot_id,
          prediction.predicted_yield,
          prediction.confidence_interval?.low || null,
          prediction.confidence_interval?.high || null,
          JSON.stringify(prediction)
        ]
      );
    }

    res.json({ wafer_lot_id, prediction });
  } catch (err) {
    console.error('Error predicting yield:', err);
    res.status(500).json({ error: 'AI prediction failed', details: err.message });
  }
});

// POST /api/yield-predictions/process-optimization - recommend parameter adjustments
router.post('/process-optimization', async (req, res) => {
  try {
    const { recipe_id, target_yield, current_parameters, constraints } = req.body || {};
    let recipe = null;
    if (recipe_id) {
      const r = await pool.query('SELECT * FROM process_recipes WHERE id = $1', [recipe_id]).catch(() => ({ rows: [] }));
      recipe = r.rows[0] || null;
    }
    const systemPrompt = `You are a semiconductor process-engineering AI. Recommend Pareto-optimal parameter adjustments that improve yield without violating constraints. Respond in valid JSON.`;
    const userMessage = `Recipe: ${JSON.stringify(recipe)}
Current parameters: ${JSON.stringify(current_parameters || {})}
Constraints: ${JSON.stringify(constraints || {})}
Target yield: ${target_yield || 'maximize'}

Return JSON: {recommendations:[{parameter,current_value,recommended_value,unit,expected_yield_delta_pct,confidence:0-1,rationale,risk:"low|medium|high"}], pareto_set:[{description,trade_off}], guard_rails_violated:[], expected_yield_after, summary}.`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const optimization = parseAIJson(aiResponse) || { raw: aiResponse };
    res.json({ recipe_id, optimization });
  } catch (err) {
    console.error('Error optimizing process:', err);
    res.status(500).json({ error: 'AI process optimization failed', details: err.message });
  }
});

// POST /api/yield-predictions/defect-prediction - predict defect types/rates
router.post('/defect-prediction', async (req, res) => {
  try {
    const { wafer_lot_id, lot_data, process_conditions, historical_defects } = req.body || {};
    const recentDefects = await pool.query('SELECT defect_type, COUNT(*) as cnt FROM wafer_defects WHERE wafer_lot_id = $1 GROUP BY defect_type', [wafer_lot_id || 0]).catch(() => ({ rows: [] }));
    const systemPrompt = `You are a defect-prediction AI for semiconductor manufacturing. Forecast defect rates by class given lot conditions. Respond in valid JSON.`;
    const userMessage = `Wafer Lot ID: ${wafer_lot_id || 'N/A'}
Lot data: ${JSON.stringify(lot_data || {})}
Process conditions: ${JSON.stringify(process_conditions || {})}
Historical defects: ${JSON.stringify(historical_defects || recentDefects.rows)}

Return JSON: {predicted_defects:[{defect_class,expected_rate_per_wafer,severity:"low|medium|high",root_cause_hypotheses:[],mitigation_recommendations:[]}], total_expected_defects, top_risk_classes:[], confidence:0-1, summary}.`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const prediction = parseAIJson(aiResponse) || { raw: aiResponse };
    res.json({ wafer_lot_id, prediction });
  } catch (err) {
    console.error('Error predicting defects:', err);
    res.status(500).json({ error: 'AI defect prediction failed', details: err.message });
  }
});

// Apply pass 4 helper for 503-on-no-key
function checkOpenRouterKey(res) {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-key-here') {
    res.status(503).json({ error: 'OpenRouter API key not configured.' });
    return false;
  }
  return true;
}

// POST /api/yield-predictions/multi-objective-optimize - apply pass 4
// Body: { current_state, objectives[] (e.g. [{name:'yield',weight:0.5,direction:'maximize'},...]), constraints?, candidate_levers? }
router.post('/multi-objective-optimize', async (req, res) => {
  try {
    if (!checkOpenRouterKey(res)) return;
    const { current_state, objectives, constraints, candidate_levers } = req.body || {};
    if (!current_state || typeof current_state !== 'object') {
      return res.status(400).json({ error: 'current_state object is required' });
    }
    if (!Array.isArray(objectives) || objectives.length === 0) {
      return res.status(400).json({ error: 'objectives must be a non-empty array' });
    }
    if (objectives.length > 8) {
      return res.status(400).json({ error: 'objectives cannot exceed 8 entries' });
    }

    const systemPrompt = `You are a fab process multi-objective optimization AI. Trade off competing objectives (yield, throughput, cost, quality, equipment wear) and produce a Pareto frontier with practical recommendations. Always respond with valid JSON.`;
    const userMessage = `Current state: ${JSON.stringify(current_state)}
Objectives (with weights and directions): ${JSON.stringify(objectives)}
Constraints: ${JSON.stringify(constraints || {})}
Candidate levers / parameters in scope: ${JSON.stringify(candidate_levers || [])}

Return JSON: {
  "pareto_options": [
    { "label": string, "lever_settings": [{"lever": string, "value": string|number, "unit": string}],
      "expected_objective_outcomes": [{"objective": string, "delta_pct": number, "absolute_estimate": string}],
      "tradeoffs": [string], "risk": "low|medium|high", "confidence_0_to_100": number }
  ],
  "recommended_balanced_option_index": number,
  "recommended_yield_first_option_index": number,
  "recommended_throughput_first_option_index": number,
  "infeasible_combinations": [string],
  "objective_conflicts": [{"a": string, "b": string, "explanation": string}],
  "summary": string
}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const optimization = parseAIJson(aiResponse) || { raw: aiResponse };
    res.json({ optimization });
  } catch (err) {
    console.error('multi-objective-optimize error:', err);
    res.status(500).json({ error: 'Multi-objective optimization failed', details: err.message });
  }
});

// POST /api/yield-predictions/equipment-health-forecast
router.post('/equipment-health-forecast', async (req, res) => {
  try {
    const { equipment_id, horizon_days } = req.body || {};
    let equipment = null, maintHist = [];
    if (equipment_id) {
      const e = await pool.query('SELECT * FROM equipment_inventory WHERE id = $1', [equipment_id]).catch(() => ({ rows: [] }));
      equipment = e.rows[0] || null;
      const m = await pool.query('SELECT * FROM maintenance_schedules WHERE equipment_id = $1 ORDER BY scheduled_at DESC LIMIT 20', [equipment_id]).catch(() => ({ rows: [] }));
      maintHist = m.rows;
    }
    const systemPrompt = `You are an equipment-health-forecast AI for fab tools. Predict failure modes and maintenance needs over the requested horizon. Respond in valid JSON.`;
    const userMessage = `Equipment: ${JSON.stringify(equipment)}
Maintenance history: ${JSON.stringify(maintHist)}
Horizon: ${horizon_days || 30} days

Return JSON: {forecast:[{day,health_score:0-100,risk_level:"low|moderate|high|critical"}], predicted_failure_modes:[{mode,probability,evidence,recommended_pm}], recommended_pm_schedule:[{action,due_in_days,priority}], expected_downtime_hours, parts_to_stage:[{part,quantity}], summary}.`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const forecast = parseAIJson(aiResponse) || { raw: aiResponse };
    res.json({ equipment_id, forecast });
  } catch (err) {
    console.error('Error forecasting equipment health:', err);
    res.status(500).json({ error: 'AI equipment health forecast failed', details: err.message });
  }
});

module.exports = router;
