import { CONFIG } from "./config";
import app from "./app";
import pino from "pino";

const logger = pino({ level: "info" });

const port = Number(process.env.PORT) || CONFIG.port || 4000;

app.listen(port, "0.0.0.0", () => {
  logger.info(`Backend server listening on 0.0.0.0:${port}`);
});