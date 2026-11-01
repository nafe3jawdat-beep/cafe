import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { errorHandler } from "../middleware/error";
import { badRequest } from "../lib/errors";
import { asyncHandler } from "../lib/async-handler";
import { menuImageUpload, getUploadedImage, saveMenuImage } from "./menu-image-upload";

const pngImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/rWQAAAAASUVORK5CYII=",
  "base64"
);

describe("menu image upload", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "cafe-menu-images-"));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  function createApp() {
    const app = express();
    app.post(
      "/menu",
      menuImageUpload,
      asyncHandler(async (req, res) => {
        const file = getUploadedImage(req);
        if (!file) throw badRequest("Choose an image.");
        const imageUrl = await saveMenuImage(file, directory);
        res.status(201).json({ imageUrl });
      })
    );
    app.use("/uploads", express.static(directory));
    app.use(errorHandler);
    return app;
  }

  it("stores an accepted image and serves it from its generated URL", async () => {
    const app = createApp();
    const upload = await request(app)
      .post("/menu")
      .attach("image", pngImage, {
        filename: "menu.png",
        contentType: "image/png",
      });

    expect(upload.status).toBe(201);
    expect(upload.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    const servedImage = await request(app).get(upload.body.imageUrl);
    expect(servedImage.status).toBe(200);
    expect(servedImage.headers["content-type"]).toMatch(/^image\/png/);
    expect(servedImage.body).toEqual(pngImage);
  });

  it.each([
    {
      format: "JPEG",
      mimetype: "image/jpeg",
      extension: ".jpg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    },
    {
      format: "WebP",
      mimetype: "image/webp",
      extension: ".webp",
      buffer: Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([4, 0, 0, 0]),
        Buffer.from("WEBP"),
      ]),
    },
  ])("accepts $format images", async ({ mimetype, extension, buffer }) => {
    const imageUrl = await saveMenuImage({ buffer, mimetype }, directory);
    expect(imageUrl).toMatch(new RegExp(`^/uploads/[0-9a-f-]+\\${extension}$`));
  });

  it("rejects files that claim to be images but have invalid contents", async () => {
    const response = await request(createApp())
      .post("/menu")
      .attach("image", Buffer.from("not an image"), {
        filename: "menu.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/not a valid/i);
  });

  it("rejects unsupported media types", async () => {
    const response = await request(createApp())
      .post("/menu")
      .attach("image", Buffer.from("plain text"), {
        filename: "menu.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/JPEG, PNG, or WebP/);
  });

  it("rejects uploads larger than 5 MB", async () => {
    const response = await request(createApp())
      .post("/menu")
      .attach("image", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "menu.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("FILE_TOO_LARGE");
  });
});
