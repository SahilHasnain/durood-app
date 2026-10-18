# Durood Stories narrated video workflow

This workflow creates one narrated, captioned 16:9 MP4 per story using **`data/durood-stories.md` as the source of truth**. Story numbering and titles come from headings of the form `## 1. Story title`; narration and captions are derived from the Markdown paragraphs. Markdown emphasis and links are stripped for speech without changing the manuscript.

## Requirements

- Python 3.10 or newer
- FFmpeg with `ffmpeg` and `ffprobe` available on `PATH`
- Network access while generating audio (Microsoft Edge TTS service)
- A Google OAuth client configured for YouTube Data API uploads (needed only to upload)

Install the Python dependencies from the repository root:

```sh
python -m pip install -r scripts/requirements-video.txt
```

The upload command uses the Google OAuth client ID and client secret in the root `.env.local`. The OAuth client values were copied from the sibling `naat-collection` repository; its refresh tokens were deliberately not copied. On the first upload, a browser consent flow authorizes the Google account/channel and saves its own token at `.youtube-oauth-token.json` in the repository root. That file is git-ignored. Ensure YouTube Data API v3 is enabled for the Google Cloud project and authorize the account/channel where the video should be uploaded.

## Generate

Render every story:

```sh
python scripts/create-durood-story-videos.py
```

Render one story or a selection by manuscript story number:

```sh
python scripts/create-durood-story-videos.py 1
python scripts/create-durood-story-videos.py 1 4 12
```

The default output is `publishing/durood-stories/videos/`. Each story gets its own numbered folder containing the MP4, `captions.srt`, `transcript.txt`, and `metadata.txt`. Existing MP4s are skipped; pass `--overwrite` to regenerate them.

## Voice and presentation options

```sh
python scripts/create-durood-story-videos.py 1 \
  --voice en-US-ChristopherNeural --rate=-8% --width 1920 --height 1080 \
  --fps 30 --caption-size 30
```

Choose any voice exposed by the installed `edge-tts` CLI (`edge-tts --list-voices`). Use `--source path/to/manuscript.md` to render a manuscript elsewhere and `--output path/to/videos` to choose another destination. The generated captions follow the audio duration of each paragraph and are burned into the video with a matching SRT sidecar.

## Editorial workflow

1. Edit and review the story in `data/durood-stories.md`.
2. Generate a single story first and listen/watch it; review pronunciation, pacing, and caption breaks.
3. If a name or Arabic term needs special pronunciation, keep the source wording intact and add an optional editorial pronunciation map in a future workflow extension rather than silently changing the manuscript.
4. Regenerate the approved story with `--overwrite`, then render the remaining stories.
5. Review every MP4 and subtitle file before publishing. TTS pronunciation can require human correction, especially for Arabic names and honorifics.

The generated video folders are production outputs and are not committed by default. The renderer does not modify manuscript files.

## Upload to YouTube

Uploads are public by default. The selected YouTube account/channel is determined by the Google account used in the browser authorization flow.
For a story-number upload, the description is the complete plain-text story from the manuscript, followed by links to [durood.live](https://durood.live) and the [Durood Moments app on Google Play](https://play.google.com/store/apps/details?id=com.duroodepak), plus the hashtags `#DuroodStories #DuroodSharif #IslamicStories #AsgharHussainDuroodi #MuslimsBelieve`.
After a successful upload, the workflow also posts a top-level comment with the Durood Moments Play Store download link. If comments are disabled for the video, the upload still succeeds and the script reports that the comment was not posted.

Run the browser consent flow without uploading a video:

```sh
python scripts/upload-durood-story.py --authorize-only
```

Preview the upload details without authorizing or uploading:

```sh
python scripts/upload-durood-story.py --story 1 --dry-run
```

Upload a rendered story (the first run opens the Google consent page):

```sh
python scripts/upload-durood-story.py --story 1
```

Choose a less-visible privacy setting explicitly when needed:

```sh
python scripts/upload-durood-story.py --story 1 --privacy private
python scripts/upload-durood-story.py --story 1 --privacy unlisted
```

You can also upload a specific MP4 with `--file path/to/video.mp4`; `--title`, `--description`, and `--tags` customize the YouTube metadata. To redo Google consent, pass `--reauth`.

## Daily scheduled uploads (Windows)

The local daily runner starts at story 2 and advances one story only after a successful upload. It regenerates that story, uploads it publicly, and posts the app-download comment. The next-story cursor is stored in the git-ignored `.durood-daily-state.json` file.

Run one daily cycle manually:

```sh
python scripts/daily-durood-upload.py
```

Create the local Task Scheduler task for midnight system-local time:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-durood-daily-task.ps1
```

The task has Windows Task Scheduler's `StartWhenAvailable` catch-up setting enabled and requests `WakeToRun`. If the midnight trigger is missed while the PC is off or cannot wake, Task Scheduler will run that missed daily task as soon as it detects the machine is available. The configured Windows user must be signed in for the task to access the local OAuth token, and the machine must have internet access. Use `scripts/remove-durood-daily-task.ps1` to remove the task.
