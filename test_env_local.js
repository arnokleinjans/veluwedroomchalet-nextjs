require('dotenv').config({ path: '.env.local' });
console.log("Local ENV check:");
console.log("- KV_REST_API_URL:", !!process.env.KV_REST_API_URL);
console.log("- KV_REST_API_TOKEN:", !!process.env.KV_REST_API_TOKEN);
