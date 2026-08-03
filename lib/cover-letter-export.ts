import "server-only";

import PDFDocument from "pdfkit";

import {
  BOTTOM_LIMIT,
  COLOR,
  CONTENT_WIDTH,
  MARGIN,
  PAGE_WIDTH,
  drawResumeFooter,
  textHeight,
  TYPE,
} from "@/lib/pdf-style";

export type CoverLetterExportData = {
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  content: string;
  generatedAt: Date;
};

/** Split the letter body into trimmed, non-empty paragraphs. */
export function letterParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * True when the letter body already ends with the candidate's signature line
 * (e.g. "...Sincerely,\n<candidate name>"). Gemini is instructed to end the
 * letter with a formal closing followed by the candidate's name, so the body
 * already carries the signature. When that is the case we must NOT append the
 * candidate name again in the closing block, otherwise it is printed twice.
 */
function contentHasSignature(content: string, candidateName: string): boolean {
  const paragraphs = letterParagraphs(content);
  if (paragraphs.length === 0) return false;
  const last = paragraphs[paragraphs.length - 1].trim().toLowerCase();
  const name = candidateName.trim().toLowerCase();
  return name.length > 0 && last.endsWith(name);
}

/** Render a cover letter as clean, GitHub-compatible markdown. */
export function buildCoverLetterMarkdown(data: CoverLetterExportData): string {
  const lines: string[] = [];

  lines.push("# Cover Letter", "");

  const fromLine = [
    data.candidateName,
    data.candidateEmail,
    data.candidatePhone,
  ].filter(Boolean);
  if (fromLine.length > 0) {
    lines.push(fromLine.join(" · "), "");
  }

  const roleLine = [data.jobTitle, data.jobCompany].filter(Boolean).join(" — ");
  if (roleLine) {
    lines.push(`**Re:** ${roleLine}`, "");
  }

  lines.push(data.generatedAt.toISOString(), "");

  const paragraphs = letterParagraphs(data.content);
  if (paragraphs.length > 0) {
    for (const paragraph of paragraphs) {
      lines.push(paragraph, "");
    }
  }

  return lines.join("\n");
}

const CLOSING_GAP = 14;

function headerGap(scale: number, value: number): number {
  return value * scale;
}

function drawLetterHeader(doc: PDFKit.PDFDocument, data: CoverLetterExportData, scale: number) {
  let y = MARGIN;

  if (data.candidateName) {
    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(TYPE.title);
    const nameH = textHeight(doc, data.candidateName, { width: CONTENT_WIDTH, lineGap: 2 });
    doc.text(data.candidateName, MARGIN, y, { width: CONTENT_WIDTH, lineGap: 2 });
    y += nameH + headerGap(scale, 4);
  }

  const contactLine = [data.candidateEmail, data.candidatePhone].filter(Boolean).join("  ·  ");
  if (contactLine) {
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica")
      .fontSize(TYPE.body)
      .text(contactLine, MARGIN, y, { lineGap: 2 });
    y += headerGap(scale, 16);
  }

  y += headerGap(scale, 4);
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .lineWidth(0.8)
    .strokeColor(COLOR.border)
    .stroke();
  y += headerGap(scale, 12);

  doc
    .fillColor(COLOR.muted)
    .font("Helvetica")
    .fontSize(TYPE.body)
    .text(data.generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), MARGIN, y);
  y += headerGap(scale, 20);

  const roleLine = [data.jobCompany, data.jobTitle].filter(Boolean).join(", ");
  if (roleLine) {
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica")
      .fontSize(TYPE.body)
      .text(roleLine, MARGIN, y);
    y += headerGap(scale, 16);
  }

  doc.y = y + headerGap(scale, 4);
}

function measureLetterHeader(doc: PDFKit.PDFDocument, data: CoverLetterExportData, scale: number): number {
  let height = 0;

  if (data.candidateName) {
    doc.font("Helvetica-Bold").fontSize(TYPE.title);
    height +=
      textHeight(doc, data.candidateName, { width: CONTENT_WIDTH, lineGap: 2 }) +
      headerGap(scale, 4);
  }

  const contactLine = [data.candidateEmail, data.candidatePhone].filter(Boolean).join("  ·  ");
  if (contactLine) {
    doc.font("Helvetica").fontSize(TYPE.body);
    height += headerGap(scale, 16);
  }

  height += headerGap(scale, 4);
  height += headerGap(scale, 12);

  doc.font("Helvetica").fontSize(TYPE.body);
  height += headerGap(scale, 20);

  const roleLine = [data.jobCompany, data.jobTitle].filter(Boolean).join(", ");
  if (roleLine) {
    height += headerGap(scale, 16);
  }

  height += headerGap(scale, 4);
  return height;
}

function measureParagraphs(
  doc: PDFKit.PDFDocument,
  content: string,
  lineGap: number,
  paraGap: number
): number {
  const paragraphs = letterParagraphs(content);
  if (paragraphs.length === 0) return 0;

  doc.font("Helvetica").fontSize(TYPE.body);
  let total = 0;
  for (const paragraph of paragraphs) {
    total += textHeight(doc, paragraph, { width: CONTENT_WIDTH, lineGap }) + paraGap;
  }
  return total;
}

function drawParagraphs(doc: PDFKit.PDFDocument, content: string, lineGap: number, paraGap: number) {
  const paragraphs = letterParagraphs(content);
  if (paragraphs.length === 0) return;

  for (const paragraph of paragraphs) {
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica")
      .fontSize(TYPE.body)
      .text(paragraph, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap });
    doc.y += paraGap;
  }
}

/**
 * Render a cover letter as a PDF buffer. The letter is guaranteed to fit on a
 * single A4 page: vertical spacing is compressed (paragraph and line gaps plus
 * header whitespace) until the header, body and closing block fit together.
 * Font sizes are never reduced below professional standards.
 */
export async function buildCoverLetterPdf(data: CoverLetterExportData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: MARGIN, size: "A4" });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  let page = 1;
  doc.on("pageAdded", () => {
    page += 1;
    drawResumeFooter(doc, page);
  });
  drawResumeFooter(doc, 1);

  const candidateName = data.candidateName?.trim() ?? null;
  const hasClosing = candidateName
    ? !contentHasSignature(data.content, candidateName)
    : false;

  const usableHeight = BOTTOM_LIMIT - MARGIN;
  const closingHeight = hasClosing && candidateName
    ? (() => {
        doc.font("Helvetica-Bold").fontSize(TYPE.body);
        return textHeight(doc, candidateName, { lineBreak: false }) + CLOSING_GAP;
      })()
    : 0;

  let headerScale = 1;
  let lineGap = 3;
  let paraGap = 10;

  const totalHeight = () =>
    measureLetterHeader(doc, data, headerScale) +
    measureParagraphs(doc, data.content, lineGap, paraGap) +
    closingHeight;

  while (totalHeight() > usableHeight) {
    if (paraGap > 5) {
      paraGap -= 2;
    } else if (lineGap > 1) {
      lineGap -= 1;
    } else if (headerScale > 0.7) {
      headerScale -= 0.1;
    } else {
      break;
    }
  }

  drawLetterHeader(doc, data, headerScale);
  drawParagraphs(doc, data.content, lineGap, paraGap);

  if (hasClosing && candidateName) {
    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(TYPE.body);
    doc.text(candidateName, MARGIN, doc.y, { lineBreak: false });
  }

  doc.end();
  return done;
}
