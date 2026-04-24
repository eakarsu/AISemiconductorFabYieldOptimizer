const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { callOpenRouter } = require('./aiHelper');

// GET /api/defect-patterns - Get all defect patterns
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM defect_patterns ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching defect patterns:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/defect-patterns/:id - Get defect pattern by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM defect_patterns WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect pattern not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching defect pattern:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/defect-patterns - Create a new defect pattern
router.post('/', async (req, res) => {
  try {
    const {
      pattern_name, pattern_type, defect_count, affected_area_percentage,
      wafer_zone, process_step, equipment_id, signature, first_detected, description
    } = req.body;

    const result = await pool.query(
      `INSERT INTO defect_patterns
       (pattern_name, pattern_type, defect_count, affected_area_percentage,
        wafer_zone, process_step, equipment_id, signature, first_detected, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [pattern_name, pattern_type, defect_count, affected_area_percentage,
       wafer_zone, process_step, equipment_id, signature ? JSON.stringify(signature) : null,
       first_detected, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating defect pattern:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/defect-patterns/:id - Update a defect pattern
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pattern_name, pattern_type, defect_count, affected_area_percentage,
      wafer_zone, process_step, equipment_id, signature, first_detected, description
    } = req.body;

    const result = await pool.query(
      `UPDATE defect_patterns SET
       pattern_name = COALESCE($1, pattern_name),
       pattern_type = COALESCE($2, pattern_type),
       defect_count = COALESCE($3, defect_count),
       affected_area_percentage = COALESCE($4, affected_area_percentage),
       wafer_zone = COALESCE($5, wafer_zone),
       process_step = COALESCE($6, process_step),
       equipment_id = COALESCE($7, equipment_id),
       signature = COALESCE($8, signature),
       first_detected = COALESCE($9, first_detected),
       description = COALESCE($10, description),
       updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [pattern_name, pattern_type, defect_count, affected_area_percentage,
       wafer_zone, process_step, equipment_id,
       signature ? JSON.stringify(signature) : null,
       first_detected, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect pattern not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating defect pattern:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/defect-patterns/:id - Delete a defect pattern
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM defect_patterns WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Defect pattern not found' });
    }

    res.json({ message: 'Defect pattern deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting defect pattern:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/defect-patterns/recognize - AI-powered pattern recognition
router.post('/recognize', async (req, res) => {
  try {
    const { defects, wafer_map_data, process_step, equipment_id } = req.body;

    const systemPrompt = `You are an expert semiconductor defect pattern recognition AI. You analyze spatial distributions of defects on wafers to identify systematic patterns that indicate specific root causes.

Known wafer defect patterns you can identify:
- EDGE RING: Defects concentrated at wafer edge, often from edge exclusion, clamp marks, or edge bead removal issues
- CENTER CLUSTER: Defects clustered at wafer center, indicating gas flow or temperature non-uniformity
- RADIAL PATTERN: Defects following radial symmetry, often from spin-coat or CMP processes
- SCRATCH LINES: Linear defect patterns from mechanical contact or handling damage
- ARC PATTERN: Curved defect lines from rotational contact or robotic handling
- REPEATING DIE PATTERN: Same defects on every die at same position, indicating mask defect or reticle issue
- ZONE PATTERN: Defects concentrated in specific wafer zones (notch area, flat zone, specific quadrants)
- RANDOM: No discernible pattern, typically from particle contamination
- HOT SPOT: Localized high-density defect cluster, often from equipment-specific issue
- RING PATTERN: Concentric ring of defects, common from CMP or spin processes
- HALF-MOON: Defects on one half of wafer, indicating directional process non-uniformity
- COMET TAIL: Streak-like pattern from particle dragging during processing

For each pattern, consider:
- Spatial distribution statistics (centroid, spread, orientation)
- Defect density map analysis
- Correlation with equipment geometry (showerhead pattern, plasma distribution)
- Historical pattern matching from known issues

Respond in valid JSON format with:
- identified_patterns: Array of { pattern_type, confidence, affected_region, defect_count }
- primary_pattern: The dominant pattern with detailed description
- spatial_analysis: Statistical summary of defect distribution
- probable_causes: Array of likely root causes ranked by probability
- recommended_investigations: Next steps to confirm pattern source
- severity_assessment: Impact on yield and device performance`;

    const userMessage = `Analyze these wafer defects for patterns:
- Number of defects: ${Array.isArray(defects) ? defects.length : 'N/A'}
- Defect data: ${JSON.stringify(defects)}
- Wafer map data: ${JSON.stringify(wafer_map_data || 'N/A')}
- Process Step: ${process_step || 'N/A'}
- Equipment ID: ${equipment_id || 'N/A'}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);

    let patternAnalysis;
    try {
      patternAnalysis = JSON.parse(aiResponse);
    } catch {
      patternAnalysis = { raw_response: aiResponse };
    }

    res.json({ defect_count: Array.isArray(defects) ? defects.length : 0, patternAnalysis });
  } catch (err) {
    console.error('Error recognizing defect patterns:', err);
    res.status(500).json({ error: 'AI pattern recognition failed', details: err.message });
  }
});

module.exports = router;
