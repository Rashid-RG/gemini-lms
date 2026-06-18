const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function testYoutube() {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error("No YouTube API key configured in environment.");
        return;
    }
    
    console.log(`Testing YouTube API key starting with: "${apiKey.slice(0, 8)}..."`);
    
    const query = "React JS Tutorial";
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            console.error("YouTube API error:", response.status, data.error?.message || data);
        } else {
            console.log("YouTube API SUCCESS!");
            console.log("Video Result:", JSON.stringify(data.items?.[0]?.snippet?.title || data, null, 2));
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

testYoutube();
