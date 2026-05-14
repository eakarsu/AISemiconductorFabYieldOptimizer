const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { callOpenRouter, parseAIJson } = require('./aiHelper');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// Multer setup: store uploads in /uploads/wafer-images
const uploadDir = path.join(__dirname, '../../uploads/wafer-images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `wafer-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// GET /api/wafer-defects - paginated
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const fabId = req.user.fab_id || null;

    const countQ = fabId
      ? await pool.query('SELECT COUNT(*) FROM wafer_defects WHERE fab_id = $1', [fabId])
      : await pool.query('SELECT COUNT(*) FROM wafer_defects');
    const total = parseInt(countQ.rows[0].count);

    const dataQ = fabId
      ? await pool.query(
          'SELECT * FROM wafer_defects WHERE fab_id = $1 ORDER BY detected_at DESC LIMIT $2 OFFSET $3',
          [fabId, limit, offset]
        )
      : await pool.query(
          'SELECT * FROM wafer_defects ORDER BY detected_at DESC LIMIT $1 OFFSET $2',
          [limit, offset]
        );

    res.json({
      data: dataQ.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error fetching wafer defects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wafer-defects/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM wafer_defects WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Wafer defect not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wafer-defects
router.post('/', async (req, res) => {
  try {
    const {
      wafer_lot_id, defect_type, location_x, location_y, size_um,
      severity, layer, process_step, image_url, description, fab_id,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO wafer_defects
       (wafer_lot_id, defect_type, location_x, location_y, size_um,
        severity, layer, process_step, image_url, description, fab_id, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [wafer_lot_id, defect_type, location_x, location_y, size_um,
       severity, layer, process_step, image_url, description, fab_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/wafer-defects/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      wafer_lot_id, defect_type, location_x, location_y, size_um,
      severity, layer, process_step, image_url, description,
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
    if (result.rows.length === 0) return res.status(404).json({ error: 'Wafer defect not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/wafer-defects/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM wafer_defects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Wafer defect not found' });
    res.json({ message: 'Wafer defect deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting wafer defect:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/wafer-defects/:id/upload-image - multer image upload
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const imageUrl = `/uploads/wafer-images/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE wafer_defects SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [imageUrl, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Wafer defect not found' });

    res.json({ message: 'Image uploaded successfully', image_url: imageUrl, defect: result.rows[0] });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Image upload failed', details: err.message });
  }
});

// POST /api/wafer-defects/:id/analyze-image - vision AI analysis
router.post('/:id/analyze-image', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const defectResult = await pool.query('SELECT * FROM wafer_defects WHERE id = $1', [id]);
    if (defectResult.rows.length === 0) return res.status(404).json({ error: 'Wafer defect not found' });

    const defect = defectResult.rows[0];
    if (!defect.image_url) return res.status(400).json({ error: 'No image associated with this defect' });

    // Read image as base64
    const imagePath = path.join(__dirname, '../../', defect.image_url);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found on server' });
    }
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');

    const systemPrompt = `You are an expert semiconductor SEM (Scanning Electron Microscope) image analysis AI.
Analyze wafer defect images and provide detailed classification with precise location and confidence metrics.
Always respond in valid JSON format.`;

    const userMessage = `Analyze this semiconductor wafer defect image.
Context: Layer=${defect.layer || 'unknown'}, Process Step=${defect.process_step || 'unknown'}, Known Size=${defect.size_um || 'unknown'} um

Provide a JSON response with:
{
  "defect_type": "PARTICLE|SCRATCH|PATTERN|VOID|BRIDGING|RESIDUE|CRACK|CONTAMINATION|DELAMINATION|CORROSION",
  "confidence": 0.0-1.0,
  "location": { "zone": "center|edge|ring|random", "x_estimate": number, "y_estimate": number },
  "size_estimate_um": number,
  "severity": "critical|major|minor|cosmetic",
  "visual_characteristics": "description of what is seen",
  "probable_cause": "most likely manufacturing cause",
  "recommended_action": "specific action to take",
  "kill_probability": 0.0-1.0
}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage, imageBase64);
    const classification = parseAIJson(aiResponse);

    if (!classification) {
      console.error('Vision AI returned invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response', raw: aiResponse });
    }

    // Persist to ai_classification_data
    await pool.query(
      `UPDATE wafer_defects SET
       classified_by_ai = true,
       defect_type = COALESCE($1, defect_type),
       ai_confidence = $2,
       ai_classification_data = $3,
       updated_at = NOW()
       WHERE id = $4`,
      [classification.defect_type, classification.confidence, JSON.stringify(classification), id]
    );

    // Persist to ai_results
    await pool.query(
      `INSERT INTO ai_results (endpoint, entity_type, entity_id, user_id, prompt_summary, result, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['/wafer-defects/analyze-image', 'wafer_defect', id, req.user.id,
       'Vision-based defect classification', JSON.stringify(classification),
       'anthropic/claude-3-5-sonnet-20241022']
    );

    res.json({ defect_id: id, classification });
  } catch (err) {
    console.error('Error analyzing image:', err);
    res.status(500).json({ error: 'Vision analysis failed', details: err.message });
  }
});

// POST /api/wafer-defects/classify - text-based AI defect classification
router.post('/classify', aiRateLimiter, async (req, res) => {
  try {
    const { defect_id, location_x, location_y, size_um, layer, process_step, description } = req.body;

    const systemPrompt = `You are an expert semiconductor wafer defect classification system. Respond only in valid JSON format.
Known defect types: PARTICLE, SCRATCH, PATTERN, VOID, BRIDGING, RESIDUE, CRACK, CONTAMINATION, DELAMINATION, CORROSION.`;

    const userMessage = `Classify this wafer defect:
- Location: (${location_x}, ${location_y})
- Size: ${size_um} micrometers
- Layer: ${layer}
- Process Step: ${process_step}
- Description: ${description}

Respond with JSON: { "classification": string, "confidence": number, "reasoning": string, "severity_assessment": string, "recommended_action": string, "potential_root_causes": string[] }`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const classification = parseAIJson(aiResponse);

    if (!classification) {
      console.error('AI classify returned invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }

    if (defect_id) {
      await pool.query(
        `UPDATE wafer_defects SET
         defect_type = $1, ai_confidence = $2, classified_by_ai = true,
         ai_classification_data = $3, updated_at = NOW()
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
