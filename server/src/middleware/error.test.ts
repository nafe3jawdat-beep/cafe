import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./error";

function appThrowing(error: unknown) {
  const app = express();
  app.get("/boom", (_req, _res, next) => next(error));
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("returns 503 when Prisma cannot reach the database", async () => {
    const response = await request(
      appThrowing(
        new Prisma.PrismaClientKnownRequestError("db down", {
          code: "P1001",
          clientVersion: "6.19.3",
        })
      )
    ).get("/boom");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 503 for a Prisma initialization failure", async () => {
    const response = await request(
      appThrowing(
        new Prisma.PrismaClientInitializationError(
          "cannot reach database",
          "P1001",
          "6.19.3"
        )
      )
    ).get("/boom");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("keeps unknown errors as a generic 500", async () => {
    const response = await request(appThrowing(new Error("boom"))).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });
});
