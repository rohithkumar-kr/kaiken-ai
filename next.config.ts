import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (PDF.js) and mammoth load native-ish / non-bundlable Node modules
  // (workers, filesystem helpers). Keep them external to the server bundle.
  serverExternalPackages: ["pdf-parse", "mammoth", "pdfkit"],
};

export default nextConfig;
