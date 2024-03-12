import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  key: text("key").primaryKey(),
  value: text("value"),
});
