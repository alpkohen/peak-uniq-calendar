import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import postgres from "postgres";

function loadEnv() {
  const env = {};
  try {
    const lines = readFileSync(".env.local", "utf8").split("\n");
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i === -1) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // .env.local yoksa ortam değişkenlerine bakılır
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value) env[key] = value;
  }
  return env;
}

function connectionString(env) {
  if (env.SUPABASE_DATABASE_URL) return env.SUPABASE_DATABASE_URL;
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const password = env.SUPABASE_DB_PASSWORD;
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!ref || !password) {
    throw new Error(
      "SUPABASE_DB_PASSWORD veya SUPABASE_DATABASE_URL gerekli.\n" +
        "Supabase Dashboard → Project Settings → Database → Database password",
    );
  }

  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
}

async function main() {
  const env = loadEnv();
  const sql = postgres(connectionString(env), { ssl: "require", max: 1 });
  const dir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const statement = readFileSync(join(dir, file), "utf8").trim();
    if (!statement) continue;
    console.log(`→ ${file}`);
    await sql.unsafe(statement);
  }

  await sql.end();
  console.log("Migration tamamlandı.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
