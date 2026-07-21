import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";

const root = process.cwd();
const projectDir = path.join(root, "publishing", "durood-stories");
const manuscriptPath = path.join(root, "data", "durood-stories.md");
const cssPath = path.join(projectDir, "layout", "book.css");
const titlePath = path.join(projectDir, "layout", "title-page.md");
const outDir = path.join(projectDir, "exports");
const outHtmlDir = path.join(outDir, "html");
const outPdfPath = path.join(outDir, "durood-stories.pdf");
const pdfPageSize = { width: "148mm", height: "210mm" };

function escapeHtml(v) {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function restoreInlineHtml(v) {
  return v
    .replaceAll(/`([^`]+)`/g, '<span class="reference">$1</span>')
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replaceAll(/\*([^*]+)\*/g, "<em>$1</em>");
}

function inline(v) {
  return restoreInlineHtml(escapeHtml(v));
}

function markdownToHtml(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listOpen = false;

  function closeParagraph() {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 2) {
        html.push(`<div class="story-divider"></div>`);
      }
      html.push(`<h${level}>${inline(text)}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith("[Watch on YouTube]") && trimmed.includes("http")) {
      closeParagraph();
      closeList();
      const urlMatch = trimmed.match(/\((https?:\/\/[^)]+)\)/);
      const url = urlMatch ? urlMatch[1] : "#";
      html.push(`<p class="watch-link">[ <a href="${url}">Watch on YouTube</a> ]</p>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      closeParagraph();
      closeList();
      const bqLines = [trimmed.slice(2)];
      html.push(`<blockquote><p>${inline(bqLines.join(" "))}</p></blockquote>`);
      continue;
    }

    if (trimmed === "---") {
      closeParagraph();
      closeList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      closeParagraph();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(trimmed.slice(2))}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  closeParagraph();
  closeList();

  return html.join("\n");
}

// --- Read source files ---
const css = fs.readFileSync(cssPath, "utf8");
const titleMd = fs.readFileSync(titlePath, "utf8");
const manuscript = fs.readFileSync(manuscriptPath, "utf8");

// --- Parse title ---
const titleLines = titleMd.trim().split("\n").map((l) => l.trim()).filter(Boolean);
const bookTitle = titleLines[0].replace(/^#\s+/, "");
const bookSubtitle = titleLines[1] || "";
const bookSource = titleLines.slice(2).join(" ");

// --- TOC: scan manuscript for story headings ---
function getTocEntries(md) {
  const entries = [];
  const lines = md.replaceAll("\r\n", "\n").split("\n");
  for (const line of lines) {
    const m = /^## (\d+)\.\s+(.+)$/.exec(line.trim());
    if (m) {
      entries.push({
        num: parseInt(m[1], 10),
        title: m[2].trim(),
        rawHeading: line.trim(),
      });
    }
  }
  return entries;
}

const tocEntries = getTocEntries(manuscript);

// --- Split manuscript into per-story chunks ---
function splitIntoChunks(md) {
  const lines = md.replaceAll("\r\n", "\n").split("\n");
  const chunks = [];
  let current = null;
  for (const line of lines) {
    if (/^## \d+\.\s+/.test(line.trim())) {
      if (current) chunks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const storyChunks = splitIntoChunks(manuscript);

// --- Build HTML fragments ---
const coverHtml = `
<section class="cover-page" aria-label="Book cover">
  <div class="cover-content">
    <div class="cover-ornament">&#x2726; &#x2726; &#x2726;</div>
    <hr class="cover-rule">
    <h1 class="cover-title">${inline(bookTitle)}</h1>
    <p class="cover-subtitle">${inline(bookSubtitle)}</p>
    <hr class="cover-rule">
  </div>
</section>`;

const titlePageHtml = `
<section class="title-page">
  <div class="ornament">&#x2726; &#x2726; &#x2726;</div>
  <h1>${inline(bookTitle)}</h1>
  <p class="subtitle">${inline(bookSubtitle)}</p>
  <hr class="divider">
  <p class="source">${inline(bookSource)}</p>
</section>`;

function generateTocHtml(pageMap) {
  const rows = tocEntries.map((entry, idx) => {
    const pg = pageMap ? pageMap[idx] : null;
    const pgHtml = pg
      ? `<span class="toc-pages">${pg.start === pg.end ? pg.start : `${pg.start}\u2013${pg.end}`}</span>`
      : "";
    return `<div class="toc-row"><span class="toc-title">${entry.num}. ${inline(entry.title)}</span><span class="toc-leader"></span>${pgHtml}</div>`;
  }).join("\n");
  return `<section class="toc-page"><h1>Contents</h1>${rows}</section>`;
}

const manuscriptHtml = markdownToHtml(manuscript);

// --- Full document HTML (built later with real page numbers) ---
let fullHtml;

// --- PDF generation ---
fs.mkdirSync(outDir, { recursive: true });
const tempDir = path.join(projectDir, "exports", ".tmp");
fs.mkdirSync(tempDir, { recursive: true });

const browser = await chromium.launch();

// Helper: render HTML string to PDF buffer
async function renderToPdf(htmlStr, opts = {}) {
  const page = await browser.newPage();
  await page.setContent(htmlStr, { waitUntil: "networkidle" });
  const buf = await page.pdf({
    width: pdfPageSize.width,
    height: pdfPageSize.height,
    printBackground: true,
    preferCSSPageSize: true,
    ...opts,
  });
  await page.close();
  return buf;
}

function sectionHtml(md) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(bookTitle)}</title><style>${css}</style></head><body><main class="book">${markdownToHtml(md)}</main></body></html>`;
}

// --- Pass 1: count pages per story ---
console.log("Counting pages per story...");
const storyPageCounts = [];
for (let i = 0; i < storyChunks.length; i++) {
  const buf = await renderToPdf(sectionHtml(storyChunks[i].join("\n")), {
    margin: { top: "18mm", right: "16mm", bottom: "22mm", left: "16mm" },
  });
  const doc = await PDFDocument.load(buf);
  storyPageCounts.push(doc.getPageCount());
  process.stdout.write(`  Story ${i + 1}: ${storyPageCounts[i]} pages\n`);
}

// --- Count front matter pages (title + toc) ---
console.log("Counting front matter pages...");
const tempTocHtml = generateTocHtml(null);
const frontMatterHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(bookTitle)}</title><style>${css}</style></head><body><main class="book">${titlePageHtml}${tempTocHtml}</main></body></html>`;
const frontBuf = await renderToPdf(frontMatterHtml, {
  margin: { top: "18mm", right: "16mm", bottom: "22mm", left: "16mm" },
});
const frontDoc = await PDFDocument.load(frontBuf);
const frontPages = frontDoc.getPageCount();
console.log(`  Front matter: ${frontPages} pages`);

// --- Calculate page map ---
const pageMap = {};
let cumPage = frontPages + 1;
for (let i = 0; i < tocEntries.length; i++) {
  const cnt = storyPageCounts[i];
  pageMap[i] = { start: cumPage, end: cumPage + cnt - 1 };
  cumPage += cnt;
}

// --- Regenerate TOC with real page numbers ---
const tocHtml = generateTocHtml(pageMap);

// --- Write HTML preview with real page numbers ---
fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(bookTitle)}</title>
  <style>${css}</style>
</head>
<body>
  <main class="book">
    ${coverHtml}
    ${titlePageHtml}
    ${tocHtml}
    ${manuscriptHtml}
  </main>
</body>
</html>`;
fs.mkdirSync(outHtmlDir, { recursive: true });
fs.writeFileSync(path.join(outHtmlDir, "durood-stories.html"), fullHtml, "utf8");
console.log("Wrote HTML");

// --- Render cover ---
console.log("Rendering cover...");
const coverPdfPath = path.join(tempDir, "cover.pdf");
const coverBuf = await renderToPdf(
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    @page { size: ${pdfPageSize.width} ${pdfPageSize.height}; margin: 0; }
    html, body { margin: 0; width: 100%; height: 100%; }
    .cover-page {
      background: linear-gradient(160deg, #0a2e1f 0%, #0f5a3e 40%, #147a54 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100vh; width: 100vw; overflow: hidden; color: #fff; text-align: center;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .cover-ornament { color: #b8944f; font-size: 2.4rem; margin-bottom: 1.5rem; letter-spacing: 0.3em; }
    .cover-rule { width: 6rem; height: 2px; background: #b8944f; margin: 0 auto 1.5rem; border: none; }
    .cover-title { font-size: 2.8rem; font-weight: 700; color: #fff; margin: 0 0 0.6rem; line-height: 1.2; letter-spacing: 0.02em; }
    .cover-subtitle { font-size: 1.05rem; color: #d4b876; margin: 0 0 2rem; font-style: italic; letter-spacing: 0.03em; line-height: 1.5; max-width: 28rem; }
  </style></head><body>
    <section class="cover-page">
      <div>
        <div class="cover-ornament">&#x2726; &#x2726; &#x2726;</div>
        <hr class="cover-rule">
        <h1 class="cover-title">${inline(bookTitle)}</h1>
        <p class="cover-subtitle">${inline(bookSubtitle)}</p>
        <hr class="cover-rule">
      </div>
    </section>
  </body></html>`,
  { margin: { top: 0, right: 0, bottom: 0, left: 0 } }
);
fs.writeFileSync(coverPdfPath, coverBuf);

// --- Render content (title + toc + manuscript) ---
console.log("Rendering content PDF...");
const contentHtmlPath = path.join(tempDir, "content.html");
const contentPdfPath = path.join(tempDir, "content.pdf");
const contentOnlyHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(bookTitle)}</title>
  <style>${css}</style>
</head>
<body>
  <main class="book">
    ${titlePageHtml}
    ${tocHtml}
    ${manuscriptHtml}
  </main>
</body>
</html>`;
fs.writeFileSync(contentHtmlPath, contentOnlyHtml, "utf8");

const contentBuf = await renderToPdf(
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(bookTitle)}</title><style>${css}</style></head><body><main class="book">${titlePageHtml}${tocHtml}${manuscriptHtml}</main></body></html>`,
  {
    displayHeaderFooter: true,
    headerTemplate: `<div style="box-sizing: border-box; color: #0f5a3e; font-family: Georgia, 'Times New Roman', serif; font-size: 9px; padding: 6px 16mm 0; text-align: left; width: 100%;">${escapeHtml(bookTitle)}</div>`,
    footerTemplate: `<div style="color: #4f463a; font-family: Georgia, 'Times New Roman', serif; font-size: 9px; padding: 0 0 6px; text-align: center; width: 100%;"><span class="pageNumber"></span></div>`,
    margin: { top: "18mm", right: "16mm", bottom: "22mm", left: "16mm" },
  }
);
fs.writeFileSync(contentPdfPath, contentBuf);
await browser.close();

// --- Merge cover + content ---
console.log("Merging PDFs...");
const merged = await PDFDocument.create();
for (const pdfPath of [coverPdfPath, contentPdfPath]) {
  const source = await PDFDocument.load(fs.readFileSync(pdfPath));
  const pages = await merged.copyPages(source, source.getPageIndices());
  for (const page of pages) merged.addPage(page);
}
fs.writeFileSync(outPdfPath, await merged.save());

fs.rmSync(tempDir, { recursive: true, force: true });

const pageCount = merged.getPageCount();
console.log(`\nDone! Wrote ${path.relative(root, outPdfPath)} (${pageCount} pages)`);
console.log(`TOC covers stories 1–${tocEntries.length}, starting at page ${frontPages + 1}`);
