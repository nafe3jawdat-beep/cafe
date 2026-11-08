import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { originGuard } from "./middleware/origin-guard";
import { requireAuth } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import publicRoutes from "./routes/public.routes";
import staffRoutes from "./routes/staff.routes";
import { menuImageDirectory } from "./middleware/menu-image-upload";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const requestId = req.get("x-request-id") ?? crypto.randomUUID();
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://images.unsplash.com",
          ],
          connectSrc: [
            "'self'",
            env.CLIENT_ORIGIN,
            "https://cafe-q.netlify.app",
            "ws:",
            "wss:",
          ],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  const allowedOrigins = new Set(
    [
      env.CLIENT_ORIGIN,
      "https://cafe-q.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ]
      .filter(Boolean)
      .map((value) => {
        try {
          return new URL(value).origin;
        } catch {
          return value;
        }
      })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        let normalizedOrigin = origin;
        try {
          normalizedOrigin = new URL(origin).origin;
        } catch {
          callback(new Error("Not allowed by CORS"));
          return;
        }

        const allowLocalhost =
          env.NODE_ENV !== "production" &&
          /^http:\/\/localhost:\d+$/.test(normalizedOrigin);

        if (allowLocalhost || allowedOrigins.has(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "X-Request-Id",
        "X-Requested-With",
      ],
    })
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(originGuard);
  app.use(
    "/uploads",
    express.static(menuImageDirectory, {
      dotfiles: "deny",
      index: false,
      maxAge: "1y",
      immutable: true,
      setHeaders: (res) => {
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );

  app.use("/api/health", healthRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/staff", requireAuth, staffRoutes);

  // Optional single-origin deployment: build the client and the API serves it.
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist, { maxAge: "1h", index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
