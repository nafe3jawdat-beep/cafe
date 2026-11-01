import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError, badRequest } from "../lib/errors";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const menuImageDirectory = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.resolve(__dirname, "../../../uploads");

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 1,
    fields: 8,
    fieldSize: 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(badRequest("Choose a JPEG, PNG, or WebP image."));
      return;
    }

    callback(null, true);
  },
}).single("image");

export const menuImageUpload: RequestHandler = (req, res, next) => {
  parser(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(413, "FILE_TOO_LARGE", "Images must be 5 MB or smaller.")
        );
        return;
      }

      next(badRequest("The image upload is invalid."));
      return;
    }

    next(error);
  });
};

function getImageExtension(
  file: Pick<Express.Multer.File, "buffer" | "mimetype">
) {
  const { buffer, mimetype } = file;
  const isJpeg =
    mimetype === "image/jpeg" &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isPng =
    mimetype === "image/png" &&
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  const isWebp =
    mimetype === "image/webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  if (isJpeg) return ".jpg";
  if (isPng) return ".png";
  if (isWebp) return ".webp";

  throw badRequest("The uploaded file is not a valid JPEG, PNG, or WebP image.");
}

export async function saveMenuImage(
  file: Pick<Express.Multer.File, "buffer" | "mimetype">,
  directory = menuImageDirectory
) {
  const extension = getImageExtension(file);
  const fileName = `${crypto.randomUUID()}${extension}`;

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, fileName), file.buffer, {
    flag: "wx",
    mode: 0o644,
  });

  return `/uploads/${fileName}`;
}

export async function removeMenuImage(imageUrl: string) {
  const match =
    /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:jpg|png|webp)$/i.exec(
      imageUrl
    );
  if (!match) return;

  try {
    await fs.unlink(path.join(menuImageDirectory, match[1] + path.extname(imageUrl)));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}
