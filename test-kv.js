require('dotenv').config({ path: '.env.local' });
const { kv } = require('@vercel/kv');

async function test() {
  try {
    console.log("Testing write...");
    await kv.set('test_key', 'Hello Vercel!');
    console.log("Testing read...");
    const val = await kv.get('test_key');
    console.log("Result: ", val);
  } catch(e) {
    console.error("KV Error: ", e);
  }
}
test();
