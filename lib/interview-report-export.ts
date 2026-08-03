import "server-only";

import PDFDocument from "pdfkit";

import {
  REPORT_CATEGORY_LABELS,
  REPORT_DIFFICULTY_LABELS,
  REPORT_EXPERIENCE_LABELS,
  REPORT_TYPE_LABELS,
  HIRING_RECOMMENDATION_LABELS,
} from "@/lib/interview-report";
import {
  COLOR,
  CONTENT_WIDTH,
  MARGIN,
  PAGE_WIDTH,
  beginBlock,
  clamp01,
  drawBrandMark,
  drawCheckIcon,
  drawCrossIcon,
  drawFooter,
  drawStatusPill,
  ensureSpace,
  formatDate,
  measureText,
  sectionTitle,
  textHeight,
  truncateToWidth,
  TYPE,
  type PDFDocumentWithArc,
} from "@/lib/pdf-style";
import type { InterviewReport } from "@/lib/types/interview";

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function categoryLabel(report: InterviewReport, category: string): string {
  return REPORT_CATEGORY_LABELS[category as keyof typeof REPORT_CATEGORY_LABELS] ?? category;
}

/** Render an interview report as clean, GitHub-compatible markdown. */
export function buildInterviewReportMarkdown(report: InterviewReport): string {
  const lines: string[] = [];

  lines.push("# Interview Report", "");
  lines.push(
    [
      `- **Role:** ${report.jobRole ?? "—"}`,
      `- **Company:** ${report.company ?? "—"}`,
      `- **Experience level:** ${REPORT_EXPERIENCE_LABELS[report.experienceLevel]}`,
      `- **Interview type:** ${REPORT_TYPE_LABELS[report.interviewType]}`,
      `- **Completed:** ${formatDate(report.completedAt)}`,
    ].join("\n"),
    "",
  );

  lines.push("## Overall Score", "", `**${report.overallScore} / 100**`, "");
  lines.push(
    `**Recommendation:** ${HIRING_RECOMMENDATION_LABELS[report.hiringRecommendation]}`,
    "",
  );

  lines.push("## Summary", "", report.summary, "");

  lines.push("## Performance by Category", "");
  lines.push("| Category | Score |", "| --- | ---: |");
  for (const section of report.categoryScores) {
    lines.push(`| ${escapePipe(categoryLabel(report, section.category))} | ${section.score} / 100 |`);
  }
  lines.push("");

  lines.push("## Strengths", "");
  if (report.strengths.length > 0) {
    for (const strength of report.strengths) {
      lines.push(`- ${escapePipe(strength)}`);
    }
  } else {
    lines.push("_No strengths identified._");
  }
  lines.push("");

  lines.push("## Areas to Improve", "");
  if (report.weaknesses.length > 0) {
    for (const weakness of report.weaknesses) {
      lines.push(`- ${escapePipe(weakness)}`);
    }
  } else {
    lines.push("_No areas to improve identified — impressive._");
  }
  lines.push("");

  lines.push("## Recommendations", "");
  if (report.recommendations.length > 0) {
    for (const recommendation of report.recommendations) {
      lines.push(`- ${escapePipe(recommendation)}`);
    }
  } else {
    lines.push("_No recommendations yet._");
  }
  lines.push("");

  lines.push("## Question Breakdown", "");
  if (report.questions.length > 0) {
    for (const question of report.questions) {
      lines.push(
        `### ${question.questionNumber}. ${escapePipe(question.question)}`,
        "",
        `**Score:** ${question.score} / 100 · **Category:** ${categoryLabel(report, question.category)} · **Difficulty:** ${REPORT_DIFFICULTY_LABELS[question.difficulty]} · **Expected:** ${question.expectedDuration} min`,
        "",
      );
      if (question.answer.trim()) {
        lines.push(`> ${question.answer.trim().split(/\n{2,}/).join("\n>\n")}`, "");
      } else {
        lines.push("_No answer recorded._", "");
      }
    }
  } else {
    lines.push("_No evaluated questions yet._");
  }

  return lines.join("\n");
}

function drawHeader(doc: PDFKit.PDFDocument, report: InterviewReport) {
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
    .text("INTERVIEW INTELLIGENCE", MARGIN + 34, MARGIN + 22, { characterSpacing: 1.2 });

  const titleY = MARGIN + 58;
  doc
    .fillColor(COLOR.ink)
    .font("Helvetica-Bold")
    .fontSize(TYPE.title)
    .text("Interview Report", MARGIN, titleY, {
      width: CONTENT_WIDTH - 170,
      lineBreak: false,
      ellipsis: true,
    });
  const pillH = 24;
  const recommendationLabel = HIRING_RECOMMENDATION_LABELS[report.hiringRecommendation];
  const pillW = measureText(doc, recommendationLabel, "Helvetica-Bold", TYPE.caption) + 28;
  drawStatusPill(
    doc,
    PAGE_WIDTH - MARGIN - pillW,
    titleY + 4,
    recommendationLabel,
    COLOR.ink,
    COLOR.neutralSoft,
    pillH,
    TYPE.caption,
  );

  doc
    .fillColor(COLOR.muted)
    .font("Helvetica")
    .fontSize(TYPE.body)
    .text("A performance summary of your mock interview.", MARGIN, titleY + 34, {
      width: CONTENT_WIDTH,
      lineBreak: false,
    });

  const rows: [string, string][] = [
    ["Role", report.jobRole ?? "—"],
    ["Company", report.company ?? "—"],
    ["Experience", REPORT_EXPERIENCE_LABELS[report.experienceLevel]],
    ["Type", REPORT_TYPE_LABELS[report.interviewType]],
    ["Completed", formatDate(report.completedAt)],
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

function drawScore(doc: PDFDocumentWithArc, report: InterviewReport) {
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

  const fraction = clamp01(report.overallScore / 100);
  if (fraction > 0) {
    const start = -Math.PI / 2;
    const end = start + fraction * 2 * Math.PI;
    doc
      .strokeColor(COLOR.primary)
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
  const scoreH = textHeight(doc, `${report.overallScore}`, { width: boxW, align: "center" });
  doc.fillColor(COLOR.faint).font("Helvetica").fontSize(TYPE.caption);
  const capH = textHeight(doc, "OVERALL SCORE", {
    width: boxW,
    align: "center",
    characterSpacing: 1.2,
  });
  const cap2H = textHeight(doc, "out of 100", { width: boxW, align: "center" });

  let textY = centerY - (scoreH + capH + cap2H) / 2;
  doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(40);
  doc.text(`${report.overallScore}`, boxX, textY, { width: boxW, align: "center" });
  textY += scoreH;
  doc.fillColor(COLOR.faint).font("Helvetica").fontSize(TYPE.caption);
  doc.text("OVERALL SCORE", boxX, textY, { width: boxW, align: "center", characterSpacing: 1.2 });
  textY += capH;
  doc.text("out of 100", boxX, textY, { width: boxW, align: "center" });

  const recommendationLabel = HIRING_RECOMMENDATION_LABELS[report.hiringRecommendation];
  const badgeSize = TYPE.caption;
  const badgeW = measureText(doc, recommendationLabel, "Helvetica-Bold", badgeSize) + 30;
  const badgeX = centerX - badgeW / 2;
  const badgeY = y + pad + gaugeD + 14;
  doc.fillColor(COLOR.primarySoft).roundedRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2).fill();
  doc.fillColor(COLOR.primary).rect(badgeX + 13, badgeY + badgeH / 2 - 2.5, 5, 5).fill();
  doc
    .fillColor(COLOR.primary)
    .font("Helvetica-Bold")
    .fontSize(badgeSize)
    .text(recommendationLabel, badgeX + 24, badgeY + (badgeH - badgeSize) / 2, { width: badgeW - 30, align: "left" });

  doc.y = y + cardH + 22;
}

function drawCategoryBars(doc: PDFKit.PDFDocument, report: InterviewReport) {
  sectionTitle(doc, "Performance by Category");

  const labelW = 100;
  const valueW = 34;
  const barH = 9;
  const rowH = 30;
  const barX = MARGIN + labelW + 8;
  const barW = CONTENT_WIDTH - labelW - 8 - valueW - 10;

  for (const section of report.categoryScores) {
    ensureSpace(doc, rowH + 6);
    const y = doc.y;
    const label = categoryLabel(report, section.category);
    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(TYPE.body)
      .text(label, MARGIN, y + 1, { width: labelW - 4, lineBreak: false, ellipsis: true });

    doc.fillColor(COLOR.track).roundedRect(barX, y + 3, barW, barH, barH / 2).fill();
    const fraction = clamp01(section.score / 100);
    if (fraction > 0) {
      doc.fillColor(COLOR.primary).roundedRect(barX, y + 3, Math.max(barW * fraction, barH), barH, barH / 2).fill();
    }

    doc
      .fillColor(COLOR.muted)
      .font("Helvetica-Bold")
      .fontSize(TYPE.body)
      .text(`${section.score}%`, barX + barW + 10, y + 1, { width: valueW, align: "right" });

    doc.y = y + rowH;
  }

  doc.y += 12;
}

function drawSummary(doc: PDFKit.PDFDocument, report: InterviewReport) {
  sectionTitle(doc, "Summary");

  const pad = 16;
  const textW = CONTENT_WIDTH - pad * 2;
  const height = textHeight(doc, report.summary, { width: textW, lineGap: 4 }) + pad * 2;
  const y = beginBlock(doc, height);

  doc.fillColor(COLOR.surface).roundedRect(MARGIN, y, CONTENT_WIDTH, height, 10).fill();
  doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, y, CONTENT_WIDTH, height, 10).stroke();
  doc
    .fillColor(COLOR.ink)
    .font("Helvetica")
    .fontSize(TYPE.body)
    .text(report.summary, MARGIN + pad, y + pad, { width: textW, lineGap: 4 });

  doc.y = y + height + 22;
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

function drawQuestionBreakdown(doc: PDFKit.PDFDocument, report: InterviewReport) {
  sectionTitle(doc, "Question Breakdown");

  if (report.questions.length === 0) {
    doc
      .fillColor(COLOR.muted)
      .font("Helvetica-Oblique")
      .fontSize(TYPE.body)
      .text("No evaluated questions yet.", MARGIN, doc.y);
    return;
  }

  const pad = 16;
  const textW = CONTENT_WIDTH - pad * 2;
  const chipH = 18;
  const chipSize = TYPE.caption;
  const gap = 10;

  for (const question of report.questions) {
    const head = `Q${question.questionNumber} · ${categoryLabel(report, question.category)} · ${REPORT_DIFFICULTY_LABELS[question.difficulty]} · ${question.expectedDuration} min`;
    const meta = `Score: ${question.score} / 100`;

    doc.fillColor(COLOR.ink).font("Helvetica-Bold").fontSize(TYPE.body);
    const headH = textHeight(doc, head, { width: textW, lineGap: 2 });
    const questionH = textHeight(doc, question.question, { width: textW, lineGap: 3 });
    const answerH = question.answer.trim()
      ? textHeight(doc, question.answer.trim(), { width: textW, lineGap: 3 })
      : 0;

    const cardH = pad + headH + 4 + questionH + 8 + (answerH > 0 ? answerH + 12 : 0) + pad;
    const y = beginBlock(doc, cardH);

    doc.fillColor(COLOR.surface).roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 10).fill();
    doc.strokeColor(COLOR.border).lineWidth(0.8).roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 10).stroke();
    doc.fillColor(COLOR.primary).rect(MARGIN, y, 3, cardH).fill();

    let cursorY = y + pad;
    doc
      .fillColor(COLOR.faint)
      .font("Helvetica-Bold")
      .fontSize(chipSize)
      .text(head.toUpperCase(), MARGIN + pad, cursorY, { width: textW, characterSpacing: 0.6, lineBreak: false });
    const metaW = measureText(doc, meta, "Helvetica-Bold", chipSize) + 16;
    doc
      .fillColor(COLOR.primarySoft)
      .roundedRect(PAGE_WIDTH - MARGIN - pad - metaW, cursorY - 3, metaW, chipH, chipH / 2)
      .fill();
    doc
      .fillColor(COLOR.primary)
      .font("Helvetica-Bold")
      .fontSize(chipSize)
      .text(meta, PAGE_WIDTH - MARGIN - pad - metaW + 8, cursorY + (chipH - chipSize) / 2 - 3, {
        lineBreak: false,
      });
    cursorY += headH + 4;

    doc
      .fillColor(COLOR.ink)
      .font("Helvetica-Bold")
      .fontSize(TYPE.body)
      .text(question.question, MARGIN + pad, cursorY, { width: textW, lineGap: 3 });
    cursorY += questionH + 8;

    if (question.answer.trim()) {
      doc
        .fillColor(COLOR.muted)
        .font("Helvetica-Oblique")
        .fontSize(TYPE.body)
        .text(question.answer.trim(), MARGIN + pad, cursorY, { width: textW, lineGap: 3 });
    }

    doc.y = y + cardH + gap;
  }

  doc.y += 12;
}

/** Render an interview report as a PDF buffer. */
export async function buildInterviewReportPdf(report: InterviewReport): Promise<Buffer> {
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

  drawHeader(doc, report);
  drawScore(doc as PDFDocumentWithArc, report);
  drawCategoryBars(doc, report);
  drawSummary(doc, report);
  drawCardList(doc, "Strengths", report.strengths, COLOR.emerald, "No strengths identified.", true);
  drawCardList(
    doc,
    "Areas to Improve",
    report.weaknesses,
    COLOR.rose,
    "No areas to improve identified — impressive.",
    false,
  );
  drawCardList(doc, "Recommendations", report.recommendations, COLOR.primary, "No recommendations yet.", false);
  drawQuestionBreakdown(doc, report);

  doc.end();
  return done;
}
