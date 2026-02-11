import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import transactionRoutes from "./routes/transaction.js";

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await fastify.register(transactionRoutes);

fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const PORT = parseInt(process.env.PORT || "3001");
const HOST = process.env.HOST || "0.0.0.0";

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`Server listening on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
