// backend/src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { CONFIG } from "./config";
import healthRouter from "./routes/health";
import demoRouter from "./routes/demo";
import meRouter from "./routes/me";
import employeeRouter from "./routes/employee";
import adminRouter from "./routes/admin";
import toolsRouter from "./routes/tools";
import metricsRouter from "./routes/metrics";
import auditRouter from "./routes/audit";
import agentRouter from "./routes/agent";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// JSON body parsing with size limit
app.use(express.json({ limit: "100kb" }));

// CORS: allow any localhost port in dev, or exact origin in prod
const allowedOrigins = CONFIG.frontendOrigin
  ? CONFIG.frontendOrigin.split(",").map(s => s.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, etc.)
      if (!origin) return callback(null, true);
      // Allow any localhost/127.0.0.1 origin (any port) in dev
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Allow explicitly configured origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// Request ID middleware for tracing
app.use(requestIdMiddleware);

// Attach routers
app.use("/api/health", healthRouter);
app.use("/api/demo", demoRouter);
app.use("/api/me", meRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/admin", adminRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/audit", auditRouter);
app.use("/api/agent", agentRouter);

// Centralized error handling (must be after routes)
app.use(errorHandler);

export default app;
