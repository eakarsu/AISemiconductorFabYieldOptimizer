const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function callOpenRouter(systemPrompt, userMessage, imageBase64 = null) {
  const messages = [{ role: 'system', content: systemPrompt }];

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        { type: 'text', text: userMessage },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'anthropic/claude-3-5-sonnet-20241022',
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
      'X-Title': 'Semiconductor Fab Yield Optimizer',
    },
  });
  return response.data.choices[0].message.content;
}

/**
 * 3-strategy JSON parser:
 * 1. Direct JSON.parse
 * 2. Extract JSON block from markdown
 * 3. Extract first {...} or [...] substring
 */
function parseAIJson(raw) {
  // Strategy 1: direct parse
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // Strategy 2: markdown code block extraction
  const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) {
    try {
      return JSON.parse(mdMatch[1].trim());
    } catch (_) {}
  }

  // Strategy 3: find first balanced { or [
  const start = raw.search(/[{\[]/);
  if (start !== -1) {
    const opener = raw[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === opener) depth++;
      if (raw[i] === closer) depth--;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1));
        } catch (_) {
          break;
        }
      }
    }
  }

  return null;
}

module.exports = { callOpenRouter, parseAIJson };
