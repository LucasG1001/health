import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => parseFloat(value));
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

// idleTimeoutMillis: 0 porque durante o treino os checks vêm espaçados por minutos — reciclar
// conexões ociosas faria quase todo check pagar TCP + handshake SCRAM antes da primeira query.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 0,
  keepAlive: true,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000,
});

// Sem este listener, um erro em conexão ociosa (restart do Postgres, queda de rede)
// é emitido como 'error' sem tratamento e derruba o processo.
pool.on("error", (error) => {
  console.error("Erro em conexão ociosa do pool:", error);
});

/**
 * ROLLBACK que não substitui o erro original: se a conexão já caiu, o próprio
 * ROLLBACK rejeita e mascararia a causa real da falha.
 */
export async function rollback(client: pg.PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch (error) {
    console.error("Falha ao executar ROLLBACK:", error);
  }
}

export { pool };
