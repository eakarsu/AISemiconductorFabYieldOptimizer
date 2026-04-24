const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter } = require('./aiHelper');

// GET /api/yield-predictions - Get all yield predictions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM yield_predictions ORDER BY predicted_at DESC'
    );
    res.json(result.rows);
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

    let prediction;
    try {
      prediction = JSON.parse(aiResponse);
    } catch {
      prediction = { raw_response: aiResponse };
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

module.exports = router;
