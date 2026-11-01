import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./error";
import { createOriginGuard } from "./origin-guard";

function createTestApp() {
  const app = express();
  app.use(createOriginGuard({
    NODE_ENV: "test",
    CLIENT_ORIGIN: "https://cafe.example.com",
  }));
  app.post("/mutation", (_req, res) => res.status(204).end());
  app.use(errorHandler);
  return app;
}

describe("origin guard", () => {
  it("allows a matching origin", async () => {
    const response = await request(createTestApp())
      .post("/mutation")
      .set("Origin", "https://cafe.example.com");

    expect(response.status).toBe(204);
  });

  it("compares normalized origins", async () => {
    const app = express();
    app.use(
      createOriginGuard({
        NODE_ENV: "test",
        CLIENT_ORIGIN: "https://CAFE.example.com:443",
      })
    );
    app.post("/mutation", (_req, res) => res.status(204).end());
    app.use(errorHandler);

    const response = await request(app)
      .post("/mutation")
      .set("Origin", "https://cafe.example.com");

    expect(response.status).toBe(204);
  });

  it("rejects a foreign origin with 403", async () => {
    const response = await request(createTestApp())
      .post("/mutation")
      .set("Origin", "https://attacker.example");

    expect(response.status).toBe(403);
  });

  it("rejects a missing origin and invalid referer with 403", async () => {
    const response = await request(createTestApp())
      .post("/mutation")
      .set("Referer", "https://attacker.example/form");

    expect(response.status).toBe(403);
  });

  it("allows a missing origin when the referer starts with the client origin", async () => {
    const response = await request(createTestApp())
      .post("/mutation")
      .set("Referer", "https://cafe.example.com/orders");

    expect(response.status).toBe(204);
  });

  it("keeps the bypass limited to development", async () => {
    const app = express();
    app.use(
      createOriginGuard({
        NODE_ENV: "development",
        CLIENT_ORIGIN: "https://cafe.example.com",
      })
    );
    app.post("/mutation", (_req, res) => res.status(204).end());
    app.use(errorHandler);

    const response = await request(app).post("/mutation");
    expect(response.status).toBe(204);
  });
});
