import os from "os";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TEST_DATABASE_URL ?? "postgresql://health:health@localhost:5433/health_test";

// Os testes truncam todas as tabelas: apontar para o banco de desenvolvimento apagaria os dados.
if (!new URL(url).pathname.endsWith("_test")) {
  throw new Error(`TEST_DATABASE_URL precisa apontar para um banco *_test (recebido: ${url}).`);
}

process.env.DATABASE_URL = url;
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "health-test-uploads");
