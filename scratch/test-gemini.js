const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function testKey(keyName, keyVal) {
    if (!keyVal) {
        console.log(`[${keyName}] Not configured.`);
        return;
    }
    console.log(`[${keyName}] Testing key starting with: "${keyVal.slice(0, 8)}..."`);
    try {
        const genAI = new GoogleGenerativeAI(keyVal);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Say 'hello' in exactly one word.");
        console.log(`[${keyName}] SUCCESS: "${result.response.text().trim()}"`);
    } catch (err) {
        console.error(`[${keyName}] FAILED:`, err.message || err);
    }
}

async function run() {
    await testKey("GEMINI_API_KEY", process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    await testKey("GEMINI_API_KEY_2", process.env.NEXT_PUBLIC_GEMINI_API_KEY_2);
    await testKey("GEMINI_API_KEY_3", process.env.NEXT_PUBLIC_GEMINI_API_KEY_3);
}

run();
