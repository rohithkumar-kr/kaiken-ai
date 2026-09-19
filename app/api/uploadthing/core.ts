import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";

import { prisma } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f(
    {
      pdf: {
        maxFileSize: "16MB",
        maxFileCount: 1,
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        maxFileSize: "16MB",
        maxFileCount: 1,
      },
    },
    {
      awaitServerData: true,
    }
  )
    .middleware(async () => {
      console.log("[UploadThing] ===== MIDDLEWARE START =====");

      try {
        const { userId } = await auth();

        console.log("[UploadThing] middleware userId:", userId);

        if (!userId) {
          console.error("[UploadThing] middleware: UNAUTHORIZED");
          throw new Error("Unauthorized");
        }

        console.log("[UploadThing] ===== MIDDLEWARE SUCCESS =====");

        return { userId };
      } catch (error) {
        console.error("[UploadThing] ===== MIDDLEWARE FAILED =====");
        console.error(error);
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("[UploadThing] ===== onUploadComplete START =====");

      console.log("[UploadThing] metadata:", metadata);

      console.log("[UploadThing] file:", {
        name: file.name,
        key: file.key,
        size: file.size,
        type: file.type,
        url: file.ufsUrl,
      });

      try {
        console.log("[UploadThing] About to create Resume in Prisma...");

        const user = await prisma.user.findUnique({
  where: {
    clerkId: metadata.userId,
  },
});

if (!user) {
  throw new Error(
    `Prisma user not found for Clerk user ${metadata.userId}`
  );
}

console.log("[UploadThing] Prisma user found:", {
  id: user.id,
  clerkId: user.clerkId,
  email: user.email,
});

const resume = await prisma.resume.create({
  data: {
    userId: user.id,
    title: file.name,
    fileName: file.name,
    fileKey: file.key,
    fileUrl: file.ufsUrl,
    fileType: file.type.includes("pdf") ? "PDF" : "DOCX",
    fileSize: file.size,
    parseStatus: "PENDING",
  },
});

        console.log("[UploadThing] ===== PRISMA CREATE SUCCESS =====");
        console.log("[UploadThing] resumeId:", resume.id);

        const serverData = {
          resumeId: resume.id,
        };

        console.log("[UploadThing] Returning serverData:", serverData);
        console.log("[UploadThing] ===== onUploadComplete END =====");

        return serverData;
      } catch (error) {
        console.error("[UploadThing] ===== onUploadComplete FAILED =====");
        console.error(error);
        throw error;
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;