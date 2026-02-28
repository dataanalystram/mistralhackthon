import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '../../.env') });

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function test() {
  try {
    const response = await client.chat.complete({
      model: 'voxtral-mini-latest',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              inputAudio: "dummy_base64_string"
            },
            {
              type: 'text',
              text: 'test'
            }
          ]
        }
      ]
    });
    console.log("Success");
  } catch(e) {
    console.error(e.message);
  }
}
test();
