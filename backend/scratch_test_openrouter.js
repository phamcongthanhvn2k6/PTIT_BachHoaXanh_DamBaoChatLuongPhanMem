import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const models = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'google/gemma-4-31b-it:free'
];

async function run() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return;

  for (const model of models) {
    try {
      console.log(`\n--- Trying model: ${model} with JSON Mode ---`);
      const start = Date.now();
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Return a JSON containing {"greeting": "hello"} only.' }],
          response_format: { type: 'json_object' }
        }),
      });
      console.log(`Status: ${res.status} ${res.statusText} (${Date.now() - start}ms)`);
      const data = await res.json();
      if (res.ok) {
        console.log('Success response:', JSON.stringify(data.choices?.[0]?.message?.content));
      } else {
        console.log('Error response:', JSON.stringify(data.error));
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
  }
}

run();
