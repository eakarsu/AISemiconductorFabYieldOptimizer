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
    const countQ = await pool.query('SELECT COUNT(*) FROM process_recipes');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM process_recipes ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM process_recipes WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Process recipe not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { recipe_name, process_type, technology_node, version, equipment_type, steps, parameters, approved_by, status } = req.body;
    const result = await pool.query(
      `INSERT INTO process_recipes (recipe_name,process_type,technology_node,version,equipment_type,steps,parameters,approved_by,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [recipe_name, process_type, technology_node, version || '1.0', equipment_type, steps ? JSON.stringify(steps) : null, parameters ? JSON.stringify(parameters) : null, approved_by, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { recipe_name, process_type, technology_node, version, equipment_type, steps, parameters, approved_by, status } = req.body;
    const result = await pool.query(
      `UPDATE process_recipes SET recipe_name=COALESCE($1,recipe_name),process_type=COALESCE($2,process_type),technology_node=COALESCE($3,technology_node),version=COALESCE($4,version),equipment_type=COALESCE($5,equipment_type),steps=COALESCE($6,steps),parameters=COALESCE($7,parameters),approved_by=COALESCE($8,approved_by),status=COALESCE($9,status),updated_at=NOW() WHERE id=$10 RETURNING *`,
      [recipe_name, process_type, technology_node, version, equipment_type, steps ? JSON.stringify(steps) : null, parameters ? JSON.stringify(parameters) : null, approved_by, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Process recipe not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM process_recipes WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Process recipe not found' });
    res.json({ message: 'Process recipe deleted successfully', deleted: result.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/process-recipes/:id/optimize
router.post('/:id/optimize', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const recipeResult = await pool.query('SELECT * FROM process_recipes WHERE id=$1', [id]);
    if (recipeResult.rows.length === 0) return res.status(404).json({ error: 'Process recipe not found' });
    const recipe = recipeResult.rows[0];
    const params = await pool.query('SELECT * FROM process_parameters WHERE recipe_id=$1', [recipe.recipe_name]);
    const yieldData = await pool.query('SELECT predicted_yield,actual_yield,features_used FROM yield_predictions ORDER BY created_at DESC LIMIT 20');
    const systemPrompt = `You are an expert semiconductor process recipe optimization AI. Respond with valid JSON only.`;
    const userMessage = `Optimize this recipe for yield:
Recipe: ${JSON.stringify({ name: recipe.recipe_name, type: recipe.process_type, node: recipe.technology_node, parameters: recipe.parameters })}
Parameter Limits: ${JSON.stringify(params.rows)}
Historical Yield: ${JSON.stringify(yieldData.rows)}
Return JSON: { "current_estimated_yield": number, "optimized_estimated_yield": number, "yield_improvement_percent": number, "parameter_adjustments": [{"parameter":string,"current_value":number,"suggested_value":number,"reason":string,"yield_impact_percent":number}], "optimization_strategy": string, "risk_assessment": string, "implementation_priority": string, "validation_steps": string[] }`;
    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const optimization = parseAIJson(aiResponse);
    if (!optimization) {
      console.error('Recipe optimizer invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }
    await pool.query(
      `INSERT INTO ai_results (endpoint,entity_type,entity_id,user_id,prompt_summary,result,model) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      ['/process-recipes/optimize', 'process_recipe', id, req.user.id, `Optimize recipe: ${recipe.recipe_name}`, JSON.stringify(optimization), 'anthropic/claude-3-5-sonnet-20241022']
    );
    res.json({ recipe_id: id, recipe_name: recipe.recipe_name, optimization });
  } catch (err) {
    console.error('Recipe optimization error:', err);
    res.status(500).json({ error: 'Recipe optimization failed', details: err.message });
  }
});

// POST /api/process-recipes/recommend - Apply pass 4 mechanical
function checkOpenRouterKey(res) {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-key-here') {
    res.status(503).json({ error: 'OpenRouter API key not configured.' });
    return false;
  }
  return true;
}

router.post('/recommend', aiRateLimiter, async (req, res) => {
  try {
    if (!checkOpenRouterKey(res)) return;
    const { process_type, technology_node, equipment_type, target_yield, constraints, notes } = req.body || {};
    if (!process_type) return res.status(400).json({ error: 'process_type is required' });

    // Pull a small reference set from existing recipes of similar type for grounding
    const reference = await pool.query(
      `SELECT recipe_name, technology_node, version, equipment_type, parameters
       FROM process_recipes
       WHERE process_type=$1
       ORDER BY created_at DESC LIMIT 5`,
      [process_type]
    );

    const systemPrompt = `You are a semiconductor process recipe expert. Always respond with valid JSON only.`;
    const userMessage = `Recommend a new process recipe given the constraints below. Use the reference recipes only as informational context — do not copy them.

Process type: ${process_type}
Technology node: ${technology_node || 'unspecified'}
Equipment type: ${equipment_type || 'unspecified'}
Target yield (%): ${target_yield || 'unspecified'}
Constraints: ${constraints || 'none'}
Notes: ${notes || 'none'}
Reference recipes: ${JSON.stringify(reference.rows)}

Return JSON: {
  "recommended_recipe_name": string,
  "process_type": string,
  "technology_node": string,
  "equipment_type": string,
  "version": "1.0",
  "steps": [{"step_number": number, "name": string, "duration_seconds": number, "key_setpoints": [{"parameter": string, "value": number, "unit": string}], "purpose": string}],
  "parameters": [{"name": string, "target": number, "lower_limit": number, "upper_limit": number, "unit": string}],
  "expected_yield_estimate_pct": number,
  "rationale": string,
  "risk_assessment": string,
  "validation_plan": [string],
  "alternates_to_test": [string]
}`;

    const aiResponse = await callOpenRouter(systemPrompt, userMessage);
    const recommendation = parseAIJson(aiResponse);
    if (!recommendation) {
      console.error('Recipe recommend invalid JSON:', aiResponse);
      return res.status(422).json({ error: 'AI returned invalid JSON response' });
    }

    await pool.query(
      `INSERT INTO ai_results (endpoint,entity_type,entity_id,user_id,prompt_summary,result,model) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      ['/process-recipes/recommend', 'process_recipe', null, req.user?.id || null, `Recipe recommend: ${process_type}/${technology_node || 'n/a'}`, JSON.stringify(recommendation), 'anthropic/claude-3-5-sonnet-20241022']
    ).catch(() => {});

    res.json({ recommendation });
  } catch (err) {
    console.error('Recipe recommend error:', err);
    res.status(500).json({ error: 'Recipe recommendation failed', details: err.message });
  }
});

module.exports = router;
