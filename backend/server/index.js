import express from "express";
import cors from "cors";
import { createApiRouter, createGatewayRouter } from "../api/index.js";
import { bootstrap } from "../services/runtime.js";

const PORT = Number(process.env.PORT || 20180);
const HOST = process.env.HOST || "127.0.0.1";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));

app.use("/api", createApiRouter());
app.use("/v1", createGatewayRouter());

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

const server = app.listen(PORT, HOST, async () => {
  console.log(`[optiai] backend listening on http://${HOST}:${PORT}`);
  try {
    const { driver } = await bootstrap();
    console.log(`[optiai] 9Router layer ready (db driver: ${driver})`);
  } catch (error) {
    console.error("[optiai] 9Router layer failed to boot:", error.message);
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
