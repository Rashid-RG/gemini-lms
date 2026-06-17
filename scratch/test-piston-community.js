const axios = require("axios");

async function testInstance(url) {
    console.log(`Testing instance: ${url}...`);
    try {
        const response = await axios.post(url, {
            language: "javascript",
            version: "18.15.0",
            files: [
                {
                    content: "console.log('Hello from Piston community instance!')"
                }
            ]
        }, {
            timeout: 5000
        });
        console.log(`SUCCESS [${url}]:`, response.data.run?.output || response.data);
        return true;
    } catch (err) {
        console.error(`FAILED [${url}]:`, err.message || err);
        return false;
    }
}

async function run() {
    await testInstance("https://piston.31173.xyz/api/v2/piston/execute");
    await testInstance("https://piston.31173.xyz/api/v2/execute");
}

run();
