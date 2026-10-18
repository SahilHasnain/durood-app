#!/usr/bin/env python3
"""Create a review-only HTML proof of the first five caption frames."""

from __future__ import annotations

import argparse
import html
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RENDERER = ROOT / "scripts" / "create-durood-story-videos.py"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--story", type=int, default=1)
    parser.add_argument("--frames", type=int, default=5)
    parser.add_argument("--output", type=Path, default=ROOT / "publishing" / "durood-stories" / "layout" / "video-layout-preview.html")
    parser.add_argument("--source", type=Path, default=ROOT / "data" / "durood-stories.md")
    args = parser.parse_args()

    spec = importlib.util.spec_from_file_location("durood_video_renderer", RENDERER)
    renderer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(renderer)
    stories = renderer.parse_stories(args.source.read_text(encoding="utf-8"))
    story = next((item for item in stories if item["number"] == args.story), None)
    if story is None:
        parser.error(f"Story {args.story} was not found in {args.source}")

    frames = []
    for paragraph in story["paragraphs"]:
        text = renderer.plain_text(paragraph)
        frames.extend(renderer.caption_chunks(text))
        if len(frames) >= args.frames:
            break
    frames = frames[:args.frames]
    escaped_title = html.escape(story["title"])
    cards = "\n".join(
        f'''<article class="review"><div class="frame" aria-label="Video frame {number}">
  <div class="frame-top"><span class="brand"><svg class="rosette" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1 19 11 27 5 21 13 31 16 21 19 27 27 19 21 16 31 13 21 5 27 11 19 1 16 11 13 5 5 13 11Z" fill="currentColor"/><circle cx="16" cy="16" r="2.4" fill="#fff4df"/></svg>DUROOD STORIES<svg class="rosette" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1 19 11 27 5 21 13 31 16 21 19 27 27 19 21 16 31 13 21 5 27 11 19 1 16 11 13 5 5 13 11Z" fill="currentColor"/><circle cx="16" cy="16" r="2.4" fill="#fff4df"/></svg></span></div>
  <h2>{escaped_title}</h2>
  <div class="caption-wrap"><p class="caption">{html.escape(caption)}</p></div>
</div><p class="frame-label">Frame {number:02d}</p></article>'''
        for number, caption in enumerate(frames, start=1)
    )
    document = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Durood Stories — Video Layout Review</title>
<style>
:root {{ color-scheme: dark; --amber:#e4ad55; --cream:#fff4df; --muted:#c9a66f; --brown:#21140c; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; padding:40px clamp(18px,4vw,64px) 60px; background:#100b07; color:var(--cream); font-family:Arial, sans-serif; }}
header {{ max-width:1180px; margin:0 auto 34px; }}
h1 {{ margin:0 0 10px; color:var(--amber); font:700 clamp(26px,4vw,42px) Georgia,serif; }}
header p {{ margin:0; color:#d8c7aa; line-height:1.6; }}
.frames {{ max-width:1180px; margin:auto; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr)); gap:28px; }}
.review {{ min-width:0; }}
.frame {{ position:relative; isolation:isolate; aspect-ratio:16/9; overflow:hidden; padding:4.2% 5.3%; border:1px solid rgba(228,173,85,.62); border-radius:14px; background:radial-gradient(ellipse at 50% 42%,#54351b 0,#382312 43%,#20130c 100%); box-shadow:0 18px 55px #0008; }}
.frame::before {{ position:absolute; z-index:-1; inset:12px; border:1px solid rgba(228,173,85,.2); border-radius:8px; content:""; }}
.frame-top {{ position:absolute; top:9%; left:0; width:100%; color:var(--muted); text-align:center; font-size:clamp(9px,.85vw,13px); letter-spacing:.2em; }}
.brand {{ display:inline-flex; align-items:center; justify-content:center; gap:.7em; color:var(--amber); font-weight:700; }}
.rosette {{ width:1.45em; height:1.45em; flex:none; }}
h2 {{ position:absolute; top:43%; left:10%; width:80%; max-height:2.5em; overflow:hidden; transform:translateY(-50%); margin:0; color:var(--cream); text-align:center; font:600 clamp(20px,2.9vw,38px)/1.2 Georgia,serif; text-wrap:balance; }}
.caption-wrap {{ position:absolute; left:8%; bottom:10%; width:84%; min-height:clamp(74px,12vw,130px); padding:clamp(12px,2vw,22px) clamp(16px,3vw,34px); display:grid; place-items:center; border:1px solid rgba(228,173,85,.78); border-radius:10px; background:rgba(12,8,5,.9); box-shadow:0 8px 28px #0007; }}
.caption {{ margin:0; color:#fff9ee; font:500 clamp(16px,2.25vw,28px)/1.35 Arial,sans-serif; text-align:center; text-wrap:pretty; }}
.frame-label {{ margin:10px 2px 0; color:var(--amber); font-size:13px; letter-spacing:.12em; text-transform:uppercase; }}
@media (max-width:600px) {{ body {{ padding-top:24px; }} }}
</style></head><body>
<header><h1>Video layout review · {escaped_title}</h1><p>Five consecutive caption moments from the manuscript. Captions have a fixed lower-third panel; the title and branding stay in their own upper area.</p></header>
<main class="frames">{cards}</main></body></html>'''
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(document, encoding="utf-8")
    print(f"Wrote {args.output.relative_to(ROOT) if args.output.is_relative_to(ROOT) else args.output}")


if __name__ == "__main__":
    main()
