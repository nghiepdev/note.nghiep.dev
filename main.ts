import "dotenv/load.ts";

console.log("hello deno", Deno.env.get("DETA_PROJECT_KEY"));
