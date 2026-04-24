const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter } = require('./aiHelper');

// GET /api/wafer-defects - Get all wafer defects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM wafer_defects ORDER BY detected_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wafer defects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wafer-defects/:id - Get wafer defect by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM wafer_defects WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wafer defect not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wafer-defects - Create a new wafer defect
router.post('/', async (req, res) => {
  try {
    const {
      wafer_lot_id, defect_type, location_x, location_y, size_um,
      severity, layer, process_step, image_url, description
    } = req.body;

    const result = await pool.query(
      `INSERT INTO wafer_defects
       (wafer_lot_id, defect_type, location_x, location_y, size_um,
        severity, layer, process_step, image_url, description, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [wafer_lot_id, defect_type, location_x, location_y, size_um,
       severity, layer, process_step, image_url, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/wafer-defects/:id - Update a wafer defect
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wafer_lot_id, defect_type, location_x, location_y, size_um,
      severity, layer, process_step, image_url, description
    } = req.body;

    const result = await pool.query(
      `UPDATE wafer_defects SET
       wafer_lot_id = COALESCE($1, wafer_lot_id),
       defect_type = COALESCE($2, defect_type),
       location_x = COALESCE($3, location_x),
       location_y = COALESCE($4, location_y),
       size_um = COALESCE($5, size_um),
       severity = COALESCE($6, severity),
       layer = COALESCE($7, layer),
       process_step = COALESCE($8, process_step),
       image_url = COALESCE($9, image_url),
       description = COALESCE($10, description),
       updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [wafer_lot_id, defect_type, location_x, location_y, size_um,
       severity, layer, process_step, image_url, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wafer defect not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wafer-defects/:id - Delete a wafer defect
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM wafer_defects WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wafer defect not found' });
    }

    res.json({ message: 'Wafer defect deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wafer-defects/classify - AI-powered defect classification
router.post('/classify', async (req, res) => {
  try {
    const { defect_id, location_x, location_y, size_um, layer, process_step, description } = req.body;

    const systemPrompt = `You are an expert semiconductor wafer defect classification system used in advanced fab environments. You specialize in identifying and classifying wafer defects based on their physical characteristics, location, and process context.

Known defect types and their characteristics:
- PARTICLE: Foreign material on wafer surface. Typically random locations, various sizes. Common after deposition or etch steps.
- SCRATCH: Linear surface damage from mechanical contact. Appears as elongated marks, often from handling or CMP.
- PATTERN: Systematic defects related to lithography. Usually repeating across die, related to mask or exposure issues.
- VOID: Missing material in deposited films. Can indicate poor step coverage or outgassing during deposition.
- BRIDGING: Unwanted connections between features. Common in metal layers, indicates over-etching or lithography issues.
- RESIDUE: Leftover material after processing. Often from incomplete etch or strip processes.
- CRACK: Mechanical fracture in the wafer or film. Can propagate and cause catastrophic failure.
- CONTAMINATION: Chemical or metallic contamination. Detected by composition analysis, affects electrical properties.
- DELAMINATION: Film separation from substrate or underlayer. Indicates adhesion failure or stress issues.
- CORROSION: Chemical degradation of metal layers. Often from moisture or process chemical exposure.

Respond in valid JSON format with these fields:
- classification: The defect type (one of the types above)
- confidence: A number between 0 and 1 indicating classification confidence
- reasoning: Brief explanation of why this classification was chosen
- severity_assessment: "critical", "major", "minor", or "cosmetic"
- recommended_action: Suggested corrective action
- potential_root_causes: Array of possible root causes`;

    const userMessage = `Classify this wafer defect:
- Location: (${location_x}, ${location_y})
- Size: ${size_um} micrometers
- Layer: ${layer}
- Process Step: ${process_step}
- Description: ${description}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);

    let classification;
    try {
      classification = JSON.parse(aiResponse);
    } catch {
      classification = { raw_response: aiResponse, classification: 'UNKNOWN', confidence: 0 };
    }

    // If defect_id provided, update the record with AI classification
    if (defect_id) {
      await pool.query(
        `UPDATE wafer_defects SET
         defect_type = $1,
         ai_confidence = $2,
         classified_by_ai = true,
         ai_classification_data = $3,
         updated_at = NOW()
         WHERE id = $4`,
        [classification.classification, classification.confidence, JSON.stringify(classification), defect_id]
      );
    }

    res.json({ defect_id, classification });
  } catch (err) {
    console.error('Error classifying defect:', err);
    res.status(500).json({ error: 'AI classification failed', details: err.message });
  }
});

module.exports = router;
