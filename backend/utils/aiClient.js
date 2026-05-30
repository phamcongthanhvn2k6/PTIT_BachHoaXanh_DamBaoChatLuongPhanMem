import '../config/loadEnv.js';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash:free';
const TIMEOUT_MS = 60000;

const getApiKeyDebugStr = () => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return 'missing/empty';
  if (typeof key !== 'string') return `invalid-type(${typeof key})`;
  const trimmed = key.trim();
  if (trimmed.length === 0) return 'empty-string';
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'placeholder') return `invalid-value(${trimmed})`;
  return `present(length=${trimmed.length}, prefix=${trimmed.substring(0, 8)}...)`;
};

const hasOpenRouterKey = () => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return false;
  const trimmed = String(key).trim();
  return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== 'placeholder';
};

const hasValidModel = () => {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  if (!model) return false;
  const trimmed = String(model).trim();
  return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null';
};

const parseJsonFromText = (text) => {
  if (!text) return null;

  const cleaned = String(text)
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const sliced = cleaned.slice(first, last + 1);
      return JSON.parse(sliced);
    }
    throw new Error('AI response is not valid JSON');
  }
};

const FALLBACK_MODELS = [
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'deepseek/deepseek-v4-flash:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'poolside/laguna-xs.2:free'
];

const getModelList = () => {
  const primary = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const list = [primary];
  for (const m of FALLBACK_MODELS) {
    if (!list.includes(m)) {
      list.push(m);
    }
  }
  return list;
};

const callOpenRouter = async (messages, options = {}, isJson = false) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('AI provider is not configured');
    err.code = 'AI_NOT_READY';
    throw err;
  }

  const modelsToTry = getModelList();
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const isLastModel = i === modelsToTry.length - 1;
    
    console.info(`[aiClient] Attempting OpenRouter call with model: ${model} (attempt ${i + 1}/${modelsToTry.length})`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1000,
    };

    if (isJson) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const res = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'Lotte Mart E-Commerce',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const providerMessage = data?.error?.message || data?.message || 'AI provider request failed';
        const err = new Error(providerMessage);
        const normalizedMessage = String(providerMessage).toLowerCase();

        if (res.status === 401 || res.status === 403) {
          err.code = 'AI_AUTH_FAILED';
        } else if (res.status === 404) {
          err.code = 'AI_MODEL_NOT_FOUND';
        } else if (res.status === 429 || normalizedMessage.includes('quota') || normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many requests')) {
          err.code = 'AI_QUOTA_EXCEEDED';
        } else {
          err.code = 'AI_REQUEST_FAILED';
        }

        err.status = res.status;
        err.providerMessage = providerMessage;
        err.model = model;

        throw err;
      }

      console.info(`[aiClient] Successful OpenRouter call with model: ${model}`);
      return data;

    } catch (error) {
      clearTimeout(timeout);
      
      let normError = error;
      if (error?.name === 'AbortError') {
        normError = new Error('AI provider timed out');
        normError.code = 'AI_TIMEOUT';
      } else if (!error.code) {
        normError = new Error(error.message || 'AI provider request failed');
        normError.code = 'AI_REQUEST_FAILED';
      }
      normError.model = model;
      normError.attempt = i + 1;

      console.warn(`[aiClient] OpenRouter model ${model} failed (attempt ${i + 1}/${modelsToTry.length}) | Error: ${normError.message} | Code: ${normError.code}`);

      lastError = normError;

      // If it's an authorization error (401/403), do not retry other models because the API key itself is bad!
      if (normError.code === 'AI_AUTH_FAILED') {
        console.warn(`[aiClient] Auth failure. Skipping other fallback models.`);
        throw normError;
      }

      if (isLastModel) {
        console.error(`[aiClient] All OpenRouter models failed. Last error model: ${model} | Code: ${lastError.code}`);
        throw lastError;
      }
    }
  }
};

export const isAIClientReady = () => {
  const keyReady = hasOpenRouterKey();
  const modelReady = hasValidModel();
  const ready = keyReady && modelReady;
  console.info(`[aiClient] Readiness check: ready=${ready} | key=${getApiKeyDebugStr()} | model=${process.env.OPENROUTER_MODEL || DEFAULT_MODEL}`);
  return ready;
};

export const requestJsonCompletion = async ({ systemPrompt, userPrompt, schema, temperature = 0.1, maxTokens = 1500 }) => {
  if (!isAIClientReady()) {
    const err = new Error('AI provider is not configured');
    err.code = 'AI_NOT_READY';
    throw err;
  }

  const fullPrompt = [
    userPrompt,
    'IMPORTANT: Return only a JSON object.',
    'The output JSON must match this schema exactly:',
    JSON.stringify(schema),
  ].join('\n\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: fullPrompt }
  ];

  const response = await callOpenRouter(messages, { temperature, maxTokens }, true);
  const text = response?.choices?.[0]?.message?.content || '';

  try {
    return parseJsonFromText(text);
  } catch (err) {
    console.warn('[aiClient] Initial JSON parse failed, trying to repair...', err.message);
    const repairPrompt = [
      'Convert the following content into valid JSON object that matches the schema exactly.',
      'Do not add extra fields. Do not include markdown.',
      `Schema: ${JSON.stringify(schema)}`,
      `Content: ${text}`,
    ].join('\n\n');

    const repairMessages = [
      { role: 'user', content: repairPrompt }
    ];

    const repairResponse = await callOpenRouter(repairMessages, { temperature: 0, maxTokens }, true);
    const repairText = repairResponse?.choices?.[0]?.message?.content || '';
    return parseJsonFromText(repairText);
  }
};

export const requestTextCompletion = async ({ systemPrompt, userPrompt, temperature = 0.2, maxTokens = 500 }) => {
  if (!isAIClientReady()) {
    const err = new Error('AI provider is not configured');
    err.code = 'AI_NOT_READY';
    throw err;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await callOpenRouter(messages, { temperature, maxTokens }, false);
  const text = response?.choices?.[0]?.message?.content || '';

  if (!text) {
    const err = new Error('AI provider returned empty response');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }

  return text;
};
