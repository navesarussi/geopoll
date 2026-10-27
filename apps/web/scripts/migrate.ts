import { migrate, postgresDb } from "../db";
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL (owner) required");
  await migrate(await postgresDb(url));
  console.log("migrations applied");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
