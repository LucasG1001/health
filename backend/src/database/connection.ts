import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => parseFloat(value));
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => parseInt(value, 10));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export { pool };
