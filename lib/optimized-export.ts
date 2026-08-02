import "server-only";

import PDFDocument from "pdfkit";

import type { OptimizedResumeData } from "@/lib/types/optimize";
import {
  COLOR,
  CONTENT_WIDTH,
  MARGIN,
  PAGE_WIDTH,
  beginBlock,
  drawChip,
  drawResumeFooter,
  ensureSpace,
  measureText,
  resumeSectionTitle,
  textHeight,
  TYPE,
} from "@/lib/pdf-style";

function escapeMd(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function bullet(value: string): string {
  return `- ${escapeMd(value.trim())}`;
}

export type OptimizedContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

/** Render an optimized resume as clean, GitHub-compatible markdown. */
export function buildOptimizedMarkdown(
  contact: OptimizedContact,
  optimized: OptimizedResumeData
): string {
  const lines: string[] = [];

  if (contact.name) {
    lines.push(`# ${escapeMd(contact.name)}`, "");
  }
  const contactLine = [contact.email, contact.phone].filter(Boolean).join(" · ");
  if (contactLine) {
    lines.push(contactLine, "");
  }

  if (optimized.summary) {
    lines.push("## Summary", "", optimized.summary.trim(), "");
  }

  if (optimized.skills.length > 0) {
    lines.push("## Skills", "");
    for (const skill of optimized.skills) {
      lines.push(bullet(skill));
    }
    lines.push("");
  }

  if (optimized.experience.length > 0) {
    lines.push("## Experience", "");
    for (const item of optimized.experience) {
      const header = [item.title, item.company].filter(Boolean).join(" — ");
      lines.push(`### ${escapeMd(header)}`);
      const meta = [item.location, [item.startDate, item.endDate].filter(Boolean).join(" – ")]
        .filter(Boolean)
        .join(" · ");
      if (meta) {
        lines.push(escapeMd(meta));
      }
      if (item.description) {
        lines.push("", item.description.trim());
      }
      lines.push("");
    }
  }

  if (optimized.projects.length > 0) {
    lines.push("## Projects", "");
    for (const project of optimized.projects) {
      lines.push(`### ${escapeMd(project.name)}`);
      if (project.technologies.length > 0) {
        lines.push(`*${project.technologies.join(", ")}*`);
      }
      if (project.url) {
        lines.push(project.url);
      }
      if (project.description) {
        lines.push("", project.description.trim());
      }
      lines.push("");
    }
  }

  if (optimized.education.length > 0) {
    lines.push("## Education", "");
    for (const item of optimized.education) {
      const degree = [item.degree, item.fieldOfStudy].filter(Boolean).join(" — ");
      lines.push(`### ${escapeMd(degree || item.institution)}`);
      const meta = [item.institution, [item.startDate, item.endDate].filter(Boolean).join(" – ")]
        .filter(Boolean)
        .join(" · ");
      if (meta) {
        lines.push(escapeMd(meta));
      }
      if (item.grade) {
        lines.push(escapeMd(item.grade));
      }
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function drawHeader(doc: PDFKit.PDFDocument, contact: OptimizedContact) {
  let y = MARGIN;
  if (contact.name) {
    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(TYPE.title);
    const nameH = textHeight(doc, contact.name, { width: CONTENT_WIDTH, lineGap: 2 });
    doc.text(contact.name, MARGIN, y, { width: CONTENT_WIDTH, lineGap: 2 });
    y += nameH + 6;
  }
  const contactLine = [contact.email, contact.phone].filter(Boolean).join("  ·  ");
  if (contactLine) {
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica")
      .fontSize(TYPE.body)
      .text(contactLine, MARGIN, y, { lineGap: 2 });
    y += 20;
  }
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .lineWidth(0.8)
    .strokeColor(COLOR.border)
    .stroke();
  doc.y = y + 16;
}

function paragraph(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 40);
  doc
    .fillColor(COLOR.ink)
    .font("Helvetica")
    .fontSize(TYPE.body)
    .text(text.trim(), MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 4 });
  doc.moveDown(0.6);
}

function descriptionLines(description: string | null): string[] {
  if (!description) return [];
  return description
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function drawBullets(
  doc: PDFKit.PDFDocument,
  lines: string[],
  startY: number,
  width: number,
): number {
  let y = startY;
  doc.fillColor(COLOR.ink).font("Helvetica").fontSize(TYPE.body);
  for (const line of lines) {
    const height = textHeight(doc, line, { width: width - 14, lineGap: 3 });
    doc
      .strokeColor(COLOR.primary)
      .lineWidth(1)
      .lineCap("round")
      .moveTo(MARGIN + 2, y + height / 2 - 1)
      .lineTo(MARGIN + 8, y + height / 2 - 1)
      .stroke();
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica")
      .fontSize(TYPE.body)
      .text(line, MARGIN + 14, y, { width: width - 14, lineGap: 3 });
    y += height + 4;
  }
  return y;
}

function drawSkills(doc: PDFKit.PDFDocument, skills: string[]) {
  if (skills.length === 0) return;
  resumeSectionTitle(doc, "Skills");

  const chipH = 20;
  const chipGap = 8;
  let x = MARGIN;
  let y = doc.y + 2;

  for (const skill of skills) {
    const width = Math.min(measureText(doc, skill, "Helvetica-Bold", TYPE.caption) + 22, CONTENT_WIDTH);

    if (x + width > PAGE_WIDTH - MARGIN) {
      x = MARGIN;
      const broke = ensureSpace(doc, chipH + chipGap + 6);
      y = broke ? doc.y : y + chipH + chipGap;
    }

    const drawn = drawChip(doc, x, y, skill, chipH, COLOR.primary, COLOR.primarySoft, TYPE.caption);
    x += drawn + chipGap;
  }

  doc.y = y + chipH + 14;
}

function drawExperience(doc: PDFKit.PDFDocument, items: OptimizedResumeData["experience"]) {
  if (items.length === 0) return;
  resumeSectionTitle(doc, "Experience");

  const dateW = 130;
  const leftW = CONTENT_WIDTH - dateW;

  for (const item of items) {
    const title = item.title || item.company || "";
    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(11.5);
    const titleH = textHeight(doc, title, { width: leftW - 8, lineGap: 2 });
    const dates = [item.startDate, item.endDate].filter(Boolean).join(" – ");
    const company = item.company && item.company !== title ? item.company : null;
    const location = item.location ?? null;
    const meta = [company, location].filter(Boolean) as string[];
    const bullets = descriptionLines(item.description);
    doc.fillColor(COLOR.ink).font("Helvetica").fontSize(TYPE.body);
    const bulletsH = bullets.reduce(
      (sum, line) => sum + textHeight(doc, line, { width: leftW - 14, lineGap: 3 }) + 4,
      0,
    );
    const entryH = titleH + 4 + (meta.length > 0 ? 15 : 0) + (bullets.length > 0 ? bulletsH + 6 : 0) + 8;
    const y = beginBlock(doc, entryH);

    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .text(title, MARGIN, y, { width: leftW - 8, lineGap: 2 });
    if (dates) {
      doc
        .fillColor(COLOR.muted)
        .font("Helvetica")
        .fontSize(TYPE.caption)
        .text(dates, MARGIN, y + 1.5, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
    }

    let cursorY = y + titleH + 4;
    if (meta.length > 0) {
      const companyX = company ? measureText(doc, company, "Helvetica-Bold", TYPE.caption) : 0;
      if (company) {
        doc
          .fillColor(COLOR.primary)
          .font("Helvetica-Bold")
          .fontSize(TYPE.caption)
          .text(company, MARGIN, cursorY, { lineBreak: false });
      }
      if (location) {
        doc
          .fillColor(COLOR.muted)
          .font("Helvetica")
          .fontSize(TYPE.caption)
          .text(location, MARGIN + companyX + 8, cursorY, { lineBreak: false });
      }
      cursorY += 15;
    }

    if (bullets.length > 0) {
      cursorY += 4;
      cursorY = drawBullets(doc, bullets, cursorY, leftW);
    }

    doc.y = y + entryH;
  }
}

function drawProjects(doc: PDFKit.PDFDocument, items: OptimizedResumeData["projects"]) {
  if (items.length === 0) return;
  resumeSectionTitle(doc, "Projects");

  const dateW = 130;
  const leftW = CONTENT_WIDTH - dateW;

  for (const project of items) {
    const dates = [project.startDate, project.endDate].filter(Boolean).join(" – ");
    const techs = project.technologies.join(", ");
    const bullets = descriptionLines(project.description);
    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(11.5);
    const titleH = textHeight(doc, project.name, { width: leftW - 8, lineGap: 2 });
    doc.fillColor(COLOR.ink).font("Helvetica").fontSize(TYPE.body);
    const bulletsH = bullets.reduce(
      (sum, line) => sum + textHeight(doc, line, { width: leftW - 14, lineGap: 3 }) + 4,
      0,
    );
    const metaH = techs ? 15 : 0;
    const urlH = project.url ? 13 : 0;
    const entryH = titleH + 4 + metaH + urlH + (bullets.length > 0 ? bulletsH + 6 : 0) + 8;
    const y = beginBlock(doc, entryH);

    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .text(project.name, MARGIN, y, { width: leftW - 8, lineGap: 2 });
    if (dates) {
      doc
        .fillColor(COLOR.muted)
        .font("Helvetica")
        .fontSize(TYPE.caption)
        .text(dates, MARGIN, y + 1.5, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
    }

    let cursorY = y + titleH + 4;
    if (techs) {
      doc
        .fillColor(COLOR.primary)
        .font("Helvetica")
        .fontSize(TYPE.caption)
        .text(techs, MARGIN, cursorY, { lineBreak: false });
      cursorY += 15;
    }
    if (project.url) {
      doc
        .fillColor(COLOR.muted)
        .font("Helvetica")
        .fontSize(TYPE.caption)
        .text(project.url, MARGIN, cursorY, { lineBreak: false });
      cursorY += 13;
    }

    if (bullets.length > 0) {
      cursorY += 4;
      cursorY = drawBullets(doc, bullets, cursorY, leftW);
    }

    doc.y = y + entryH;
  }
}

function drawEducation(doc: PDFKit.PDFDocument, items: OptimizedResumeData["education"]) {
  if (items.length === 0) return;
  resumeSectionTitle(doc, "Education");

  const dateW = 130;
  const leftW = CONTENT_WIDTH - dateW;

  for (const item of items) {
    const degree = [item.degree, item.fieldOfStudy].filter(Boolean).join(" — ");
    const title = degree || item.institution;
    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(11.5);
    const titleH = textHeight(doc, title, { width: leftW - 8, lineGap: 2 });
    const dates = [item.startDate, item.endDate].filter(Boolean).join(" – ");
    const meta = [item.institution !== title ? item.institution : null, item.grade]
      .filter(Boolean)
      .join(" · ");
    const entryH = titleH + 4 + (meta ? 15 : 0) + 8;
    const y = beginBlock(doc, entryH);

    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(11.5)
      .text(title, MARGIN, y, { width: leftW - 8, lineGap: 2 });
    if (dates) {
      doc
        .fillColor(COLOR.muted)
        .font("Helvetica")
        .fontSize(TYPE.caption)
        .text(dates, MARGIN, y + 1.5, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
    }

    if (meta) {
      doc
        .fillColor(COLOR.muted)
        .font("Helvetica")
        .fontSize(TYPE.caption)
        .text(meta, MARGIN, y + titleH + 4, { lineBreak: false });
    }

    doc.y = y + entryH;
  }
}

/** Render an optimized resume as a PDF buffer. */
export async function buildOptimizedPdf(
  contact: OptimizedContact,
  optimized: OptimizedResumeData
): Promise<Buffer> {
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

  drawHeader(doc, contact);
  if (optimized.summary) {
    paragraph(doc, optimized.summary);
  }
  drawSkills(doc, optimized.skills);
  drawExperience(doc, optimized.experience);
  drawProjects(doc, optimized.projects);
  drawEducation(doc, optimized.education);

  doc.end();
  return done;
}
