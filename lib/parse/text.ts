import "server-only";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type SupportedFileType = "pdf" | "docx";

/**
 * Extract plain text from an uploaded resume buffer.
 *
 * - PDF  → pdf-parse (PDF.js) `getText()`
 * - DOCX → Mammoth `extractRawText()`
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<string> {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}
