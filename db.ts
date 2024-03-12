import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema.ts";

const turso = createClient({
  url: Deno.env.get("TURSO_DATABASE_URL") ?? "",
  authToken: Deno.env.get("TURSO_AUTH_TOKEN"),
});

export const db = drizzle(turso, {
  schema,
});
