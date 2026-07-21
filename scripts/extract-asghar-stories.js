#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env.local");
require("dotenv").config({ path: envPath });

const CHANNEL_ID = "UCrMjpbQDZsgBCTDuIE7w7rg";
const UPLOADS_PLAYLIST_ID = `UU${CHANNEL_ID.slice(2)}`;
const TEMP_DIR = path.join(__dirname, "..", "temp-video");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "asghar-stories.json");
const SUB_LANGS = ["hi-orig", "hi"];

function validateEnv() {
  if (!process.env.YOUTUBE_API_KEY) {
    console.error("Missing YOUTUBE_API_KEY in .env.local");
    process.exit(1);
  }
}

async function fetchAllPlaylistVideoIds() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const allVideoIds = [];
  let pageToken = null;

  console.log("Fetching all video IDs from uploads playlist...");

  while (true) {
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${UPLOADS_PLAYLIST_ID}&maxResults=50&key=${apiKey}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) break;

    allVideoIds.push(...data.items.map((item) => item.contentDetails.videoId));

    if (allVideoIds.length % 200 === 0 || !data.nextPageToken) {
      console.log(`  Fetched ${allVideoIds.length} video IDs...`);
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return allVideoIds;
}

async function fetchViewCounts(videoIds) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const videos = [];

  console.log(`\nFetching view counts for ${videoIds.length} videos...`);

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${batch.join(",")}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    for (const item of data.items || []) {
      videos.push({
        videoId: item.id,
        title: item.snippet.title,
        viewCount: Number.parseInt(item.statistics?.viewCount || "0", 10),
        url: `https://www.youtube.com/watch?v=${item.id}`,
      });
    }

    if ((i + 50) % 200 === 0 || i + 50 >= videoIds.length) {
      console.log(`  Processed ${Math.min(i + 50, videoIds.length)}/${videoIds.length} videos...`);
    }
  }

  return videos;
}

function getTopPopularVideos(videos, count) {
  const sorted = [...videos].sort((a, b) => b.viewCount - a.viewCount);
  return sorted.slice(0, count);
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function tryExtractSubtitles(videoId, lang) {
  const outputTemplate = path.join(TEMP_DIR, videoId);
  const cmd = `yt-dlp --write-auto-sub --sub-lang ${lang} --skip-download --sub-format json3 -o "${outputTemplate}" "https://www.youtube.com/watch?v=${videoId}"`;

  try {
    execSync(cmd, { stdio: "pipe", timeout: 60000 });
  } catch (err) {
    // yt-dlp may warn but still produce the file
  }

  const json3Path = `${outputTemplate}.${lang}.json3`;
  const vttPath = `${outputTemplate}.${lang}.vtt`;

  if (fs.existsSync(json3Path)) {
    const raw = fs.readFileSync(json3Path, "utf-8");
    fs.unlinkSync(json3Path);
    const parsed = JSON.parse(raw);
    const text = parsed.events
      ?.filter((e) => e.segs)
      .map((e) => e.segs.map((s) => s.utf8).join(""))
      .join("")
      .replace(/\n+/g, " ")
      .trim();
    return text || null;
  }

  if (fs.existsSync(vttPath)) {
    const raw = fs.readFileSync(vttPath, "utf-8");
    fs.unlinkSync(vttPath);
    return cleanVtt(raw);
  }

  return null;
}

function extractSubtitles(videoId) {
  for (const lang of SUB_LANGS) {
    const text = tryExtractSubtitles(videoId, lang);
    if (text) return { text, lang };
  }
  return null;
}

function cleanVtt(vttContent) {
  const lines = vttContent.split("\n");
  const textLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "WEBVTT") continue;
    if (trimmed.startsWith("Kind:") || trimmed.startsWith("Language:")) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) continue;
    if (trimmed === "align:start position:0%") continue;
    textLines.push(trimmed);
  }

  return textLines.join(" ").replace(/\s+/g, " ").trim() || null;
}

function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEMP_DIR, file));
    }
    fs.rmdirSync(TEMP_DIR);
  }
}

async function main() {
  try {
    validateEnv();

    const count = parseInt(process.argv[2], 10) || 100;

    ensureTempDir();

    const allVideoIds = await fetchAllPlaylistVideoIds();
    console.log(`\nTotal videos found: ${allVideoIds.length}`);

    const allVideos = await fetchViewCounts(allVideoIds);
    const topVideos = getTopPopularVideos(allVideos, count);

    console.log(`\nTop ${count} most popular videos:`);
    topVideos.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.title} (${v.viewCount.toLocaleString()} views)`);
    });

    // Load existing data to skip already-processed videos
    let existing = { videos: [] };
    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
        console.log(`\nFound existing data: ${existing.videos.length} videos (${existing.videos.filter(v => v.hasTranscript).length} with transcripts)`);
      } catch { }
    }
    const existingMap = new Map(existing.videos.map(v => [v.videoId, v]));
    const newIds = topVideos.map(v => v.videoId);
    const skipped = newIds.filter(id => existingMap.has(id));
    const toProcess = topVideos.filter(v => !existingMap.has(v.videoId));

    console.log(`\nSkipping ${skipped.length} already-processed videos, extracting ${toProcess.length} new...`);

    console.log("\nExtracting transcripts...");

    const output = {
      channel: "Asghar Hussain Duroodi",
      channelId: CHANNEL_ID,
      extractedAt: new Date().toISOString(),
      totalVideos: topVideos.length,
      videosWithTranscript: 0,
      videos: [...existing.videos],
    };

    for (let i = 0; i < toProcess.length; i++) {
      const video = toProcess[i];
      console.log(`  [${i + 1}/${toProcess.length}] ${video.title}`);
      const result = extractSubtitles(video.videoId);

      output.videos.push({
        videoId: video.videoId,
        title: video.title,
        url: video.url,
        viewCount: video.viewCount,
        transcript: result?.text || null,
        transcriptLang: result?.lang || null,
        hasTranscript: Boolean(result?.text),
      });

      output.videosWithTranscript = output.videos.filter((r) => r.hasTranscript).length;

      console.log(`    ${result ? `Transcript found (${result.lang})` : "No transcript available"}`);

      if ((i + 1) % 5 === 0 || i === toProcess.length - 1) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
        console.log(`    [Saved ${i + 1}/${toProcess.length}]`);
      }
    }

    // Re-sort all videos by view count descending and take top N
    output.videos.sort((a, b) => b.viewCount - a.viewCount);
    output.videos = output.videos.slice(0, count);
    output.totalVideos = output.videos.length;
    output.videosWithTranscript = output.videos.filter((r) => r.hasTranscript).length;
    output.extractedAt = new Date().toISOString();

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
    console.log(`\nOutput saved to: ${OUTPUT_FILE}`);
    console.log(`Videos with transcript: ${output.videosWithTranscript}/${output.totalVideos}`);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
