#!/usr/bin/env python3
"""Upload a rendered manuscript story to the authenticated YouTube channel."""

from __future__ import annotations

import argparse
import os
import re
import sys
import secrets
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data" / "durood-stories.md"
DEFAULT_VIDEO_ROOT = ROOT / "publishing" / "durood-stories" / "videos"
TOKEN_PATH = ROOT / ".youtube-oauth-token.json"
ENV_PATH = ROOT / ".env.local"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"]
STORIES_URL = "https://durood.live"
APP_URL = "https://play.google.com/store/apps/details?id=com.duroodepak"
HASHTAGS = "#DuroodStories #DuroodSharif #IslamicStories #AsgharHussainDuroodi #MuslimsBelieve"


def load_local_env() -> None:
    if not ENV_PATH.exists():
        return
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        match = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$", raw)
        if match and not match.group(1) in os.environ:
            value = match.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ[match.group(1)] = value


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--story", type=int, help="Upload a rendered story by manuscript story number")
    target.add_argument("--file", type=Path, help="Upload a specified MP4")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--video-root", type=Path, default=DEFAULT_VIDEO_ROOT)
    parser.add_argument("--privacy", choices=("private", "unlisted", "public"), default="public")
    parser.add_argument("--title", help="Override the title")
    parser.add_argument("--description", help="Override the description")
    parser.add_argument("--tags", default="Durood Stories,Islamic stories,Durood Sharif", help="Comma-separated YouTube tags")
    parser.add_argument("--category", default="22", help="YouTube category ID (22 = People & Blogs)")
    parser.add_argument("--dry-run", action="store_true", help="Show the planned upload without authenticating or uploading")
    parser.add_argument("--reauth", action="store_true", help="Start a fresh Google authorization instead of using the local token")
    parser.add_argument("--authorize-only", action="store_true", help="Authorize the YouTube account and save a local token; do not upload")
    args = parser.parse_args()
    if args.authorize_only and (args.story or args.file):
        parser.error("--authorize-only cannot be combined with --story or --file")
    if not args.authorize_only and not (args.story or args.file):
        parser.error("provide --story or --file, or use --authorize-only")
    return parser, args


def story_video(story_num: int, source: Path, video_root: Path, require_video: bool = True):
    import importlib.util
    renderer_path = ROOT / "scripts" / "create-durood-story-videos.py"
    spec = importlib.util.spec_from_file_location("durood_video_renderer", renderer_path)
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    stories = renderer.parse_stories(source.read_text(encoding="utf-8"))
    story = next((entry for entry in stories if entry["number"] == story_num), None)
    if story is None:
        raise ValueError(f"Story {story_num} not found in {source}")
    slug = re.sub(r"[^a-z0-9]+", "-", story["title"].lower()).strip("-") or f"story-{story_num}"
    path = video_root / f"{story_num:02d}-{slug}" / f"{story_num:02d}-{slug}.mp4"
    if require_video and not path.is_file():
        raise FileNotFoundError(f"Rendered video not found: {path}. Render it first with create-durood-story-videos.py")
    return story, path


def google_service(reauth: bool = False):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build

    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise RuntimeError("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local")

    credentials = None
    if TOKEN_PATH.is_file() and not reauth:
        credentials = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            # Match the sibling repo's localhost OAuth callback so the same
            # Google OAuth client configuration works here.
            redirect_uri = "http://localhost:34567"
            config = {"web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }}
            flow = Flow.from_client_config(config, scopes=SCOPES, redirect_uri=redirect_uri)
            auth_url, state = flow.authorization_url(access_type="offline", prompt="consent")
            result = {}

            class CallbackHandler(BaseHTTPRequestHandler):
                def do_GET(self):
                    query = parse_qs(urlparse(self.path).query)
                    if not secrets.compare_digest(query.get("state", [""])[0], state):
                        result["error"] = "OAuth state mismatch"
                        self.send_error(400, "OAuth state mismatch")
                    elif query.get("error"):
                        result["error"] = query["error"][0]
                        self.send_error(400, "Google authorization failed")
                    else:
                        result["code"] = query.get("code", [""])[0]
                        self.send_response(200)
                        self.send_header("Content-Type", "text/html; charset=utf-8")
                        self.end_headers()
                        self.wfile.write(b"<h2>Authorization complete. You may close this tab.</h2>")

                def log_message(self, _format, *_args):
                    pass

            server = HTTPServer(("localhost", 34567), CallbackHandler)
            server.timeout = 300
            print("Opening Google authorization in your browser...")
            webbrowser.open(auth_url)
            try:
                server.handle_request()
            finally:
                server.server_close()
            if result.get("error"):
                raise RuntimeError(f"Google authorization failed: {result['error']}")
            if not result.get("code"):
                raise RuntimeError("Timed out waiting for Google authorization callback on localhost:34567")
            flow.fetch_token(code=result["code"])
            credentials = flow.credentials
        TOKEN_PATH.write_text(credentials.to_json(), encoding="utf-8")

    return build("youtube", "v3", credentials=credentials, cache_discovery=False)


def main() -> int:
    parser, args = parse_args()
    load_local_env()
    try:
        if args.authorize_only:
            google_service(args.reauth)
            print(f"YouTube authorization saved locally to {TOKEN_PATH.name}; no video uploaded.")
            return 0

        if args.story:
            story, video_path = story_video(args.story, args.source, args.video_root, require_video=not args.dry_run)
            default_title = f"{story['number']}. {story['title']} | Durood Stories"
        else:
            story, video_path = None, args.file.resolve()
            if not video_path.is_file():
                raise FileNotFoundError(f"Video file not found: {video_path}")
            default_title = video_path.stem.replace("-", " ").title()

        title = args.title or default_title
        if story:
            renderer_path = ROOT / "scripts" / "create-durood-story-videos.py"
            import importlib.util
            spec = importlib.util.spec_from_file_location("durood_video_renderer", renderer_path)
            renderer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(renderer)
            full_story = "\n\n".join(renderer.plain_text(paragraph) for paragraph in story["paragraphs"])
            default_description = f"{full_story}\n\nRead more similar stories: {STORIES_URL}\nDownload the Durood Moments app: {APP_URL}\n\n{HASHTAGS}"
        else:
            default_description = f"Read more similar stories: {STORIES_URL}\nDownload the Durood Moments app: {APP_URL}\n\n{HASHTAGS}"
        description = args.description or default_description
        tags = [tag.strip() for tag in args.tags.split(",") if tag.strip()]
        print(f"Video: {video_path}")
        print(f"Title: {title}")
        print(f"Privacy: {args.privacy}")
        if args.dry_run:
            print("Dry run only; nothing uploaded.")
            return 0

        youtube = google_service(args.reauth)
        from googleapiclient.http import MediaFileUpload
        body = {
            "snippet": {"title": title, "description": description, "tags": tags, "categoryId": args.category},
            "status": {"privacyStatus": args.privacy, "selfDeclaredMadeForKids": False},
        }
        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=MediaFileUpload(str(video_path), mimetype="video/mp4", resumable=True),
        )
        result = None
        while result is None:
            _, result = request.next_chunk()
        video_id = result["id"]
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        print(f"Uploaded: {video_url}")
        comment = f"Download the Durood Moments app on Google Play: {APP_URL}"
        try:
            youtube.commentThreads().insert(
                part="snippet",
                body={"snippet": {"videoId": video_id, "topLevelComment": {"snippet": {"textOriginal": comment}}}},
            ).execute()
            print(f"Posted app download link comment: {APP_URL}")
        except Exception as error:
            print(f"Video uploaded, but the app-link comment could not be posted: {error}", file=sys.stderr)
        return 0
    except Exception as error:
        print(f"Upload failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
