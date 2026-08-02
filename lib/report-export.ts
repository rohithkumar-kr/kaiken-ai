import "server-only";

import PDFDocument from "pdfkit";

import type { ReportView } from "@/components/dashboard/report/types";
import {
  COLOR,
  CONTENT_WIDTH,
  MARGIN,
  PAGE_WIDTH,
  beginBlock,
  clamp01,
  drawBrandMark,
  drawCheckIcon,
  drawChip,
  drawCrossIcon,
  drawFooter,
  drawStatusPill,
  ensureSpace,
  formatDate,
  getStatus,
  measureText,
  sectionTitle,
  severityColor,
  severitySoft,
  textHeight,
  truncateToWidth,
  TYPE,
  type PDFDocumentWithArc,
} from "@/lib/pdf-style";

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}

export function buildMarkdownReport(view: ReportView): string {
  const lines: string[] = [];

  lines.push("# ATS Analysis Report", "");
  lines.push(
    [
      `- **Resume:** ${view.resumeName ?? "—"}`,
      `- **Role:** ${view.jobTitle ?? "—"}`,
      `- **Company:** ${view.jobCompany ?? "—"}`,
      `- **Analyzed:** ${formatDate(view.analyzedAt)}`,
    ].join("\n"),
    "",
  );

  lines.push("## Overall ATS Score", "", `**${view.atsScore} / 100**`, "");

  if (view.summary) {
    lines.push("## Summary", "", view.summary, "");
  }

  lines.push("## Section Scores", "");
  lines.push("| Section | Score |", "| --- | ---: |");
  for (const section of view.sections) {
    lines.push(`| ${escapePipe(section.label)} | ${section.value} / 100 |`);
  }
  lines.push("");

  lines.push("## Matched Keywords", "");
  if (view.matched.length > 0) {
    for (const keyword of view.matched) {
      lines.push(`- ${escapePipe(keyword.keyword)}${keyword.count > 1 ? ` (×${keyword.count})` : ""}`);
    }
  } else {
    lines.push("_No matched keywords._");
  }
  lines.push("");

  lines.push("## Missing Keywords", "");
  if (view.missing.length > 0) {
    for (const keyword of view.missing) {
      lines.push(`- ${escapePipe(keyword.keyword)}`);
    }
  } else {
    lines.push("_No missing keywords._");
  }
  lines.push("");

  lines.push("## Strengths", "");
  if (view.strengths.length > 0) {
    for (const strength of view.strengths) {
      lines.push(`- ${escapePipe(strength)}`);
    }
  } else {
    lines.push("_No strengths identified._");
  }
  lines.push("");

  lines.push("## Weaknesses", "");
  if (view.weaknesses.length > 0) {
    for (const weakness of view.weaknesses) {
      lines.push(`- ${escapePipe(weakness)}`);
    }
  } else {
    lines.push("_No weaknesses identified._");
  }
  lines.push("");

  lines.push("## Suggestions", "");
  if (view.suggestions.length > 0) {
    for (const suggestion of view.suggestions) {
      lines.push(
        `### [${suggestion.severity}] ${escapePipe(suggestion.title)}`,
        "",
        suggestion.description,
        "",
      );
      if (suggestion.aiRewrite) {
        lines.push(`> **AI rewrite:** ${escapePipe(suggestion.aiRewrite)}`, "");
      }
    }
  } else {
    lines.push("_No suggestions yet._");
  }

  return lines.join("\n");
}

function drawHeader(doc: PDFKit.PDFDocument, view: ReportView) {
  drawBrandMark(doc, MARGIN, MARGIN, 26);
  doc
    .fillColor(COLOR.ink)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("Kaiken AI", MARGIN + 34, MARGIN + 4);
  doc
    .fillColor(COLOR.faint)
    .font("Helvetica")
    .fontSize(TYPE.caption)
    .text("ATS INTELLIGENCE", MARGIN + 34, MARGIN + 22, { characterSpacing: 1.2 });

  const status = getStatus(view.atsScore);
  const titleY = MARGIN + 58;
  doc
    .fillColor(COLOR.ink)
    .font("Helvetica-Bold")
    .fontSize(TYPE.title)
    .text("ATS Analysis Report", MARGIN, titleY, {
      width: CONTENT_WIDTH - 170,
      lineBreak: false,
      ellipsis: true,
    });
  const pillH = 24;
  const pillW = measureText(doc, status.label, "Helvetica-Bold", TYPE.caption) + 28;
  drawStatusPill(
    doc,
    PAGE_WIDTH - MARGIN - pillW,
    titleY + 4,
    status.label,
    status.text,
    status.soft,
    pillH,
    TYPE.caption,
  );

  doc
    .fillColor(COLOR.muted)
    .font("Helvetica")
    .fontSize(TYPE.body)
    .text("A professional ATS screening of your resume against the target role.", MARGIN, titleY + 34, {
      width: CONTENT_WIDTH,
      lineBreak: false,
    });

  const rows: [string, string][] = [
    ["Resume", view.resumeName ?? "—"],
    ["Role", view.jobTitle ?? "—"],
    ["Company", view.jobCompany ?? "—"],
    ["Date", formatDate(view.analyzedAt)],
  ];
  const pad = 18;
  const rowH = 30;
  const cardH = pad * 2 + rowH * 2;
  const metaY = titleY + 58;

  doc.fillColor(COLOR.surface).roundedRect(MARGIN, metaY, CONTENT_WIDTH, cardH, 10).fill();
  doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, metaY, CONTENT_WIDTH, cardH, 10).stroke();

  const colW = (CONTENT_WIDTH - pad * 2) / 2;
  rows.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + pad + col * colW;
    const y = metaY + pad + row * rowH;

    doc
      .fillColor(COLOR.faint)
      .font("Helvetica-Bold")
      .fontSize(TYPE.caption)
      .text(label.toUpperCase(), x, y, { characterSpacing: 0.8 });
    const valueText = truncateToWidth(doc, value, "Helvetica-Bold", TYPE.body, colW - 14);
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(TYPE.body)
      .text(valueText, x, y + 15);
  });

  doc.y = metaY + cardH + 22;
}

function drawScore(doc: PDFDocumentWithArc, view: ReportView) {
  const status = getStatus(view.atsScore);
  const pad = 22;
  const radius = 50;
  const ringW = 11;
  const gaugeD = (radius + ringW) * 2;
  const badgeH = 26;
  const cardH = pad + gaugeD + 14 + badgeH + pad;
  const y = beginBlock(doc, cardH);

  doc.fillColor(COLOR.surface).roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 12).fill();
  doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 12).stroke();

  const centerX = PAGE_WIDTH / 2;
  const centerY = y + pad + gaugeD / 2;

  doc.strokeColor(COLOR.track).lineWidth(ringW).circle(centerX, centerY, radius).stroke();

  const fraction = clamp01(view.atsScore / 100);
  if (fraction > 0) {
    const start = -Math.PI / 2;
    const end = start + fraction * 2 * Math.PI;
    doc
      .strokeColor(status.color)
      .lineWidth(ringW)
      .lineCap("round")
      .moveTo(centerX + radius * Math.cos(start), centerY + radius * Math.sin(start))
      .arc(centerX, centerY, radius, start, end)
      .stroke()
      .lineCap("butt");
  }

  const boxW = radius * 1.7;
  const boxX = centerX - boxW / 2;

  doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(40);
  const scoreH = textHeight(doc, `${view.atsScore}`, { width: boxW, align: "center" });
  doc.fillColor(COLOR.faint).font("Helvetica").fontSize(TYPE.caption);
  const capH = textHeight(doc, "ATS SCORE", {
    width: boxW,
    align: "center",
    characterSpacing: 1.2,
  });
  const cap2H = textHeight(doc, "out of 100", { width: boxW, align: "center" });

  let textY = centerY - (scoreH + capH + cap2H) / 2;
  doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(40);
  doc.text(`${view.atsScore}`, boxX, textY, { width: boxW, align: "center" });
  textY += scoreH;
  doc.fillColor(COLOR.faint).font("Helvetica").fontSize(TYPE.caption);
  doc.text("ATS SCORE", boxX, textY, { width: boxW, align: "center", characterSpacing: 1.2 });
  textY += capH;
  doc.text("out of 100", boxX, textY, { width: boxW, align: "center" });

  const badgeLabel = status.label;
  const badgeSize = TYPE.caption;
  const badgeW = measureText(doc, badgeLabel, "Helvetica-Bold", badgeSize) + 30;
  const badgeX = centerX - badgeW / 2;
  const badgeY = y + pad + gaugeD + 14;
  doc.fillColor(status.soft).roundedRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2).fill();
  doc.fillColor(status.color).rect(badgeX + 13, badgeY + badgeH / 2 - 2.5, 5, 5).fill();
  doc
    .fillColor(status.text)
    .font("Helvetica-Bold")
    .fontSize(badgeSize)
    .text(badgeLabel, badgeX + 24, badgeY + (badgeH - badgeSize) / 2, { width: badgeW - 30, align: "left" });

  doc.y = y + cardH + 22;
}

function drawSectionBars(doc: PDFKit.PDFDocument, view: ReportView) {
  sectionTitle(doc, "Section Scores");

  const labelW = 100;
  const valueW = 34;
  const barH = 9;
  const rowH = 30;
  const barX = MARGIN + labelW + 8;
  const barW = CONTENT_WIDTH - labelW - 8 - valueW - 10;

  for (const section of view.sections) {
    ensureSpace(doc, rowH + 6);
    const y = doc.y;
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(TYPE.body)
      .text(section.label, MARGIN, y + 1, { width: labelW - 4, lineBreak: false, ellipsis: true });

    doc.fillColor(COLOR.track).roundedRect(barX, y + 3, barW, barH, barH / 2).fill();
    const fraction = clamp01(section.value / 100);
    if (fraction > 0) {
      const color = getStatus(section.value).color;
      doc.fillColor(color).roundedRect(barX, y + 3, Math.max(barW * fraction, barH), barH, barH / 2).fill();
    }

    doc
      .fillColor(COLOR.muted)
      .font("Helvetica-Bold")
      .fontSize(TYPE.body)
      .text(`${section.value}%`, barX + barW + 10, y + 1, { width: valueW, align: "right" });

    doc.y = y + rowH;
  }

  doc.y += 12;
}

function drawSummary(doc: PDFKit.PDFDocument, view: ReportView) {
  if (!view.summary) return;
  sectionTitle(doc, "Summary");

  const pad = 16;
  const textW = CONTENT_WIDTH - pad * 2;
  const height = textHeight(doc, view.summary, { width: textW, lineGap: 4 }) + pad * 2;
  const y = beginBlock(doc, height);

  doc.fillColor(COLOR.surface).roundedRect(MARGIN, y, CONTENT_WIDTH, height, 10).fill();
  doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, y, CONTENT_WIDTH, height, 10).stroke();
  doc
    .fillColor(COLOR.ink)
    .font("Helvetica")
    .fontSize(TYPE.body)
    .text(view.summary, MARGIN + pad, y + pad, { width: textW, lineGap: 4 });

  doc.y = y + height + 22;
}

function drawKeywordList(
  doc: PDFKit.PDFDocument,
  title: string,
  items: ReportView["matched"],
  options: { fg: string; bg: string; caption: string },
) {
  sectionTitle(doc, title);
  doc
    .fillColor(COLOR.faint)
    .font("Helvetica")
    .fontSize(TYPE.caption)
    .text(options.caption, MARGIN, doc.y, { lineBreak: false });
  doc.moveDown(0.8);

  if (items.length === 0) {
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica-Oblique")
      .fontSize(TYPE.body)
      .text(`No ${title.toLowerCase()}.`, MARGIN, doc.y);
    doc.moveDown(0.8);
    return;
  }

  const chipH = 22;
  const chipGap = 8;
  let x = MARGIN;
  let y = doc.y + 2;

  for (const item of items) {
    const text = item.keyword + (item.count > 1 ? `  ×${item.count}` : "");
    const width = Math.min(measureText(doc, text, "Helvetica-Bold", TYPE.caption) + 22, CONTENT_WIDTH);

    if (x + width > PAGE_WIDTH - MARGIN) {
      x = MARGIN;
      const broke = ensureSpace(doc, chipH + chipGap + 6);
      y = broke ? doc.y : y + chipH + chipGap;
    }

    const drawn = drawChip(doc, x, y, text, chipH, options.fg, options.bg, TYPE.caption);
    x += drawn + chipGap;
  }

  doc.y = y + chipH + 14;
}

function drawCardList(
  doc: PDFKit.PDFDocument,
  title: string,
  items: string[],
  color: string,
  empty: string,
  isStrength: boolean,
) {
  sectionTitle(doc, title);

  if (items.length === 0) {
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica-Oblique")
      .fontSize(TYPE.body)
      .text(empty, MARGIN, doc.y);
    doc.moveDown(0.8);
    return;
  }

  const pad = 16;
  const iconX = MARGIN + pad + 1;
  const textX = MARGIN + pad + 24;
  const textW = CONTENT_WIDTH - pad * 2 - 24;
  const lineH = (value: string) => textHeight(doc, value, { width: textW, lineGap: 4 });
  const totalH = items.reduce((sum, item) => sum + lineH(item) + 10, pad * 2) - 6;
  const y = beginBlock(doc, totalH);

  doc.fillColor(COLOR.surface).roundedRect(MARGIN, y, CONTENT_WIDTH, totalH, 10).fill();
  doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, y, CONTENT_WIDTH, totalH, 10).stroke();

  let cursorY = y + pad;
  doc.fillColor(COLOR.ink).font("Helvetica").fontSize(TYPE.body);
  for (const item of items) {
    const height = lineH(item);
    if (isStrength) {
      drawCheckIcon(doc, iconX, cursorY + height / 2 - 4, color);
    } else {
      drawCrossIcon(doc, iconX, cursorY + height / 2 - 4, color);
    }
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica")
      .fontSize(TYPE.body)
      .text(item, textX, cursorY, { width: textW, lineGap: 4 });
    cursorY += height + 10;
  }

  doc.y = y + totalH + 22;
}

function aiCalloutHeight(doc: PDFKit.PDFDocument, text: string, textW: number): number {
  const cPad = 12;
  const textH = textHeight(doc, text, { width: textW - cPad * 2 - 6, lineGap: 3 });
  return cPad + 14 + 6 + textH + cPad;
}

function drawSuggestions(doc: PDFKit.PDFDocument, view: ReportView) {
  sectionTitle(doc, "Suggestions");

  if (view.suggestions.length === 0) {
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica-Oblique")
      .fontSize(TYPE.body)
      .text("No suggestions yet.", MARGIN, doc.y);
    return;
  }

  const pad = 16;
  const textW = CONTENT_WIDTH - pad * 2;
  const titleSize = TYPE.body;
  const badgeH = 20;
  const badgeSize = TYPE.caption;
  const descGap = 3;

  for (const suggestion of view.suggestions) {
    const color = severityColor(suggestion.severity);
    const soft = severitySoft(suggestion.severity);

    const badgeW = measureText(doc, suggestion.severity, "Helvetica-Bold", badgeSize) + 22;
    const titleW = textW - badgeW - 12;

    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(titleSize);
    const titleH = textHeight(doc, suggestion.title, { width: titleW, lineGap: 2 });

    doc.fillColor(COLOR.muted).font("Helvetica").fontSize(titleSize);
    const descH = textHeight(doc, suggestion.description, { width: textW, lineGap: descGap });

    doc.fillColor(COLOR.ink).font("Helvetica-Oblique").fontSize(titleSize);
    const calloutH = suggestion.aiRewrite ? aiCalloutHeight(doc, suggestion.aiRewrite, textW) + 12 : 0;

    const headH = Math.max(badgeH, titleH);
    const cardH = pad + headH + 8 + descH + calloutH + pad;
    const y = beginBlock(doc, cardH);

    doc.fillColor(COLOR.surface).roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 10).fill();
    doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 10).stroke();
    doc.fillColor(color).rect(MARGIN, y, 3, cardH).fill();

    const badgeX = MARGIN + pad;
    const badgeY = y + pad;
    doc.fillColor(soft).roundedRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2).fill();
    doc
      .fillColor(color)
      .font("Helvetica-Bold")
      .fontSize(badgeSize)
      .text(suggestion.severity, badgeX, badgeY + (badgeH - badgeSize) / 2, {
        width: badgeW,
        align: "center",
        lineBreak: false,
      });

    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(titleSize)
      .text(suggestion.title, badgeX + badgeW + 12, badgeY + Math.max(0, (badgeH - titleH) / 2), {
        width: titleW,
        lineGap: 2,
      });

    let cursorY = badgeY + headH + 8;
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica")
      .fontSize(titleSize)
      .text(suggestion.description, MARGIN + pad, cursorY, { width: textW, lineGap: descGap });

    if (suggestion.aiRewrite) {
      cursorY += descH + 12;
      const cPad = 12;
      doc.fillColor(COLOR.ink).font("Helvetica-Oblique").fontSize(titleSize);
      const innerH = aiCalloutHeight(doc, suggestion.aiRewrite, textW);
      doc.fillColor(COLOR.white).roundedRect(MARGIN + pad, cursorY, textW, innerH, 8).fill();
      doc.strokeColor(COLOR.primary).lineWidth(1).roundedRect(MARGIN + pad, cursorY, textW, innerH, 8).stroke();
      doc.fillColor(COLOR.primary).rect(MARGIN + pad, cursorY + 6, 3, innerH - 12).fill();

      doc
        .fillColor(COLOR.primary)
        .font("Helvetica-Bold")
        .fontSize(badgeSize)
        .text("AI REWRITE", MARGIN + pad + cPad + 6, cursorY + cPad - 2, { characterSpacing: 0.8, lineBreak: false });
      doc
        .fillColor(COLOR.ink)
        .font("Helvetica-Oblique")
        .fontSize(titleSize)
        .text(suggestion.aiRewrite, MARGIN + pad + cPad + 6, cursorY + cPad + 12, {
          width: textW - cPad * 2 - 6,
          lineGap: 3,
        });
    }

    doc.y = y + cardH + 14;
  }
}

export async function buildPdfReport(view: ReportView): Promise<Buffer> {
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
    drawFooter(doc, page);
  });
  drawFooter(doc, 1);

  drawHeader(doc, view);
  drawScore(doc as PDFDocumentWithArc, view);
  drawSectionBars(doc, view);
  drawSummary(doc, view);
  drawKeywordList(doc, "Matched Keywords", view.matched, {
    fg: COLOR.emeraldText,
    bg: COLOR.emeraldSoft,
    caption: "Keywords found in your resume.",
  });
  drawKeywordList(doc, "Missing Keywords", view.missing, {
    fg: COLOR.roseText,
    bg: COLOR.roseSoft,
    caption: "Recommended keywords missing from your resume.",
  });
  drawCardList(doc, "Strengths", view.strengths, COLOR.emerald, "No strengths identified.", true);
  drawCardList(doc, "Weaknesses", view.weaknesses, COLOR.rose, "No weaknesses identified.", false);
  drawSuggestions(doc, view);

  doc.end();
  return done;
}
