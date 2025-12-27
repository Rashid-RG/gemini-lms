import { NextResponse } from 'next/server';

/**
 * Search YouTube for videos related to course topics
 * Uses YouTube Data API v3
 */
export async function POST(req) {
  try {
    const { chapters, topic, courseType } = await req.json();

    if (!chapters || !Array.isArray(chapters)) {
      return NextResponse.json({ error: 'Invalid chapters data' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn('YouTube API key not configured. Skipping video search.');
      return NextResponse.json({ videos: {}, errors: [] });
    }

    const videos = {};
    const errors = [];

    // Flag to track if YouTube API is quota exceeded
    let quotaExceeded = false;

    // Search for videos for each chapter ONLY (skip topic-level searches to reduce API calls)
    for (const chapter of chapters) {
      // Skip if quota is already exceeded
      if (quotaExceeded) {
        videos[chapter.chapter_title] = [];
        continue;
      }

      try {
        // Use chapter title + course topic for search query
        const searchQuery = chapter.chapter_title 
          ? `${topic} ${chapter.chapter_title}`.slice(0, 100)
          : topic;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per chapter

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?` +
          `part=snippet&` +
          `q=${encodeURIComponent(searchQuery)}&` +
          `type=video&` +
          `maxResults=3&` +
          `order=relevance&` +
          `key=${apiKey}&` +
          `videoDuration=medium`,
          { 
            headers: { 'User-Agent': 'Gemini-LMS' },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const reason = body?.error?.errors?.[0]?.reason || body?.error?.message || 'Unknown YouTube API error';
          console.error(`YouTube API error for chapter "${chapter.chapter_title}": ${response.status} ${reason}`);
          
          // Check if quota exceeded - if so, skip remaining searches
          if (reason === 'quotaExceeded' || response.status === 403) {
            quotaExceeded = true;
            console.warn('YouTube API quota exceeded. Skipping remaining video searches.');
          }
          
          errors.push({ scope: 'chapter', chapter: chapter.chapter_title, status: response.status, reason });
          videos[chapter.chapter_title] = [];
          continue;
        }

        const data = await response.json();

        // Transform YouTube response - get 2-3 videos per chapter
        const chapterVideos = (data.items || []).slice(0, 3).map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.default.url,
          channel: item.snippet.channelTitle,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        }));

        videos[chapter.chapter_title] = chapterVideos;

      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`⏱️ YouTube search timeout for chapter "${chapter.chapter_title}" (5s timeout)`);
          errors.push({ scope: 'chapter', chapter: chapter.chapter_title, status: 408, reason: 'timeout' });
        } else {
          console.error(`Error searching videos for chapter "${chapter.chapter_title}":`, error.message);
          errors.push({ scope: 'chapter', chapter: chapter.chapter_title, status: 500, reason: error.message });
        }
        videos[chapter.chapter_title] = [];
      }
    }

    return NextResponse.json({ videos, errors });
  } catch (err) {
    console.error('YouTube search error:', err);
    return NextResponse.json(
      { error: 'Failed to search YouTube videos', details: err.message },
      { status: 500 }
    );
  }
}
