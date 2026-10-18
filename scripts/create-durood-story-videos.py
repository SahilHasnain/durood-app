#!/usr/bin/env python3
"""Create narrated, captioned story videos directly from the book manuscript.

Requires Python 3.10+, edge-tts, and ffmpeg/ffprobe on PATH. See
docs/DUROOD_STORY_VIDEO_WORKFLOW.md for setup and usage.
"""

from __future__ import annotations

import argparse
import asyncio
import html
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data" / "durood-stories.md"
DEFAULT_OUTPUT = ROOT / "publishing" / "durood-stories" / "videos"
DEFAULT_VOICE = "en-US-ChristopherNeural"


def parse_stories(markdown: str) -> list[dict]:
    stories = []
    current = None
    for line in markdown.replace("\r\n", "\n").splitlines():
        match = re.match(r"^##\s+(\d+)\.\s+(.+?)\s*$", line.strip())
        if match:
            if current:
                stories.append(current)
            current = {"number": int(match.group(1)), "title": match.group(2), "paragraphs": []}
            continue
        if current is None:
            continue
        stripped = line.strip()
        if not stripped or re.fullmatch(r"-{3,}", stripped):
            continue
        if stripped.startswith("#"):
            continue
        if stripped.startswith("[Watch on YouTube]"):
            continue
        current["paragraphs"].append(stripped)
    if current:
        stories.append(current)
    return stories


def plain_text(markdown: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", markdown)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[*_`~]", "", text)
    return html.unescape(text).strip()


def srt_time(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"


def ass_time(seconds: float) -> str:
    centiseconds = round(seconds * 100)
    hours, centiseconds = divmod(centiseconds, 360_000)
    minutes, centiseconds = divmod(centiseconds, 6_000)
    secs, centiseconds = divmod(centiseconds, 100)
    return f"{hours}:{minutes:02}:{secs:02}.{centiseconds:02}"


def caption_chunks(text: str, max_words: int = 7, max_chars: int = 44) -> list[str]:
    """Break prose into short, readable subtitle cards without dropping words."""
    words = text.split()
    chunks, current = [], []
    for word in words:
        candidate = " ".join([*current, word])
        if current and (len(current) >= max_words or len(candidate) > max_chars):
            chunks.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        chunks.append(" ".join(current))
    return chunks


def run(command: list[str]) -> str:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def duration(audio_path: Path) -> float:
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)]))


def make_background(title: str, width: int, height: int, output: Path, Image, ImageDraw, ImageFont) -> None:
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            blend = (x / width + y / height) / 2
            glow = max(0, 1 - (((x - width / 2) / (width * .62)) ** 2 + ((y - height / 2) / (height * .72)) ** 2) ** .5)
            pixels[x, y] = (int(31 + blend * 28 + glow * 26), int(18 + blend * 14 + glow * 17), int(9 + blend * 7 + glow * 9))
    draw = ImageDraw.Draw(image)
    gold = (222, 166, 76)
    draw.rounded_rectangle((70, 70, width - 70, height - 70), radius=22, outline=gold, width=2)
    def font(size):
        for candidate in ("DejaVuSerif.ttf", "LiberationSerif-Regular.ttf", "arial.ttf"):
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                pass
        return ImageFont.load_default()
    header_font = font(30)
    header = "DUROOD STORIES"
    draw.text((width // 2, 145), header, fill=(244, 198, 112), font=header_font, anchor="mm")
    header_width = draw.textbbox((0, 0), header, font=header_font)[2]
    def rosette(cx: float, cy: float, size: float) -> None:
        points = []
        for point in range(16):
            radius = size if point % 2 == 0 else size * .48
            angle = -math.pi / 2 + point * math.pi / 8
            points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
        draw.polygon(points, fill=(244, 198, 112))
        core = size * .19
        draw.ellipse((cx - core, cy - core, cx + core, cy + core), fill=(255, 239, 199))
    rosette(width / 2 - header_width / 2 - 30, 145, 12)
    rosette(width / 2 + header_width / 2 + 30, 145, 12)
    title_font_size = max(42, min(78, width // 24))
    title_font = font(title_font_size)
    lines, line = [], ""
    for word in title.split():
        candidate = (line + " " + word).strip()
        if line and draw.textbbox((0, 0), candidate, font=title_font)[2] > width - 300:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    line_height = int(title_font_size * 1.28)
    title_center_y = int(height * .43)
    for index, title_line in enumerate(lines):
        y = title_center_y + (index - (len(lines) - 1) / 2) * line_height
        draw.text((width // 2 + 2, int(y + 3)), title_line, fill=(20, 12, 7), font=title_font, anchor="mm")
        draw.text((width // 2, int(y)), title_line, fill=(255, 244, 223), font=title_font, anchor="mm")
    image.save(output)


async def synthesize(text: str, output: Path, voice: str, rate: str, edge_tts) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(output))


async def create_story(story: dict, args, edge_tts) -> None:
    slug = re.sub(r"[^a-z0-9]+", "-", story["title"].lower()).strip("-") or f"story-{story['number']}"
    output_dir = args.output / f"{story['number']:02d}-{slug}"
    output_dir.mkdir(parents=True, exist_ok=True)
    mp4_path = output_dir / f"{story['number']:02d}-{slug}.mp4"
    if mp4_path.exists() and not args.overwrite:
        print(f"Skip (exists): {mp4_path.relative_to(ROOT)}")
        return

    paragraphs = [plain_text(p) for p in story["paragraphs"]]
    paragraphs = [p for p in paragraphs if p]
    if not paragraphs:
        print(f"Skip (empty story): {story['title']}")
        return

    print(f"Story {story['number']}: {story['title']}")
    with tempfile.TemporaryDirectory(prefix="durood-tts-") as tmp:
        temp = Path(tmp)
        audio_parts = []
        for index, paragraph in enumerate(paragraphs, start=1):
            part = temp / f"part-{index:04}.mp3"
            await synthesize(paragraph, part, args.voice, args.rate, edge_tts)
            audio_parts.append(part)

        concat_file = temp / "audio.txt"
        concat_file.write_text("".join(f"file '{part.as_posix()}'\n" for part in audio_parts), encoding="utf-8")
        audio_path = temp / "narration.mp3"
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(audio_path)])

        captions, ass_events, elapsed, cue_index = [], [], 0.0, 1
        for index, (paragraph, part) in enumerate(zip(paragraphs, audio_parts), start=1):
            length = duration(part)
            chunks = caption_chunks(paragraph)
            chunk_weights = [max(1, len(chunk.split())) for chunk in chunks]
            total_weight = sum(chunk_weights)
            cursor = elapsed
            for chunk, weight in zip(chunks, chunk_weights):
                cue_duration = length * weight / total_weight
                captions.extend([str(cue_index), f"{srt_time(cursor)} --> {srt_time(cursor + cue_duration)}", chunk, ""])
                ass_events.append(f"Dialogue: 0,{ass_time(cursor)},{ass_time(cursor + cue_duration)},Caption,,0,0,0,,{chunk.replace(chr(92), chr(92) + chr(92)).replace('{', chr(92) + '{').replace('}', chr(92) + '}')}")
                cue_index += 1
                cursor += cue_duration
            elapsed += length
        subtitle_path = temp / "captions.ass"
        ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {args.width}
PlayResY: {args.height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,{args.caption_size},&H00F9F3E8,&H000000FF,&H00DFA64C,&HCC160E08,0,0,3,0,0,2,160,160,82,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        subtitle_path.write_text(ass_header + "\n".join(ass_events) + "\n", encoding="utf-8")
        from PIL import Image, ImageDraw, ImageFont
        background_path = temp / "background.png"
        make_background(story["title"], args.width, args.height, background_path, Image, ImageDraw, ImageFont)

        # Make subtitle path safe for FFmpeg's filter syntax.
        escaped_subtitle = subtitle_path.resolve().as_posix().replace(":", r"\:").replace("'", r"\'")
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", str(args.fps), "-i", str(background_path), "-i", str(audio_path), "-vf", f"subtitles='{escaped_subtitle}'", "-c:v", "libx264", "-preset", args.preset, "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", str(args.fps), "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(mp4_path)])

    # Keep reusable assets next to the rendered video for review and republishing.
    (output_dir / "captions.srt").write_text("\n".join(captions), encoding="utf-8-sig")
    (output_dir / "captions.ass").write_text(ass_header + "\n".join(ass_events) + "\n", encoding="utf-8")
    (output_dir / "transcript.txt").write_text("\n\n".join(paragraphs) + "\n", encoding="utf-8")
    (output_dir / "metadata.txt").write_text(f"Title: {story['title']}\nStory: {story['number']}\nVoice: {args.voice}\nSource: {args.source.relative_to(ROOT) if args.source.is_relative_to(ROOT) else args.source}\n", encoding="utf-8")
    print(f"  Wrote {mp4_path.relative_to(ROOT) if mp4_path.is_relative_to(ROOT) else mp4_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stories", nargs="*", help="Story number(s) to render; default: all")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Source manuscript Markdown")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output directory")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Microsoft Edge TTS voice name")
    parser.add_argument("--rate", default="-5%", help="Speech rate, e.g. +0%% or -10%%")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--caption-size", type=int, default=44)
    parser.add_argument("--preset", default="medium", help="FFmpeg x264 preset")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing videos")
    args = parser.parse_args()

    if not args.source.is_file():
        parser.error(f"Manuscript not found: {args.source}")
    for executable in ("ffmpeg", "ffprobe"):
        if not shutil.which(executable):
            parser.error(f"{executable} is required and must be available on PATH")
    try:
        import edge_tts
    except ImportError:
        parser.error("edge-tts is not installed. Run: python -m pip install edge-tts")

    stories = parse_stories(args.source.read_text(encoding="utf-8"))
    if not stories:
        parser.error("No numbered story headings (## N. Title) found in manuscript")
    selected = set()
    try:
        selected = {int(value) for value in args.stories}
    except ValueError:
        parser.error("Story selectors must be numeric story numbers")
    unknown = selected - {story["number"] for story in stories}
    if unknown:
        parser.error(f"Story number(s) not found: {', '.join(map(str, sorted(unknown)))}")
    chosen = [story for story in stories if not selected or story["number"] in selected]
    try:
        for story in chosen:
            asyncio.run(create_story(story, args, edge_tts))
    except Exception as error:
        print(f"Video generation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
