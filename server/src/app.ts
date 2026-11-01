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
import publicRoutes from "./routes/public.routes";
import staffRoutes from "./routes/staff.routes";
import { menuImageDirectory } from "./middleware/menu-image-upload";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

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
            "ws:",
            "wss:",
          ],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        const allowLocalhost =
          env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin ?? "");

        if (!origin || allowLocalhost || origin === env.CLIENT_ORIGIN) {
          callback(null, true);
          return;
        }

        if (env.NODE_ENV === "production") {
          callback(new Error("Not allowed by CORS"));
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "cafe-qr-api",
      time: new Date().toISOString(),
    });
  });

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
