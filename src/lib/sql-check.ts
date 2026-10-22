import "server-only";
import Database from "better-sqlite3";
import type { SqlSpec } from "./workshops";

// What the browser gets for a SQL task: datasets with the reference query's rows,
// never the reference query itself.
export type ClientSqlSpec = {
  setup: string;
  ordered: boolean;
  datasets: { name: string; sql: string; expected: unknown[][] }[];
};

export function toClientSqlSpec(spec: SqlSpec): ClientSqlSpec {
  const datasets = [{ name: "Sample data", sql: "" }, ...(spec.variants ?? [])].map((d) => {
    const db = new Database(":memory:");
    try {
      db.exec(spec.setup);
      if (d.sql) db.exec(d.sql);
      return { ...d, expected: db.prepare(spec.solution).raw().all() as unknown[][] };
    } finally {
      db.close();
    }
  });
  return { setup: spec.setup, ordered: spec.ordered, datasets };
}
