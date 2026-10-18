#!/usr/bin/env python3
"""Generate and publicly upload the next Durood story in the daily queue."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "durood-stories.md"
STATE_FILE = ROOT / ".durood-daily-state.json"
VIDEO_SCRIPT = ROOT / "scripts" / "create-durood-story-videos.py"
UPLOAD_SCRIPT = ROOT / "scripts" / "upload-durood-story.py"
LOG_FILE = ROOT / "publishing" / "durood-stories" / "videos" / "daily-upload.log"
START_STORY = 2


def stories_in_source() -> list[dict]:
    import importlib.util
    spec = importlib.util.spec_from_file_location("durood_renderer", VIDEO_SCRIPT)
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    return renderer.parse_stories(SOURCE.read_text(encoding="utf-8"))


def load_next_story() -> int:
    if not STATE_FILE.exists():
        return START_STORY
    state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return int(state.get("nextStory", START_STORY))


def save_state(next_story: int, last_story: int, video_id: str | None) -> None:
    state = {
        "nextStory": next_story,
        "lastUploadedStory": last_story,
        "lastVideoId": video_id,
        "updatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    temporary = STATE_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    temporary.replace(STATE_FILE)


def log(text: str) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().astimezone().isoformat(timespec="seconds")
    with LOG_FILE.open("a", encoding="utf-8") as output:
        output.write(f"[{stamp}] {text.rstrip()}\n")
    print(text, end="" if text.endswith("\n") else "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Show the next story without rendering or uploading")
    args = parser.parse_args()
    try:
        stories = stories_in_source()
        next_story = load_next_story()
        available = {entry["number"] for entry in stories}
        if next_story not in available:
            log(f"Queue complete: no manuscript story {next_story}; nothing to upload.")
            return 0
        entry = next(item for item in stories if item["number"] == next_story)
        log(f"Daily queue selected story {next_story}: {entry['title']}")
        if args.dry_run:
            print("Dry run only; no video rendered or uploaded.")
            return 0

        for command in (
            [sys.executable, "-u", str(VIDEO_SCRIPT), str(next_story), "--overwrite"],
            [sys.executable, "-u", str(UPLOAD_SCRIPT), "--story", str(next_story), "--privacy", "public"],
        ):
            result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
            log(result.stdout)
            if result.returncode:
                log(f"Command failed with exit code {result.returncode}; queue remains on story {next_story}.")
                return result.returncode

        video_match = re.search(r"https://www\.youtube\.com/watch\?v=([A-Za-z0-9_-]+)", result.stdout)
        save_state(next_story + 1, next_story, video_match.group(1) if video_match else None)
        log(f"Story {next_story} complete; next scheduled upload is story {next_story + 1}.")
        return 0
    except Exception as error:
        log(f"Daily upload failed: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
