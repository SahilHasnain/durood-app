#!/usr/bin/env node

const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { existsSync, mkdirSync, unlinkSync, statSync } = require("fs");
const { Client, Databases, Query, Storage, ID } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");
const { dirname, extname, join, basename } = require("path");
const readline = require("readline");

dotenv.config({ path: ".env.local" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
const VIDEOS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_VIDEOS_COLLECTION_ID;
const CHANNELS_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID;
const VIDEO_BUCKET_ID = process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID;

const args = process.argv.slice(2);
const limit =
  parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1], 10) || null;
const testMode = args.includes("--test");
const quality =
  parseInt(args.find((arg) => arg.startsWith("--quality="))?.split("=")[1], 10) || 720;

if (![480, 720, 1080].includes(quality)) {
  console.error("Invalid quality. Must be 480, 720, or 1080");
  process.exit(1);
}

const TEMP_DIR = join(process.cwd(), "temp-video");

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

function validateEnv() {
  const required = [
    ["APPWRITE_API_KEY", APPWRITE_API_KEY],
    ["EXPO_PUBLIC_APPWRITE_DATABASE_ID", DATABASE_ID],
    ["EXPO_PUBLIC_APPWRITE_VIDEOS_COLLECTION_ID", VIDEOS_COLLECTION_ID],
    ["EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID", CHANNELS_COLLECTION_ID],
    ["EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID", VIDEO_BUCKET_ID],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (!APPWRITE_ENDPOINT) {
    missing.push("APPWRITE_ENDPOINT or EXPO_PUBLIC_APPWRITE_ENDPOINT");
  }

  if (!APPWRITE_PROJECT_ID) {
    missing.push("APPWRITE_PROJECT_ID or EXPO_PUBLIC_APPWRITE_PROJECT_ID");
  }

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((name) => console.error(`- ${name}`));
    process.exit(1);
  }
}

function runCommand(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`${command} failed with code ${code}${stderr ? `: ${stderr}` : ""}`)
        );
      }
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to spawn ${command}: ${error.message}`));
    });
  });
}

async function getVideoCodec(filePath) {
  const { stdout } = await runCommand("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  return stdout.trim().toLowerCase();
}

async function ensureH264Compatible(filePath) {
  const codec = await getVideoCodec(filePath);
  console.log(`  Video codec: ${codec || "unknown"}`);

  if (codec === "h264") {
    return filePath;
  }

  const transcodedPath = join(
    dirname(filePath),
    `${basename(filePath, extname(filePath))}_h264.mp4`
  );

  console.log("  Transcoding to H.264/AAC for Android compatibility...");

  await runCommand("ffmpeg", [
    "-y",
    "-i",
    filePath,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    transcodedPath,
  ]);

  const transcodedCodec = await getVideoCodec(transcodedPath);
  if (transcodedCodec !== "h264") {
    throw new Error(`Transcode failed, resulting codec is ${transcodedCodec}`);
  }

  console.log("  Transcoded successfully");
  return transcodedPath;
}

function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`Created temp directory: ${TEMP_DIR}`);
  }
}

async function downloadVideo(youtubeId, title) {
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, "_").substring(0, 50);
  const outputPath = join(TEMP_DIR, `${youtubeId}_${sanitizedTitle}.mp4`);

  console.log(`  Downloading: ${title}`);
  console.log(`  YouTube ID: ${youtubeId}`);
  console.log(`  Target Quality: ${quality}p`);

  return new Promise((resolve, reject) => {
    const formatString = `bestvideo[vcodec^=avc1][height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[vcodec^=avc1][height<=${quality}][ext=mp4]/bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`;

    const ytdlp = spawn("yt-dlp", [
      "-f",
      formatString,
      "--merge-output-format",
      "mp4",
      "--max-filesize",
      "500M",
      "--no-playlist",
      "-o",
      outputPath,
      `https://www.youtube.com/watch?v=${youtubeId}`,
    ]);

    let errorOutput = "";

    ytdlp.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ytdlp.stdout.on("data", () => {
      process.stdout.write(".");
    });

    ytdlp.on("close", (code) => {
      console.log("");

      if (code !== 0) {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
        return;
      }

      if (!existsSync(outputPath)) {
        reject(new Error("Download completed but output file was not created"));
        return;
      }

      resolve(outputPath);
    });

    ytdlp.on("error", (error) => {
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });
  });
}

async function uploadVideoFile(filePath, youtubeId) {
  console.log("  Uploading to Appwrite Storage...");

  const fileName = `${youtubeId}.mp4`;
  const fileSize = statSync(filePath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log(`  File size: ${fileSizeMB}MB`);

  if (fileSize > 500 * 1024 * 1024) {
    throw new Error(`File too large: ${fileSizeMB}MB (max 500MB)`);
  }

  const file = await storage.createFile(
    VIDEO_BUCKET_ID,
    ID.unique(),
    InputFile.fromPath(filePath, fileName)
  );

  console.log(`  Uploaded: ${file.$id}`);
  return file.$id;
}

async function updateVideoWithVideoId(videoDocId, storageFileId) {
  await databases.updateDocument(DATABASE_ID, VIDEOS_COLLECTION_ID, videoDocId, {
    videoId: storageFileId,
  });
  console.log("  Updated video document with videoId");
}

function cleanupTempFile(filePath) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log("  Cleaned up temp file");
    }
  } catch (error) {
    console.warn(`  Failed to cleanup: ${error.message}`);
  }
}

async function processVideo(video, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${video.title}`);

  let tempFilePath = null;
  let uploadFilePath = null;

  try {
    tempFilePath = await downloadVideo(video.youtubeId, video.title);
    uploadFilePath = await ensureH264Compatible(tempFilePath);

    if (!testMode) {
      const storageFileId = await uploadVideoFile(uploadFilePath, video.youtubeId);
      await updateVideoWithVideoId(video.$id, storageFileId);
    } else {
      console.log("  Test mode: skipping upload");
    }

    console.log("  Success");
    return { success: true, videoId: video.$id };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return { success: false, videoId: video.$id, error: error.message };
  } finally {
    if (tempFilePath && !testMode) {
      cleanupTempFile(tempFilePath);
    }
    if (uploadFilePath && uploadFilePath !== tempFilePath && !testMode) {
      cleanupTempFile(uploadFilePath);
    }
  }
}

async function fetchAllVideosWithoutFile(userLimit = null, uploadMode = "all", selectedChannelIds = null) {
  const batchSize = 100;
  let allVideos = [];
  let offset = 0;
  let hasMore = true;

  console.log("Fetching videos from database in batches...");

  while (hasMore) {
    const response = await databases.listDocuments(DATABASE_ID, VIDEOS_COLLECTION_ID, [
      Query.equal("videoId", ""),
      Query.limit(batchSize),
      Query.offset(offset),
    ]);

    let batch = response.documents;

    if (selectedChannelIds && selectedChannelIds.length > 0) {
      batch = batch.filter((video) => selectedChannelIds.includes(video.channelId));
    }

    if (uploadMode === "shorts") {
      batch = batch.filter((video) => video.duration < 60);
    } else if (uploadMode === "videos") {
      batch = batch.filter((video) => video.duration >= 60);
    }

    allVideos.push(...batch);

    console.log(`  Fetched batch: ${batch.length} videos (total: ${allVideos.length})`);

    hasMore = response.documents.length === batchSize;
    offset += batchSize;

    if (userLimit && allVideos.length >= userLimit) {
      allVideos = allVideos.slice(0, userLimit);
      hasMore = false;
    }
  }

  return allVideos;
}

async function main() {
  validateEnv();

  console.log("Video Download and Upload Script (Durood App)\n");
  console.log("Configuration:");
  console.log(`  Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`  Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`  Database: ${DATABASE_ID}`);
  console.log(`  Collection: ${VIDEOS_COLLECTION_ID}`);
  console.log(`  Bucket: ${VIDEO_BUCKET_ID}`);
  console.log(`  Quality: ${quality}p`);
  console.log(`  Limit: ${limit || "All videos"}`);
  console.log(`  Mode: ${testMode ? "Test (no upload)" : "Full (download + upload)"}\n`);

  console.log("Fetching channels from database...");
  const channelsResponse = await databases.listDocuments(DATABASE_ID, CHANNELS_COLLECTION_ID, [
    Query.limit(100),
  ]);

  const allChannels = channelsResponse.documents;
  console.log(`Found ${allChannels.length} channel(s) in database\n`);

  let selectedChannelIds = null;

  if (allChannels.length > 0) {
    console.log("Available channels:");
    allChannels.forEach((channel, index) => {
      console.log(`  ${index + 1}. ${channel.name} (${channel.youtubeChannelId})`);
    });

    console.log("\nWhich channels do you want to upload videos from?");
    console.log("  Enter numbers separated by commas, or press Enter for all channels.");
    const selectionInput = await question("\nSelection (default: all): ");

    if (selectionInput.trim()) {
      const selectedIndices = selectionInput
        .split(",")
        .map((value) => parseInt(value.trim(), 10) - 1)
        .filter((index) => !Number.isNaN(index) && index >= 0 && index < allChannels.length);

      if (selectedIndices.length > 0) {
        const selectedChannels = selectedIndices.map((index) => allChannels[index]);
        selectedChannelIds = selectedChannels.map((channel) => channel.youtubeChannelId);
        console.log(`Selected ${selectedChannels.length} channel(s):`);
        selectedChannels.forEach((channel) => console.log(`  - ${channel.name}`));
        console.log("");
      } else {
        console.log("Invalid selection, processing all channels.\n");
      }
    } else {
      console.log("Will process all channels.\n");
    }
  }

  console.log("What do you want to upload?");
  console.log("  1. Shorts only (< 60 seconds)");
  console.log("  2. Videos only (>= 60 seconds)");
  console.log("  3. All");
  const uploadChoice = await question("\nChoice (1/2/3, default: 3): ");

  let uploadMode = "all";
  if (uploadChoice.trim() === "1") {
    uploadMode = "shorts";
  } else if (uploadChoice.trim() === "2") {
    uploadMode = "videos";
  }

  console.log(`Selected mode: ${uploadMode}\n`);

  ensureTempDir();

  const videos = await fetchAllVideosWithoutFile(limit, uploadMode, selectedChannelIds);
  console.log(`Found ${videos.length} videos without uploaded files\n`);

  if (videos.length === 0) {
    console.log("No videos to process. All videos already uploaded.");
    rl.close();
    return;
  }

  const results = [];
  for (let index = 0; index < videos.length; index += 1) {
    const result = await processVideo(videos[index], index, videos.length);
    results.push(result);

    if (index < videos.length - 1) {
      console.log("  Waiting 3 seconds before next download...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(`\nTotal processed: ${results.length}`);
  console.log(`Successful: ${results.filter((result) => result.success).length}`);
  console.log(`Failed: ${results.filter((result) => !result.success).length}`);

  const failed = results.filter((result) => !result.success);
  if (failed.length > 0) {
    console.log("\nFailed videos:");
    failed.forEach((result) => {
      console.log(`  - ${result.videoId}: ${result.error}`);
    });
  }

  console.log(testMode ? "\nTest completed." : "\nDone. All video files uploaded.");
  rl.close();
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  rl.close();
  process.exit(1);
});
