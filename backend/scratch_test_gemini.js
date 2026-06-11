import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

async function run() {
  const apiKey = process.env.GEMINI_RECIPE_KEY;
  if (!apiKey) {
    console.error('No API key found in GEMINI_RECIPE_KEY');
    return;
  }

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash-exp'
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello in 5 words.');
      const response = await result.response;
      console.log(`✅ Success with ${modelName}:`, response.text().trim());
      break;
    } catch (err) {
      console.error(`❌ Failed with ${modelName}:`, err.message);
    }
  }

  // Also query Google API directly to list models
  try {
    console.log('\nQuerying Google API to list models...');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(` - ${m.name}`);
        }
      });
    } else {
      console.log('Could not retrieve models list:', data);
    }
  } catch (err) {
    console.error('Failed to list models:', err.message);
  }
}

run();
