import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '../../.env') });

const apiKey = process.env.MISTRAL_API_KEY;
console.log("Key length:", apiKey ? apiKey.length : 0);
console.log("Key extracted:", apiKey ? apiKey.substring(0, 5) + "..." : "none");

const client = new Mistral({ apiKey });
client.chat.complete({
  model: 'mistral-large-latest',
  messages: [{ role: 'user', content: 'Say hello' }],
  maxTokens: 10
}).then(res => console.log("Success:", res.choices[0].message.content))
  .catch(err => console.error("Error:", err.message));
