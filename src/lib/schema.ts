import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// App tables only - auth tables are in auth-schema.ts
export const streams = sqliteTable('streams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  rtmpUrl: text('rtmp_url').notNull(),
  streamKey: text('stream_key').notNull(),
  enabled: integer('enabled').default(1),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
