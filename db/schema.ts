import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const votes=sqliteTable('votes',{book:text('book').notNull(),voter:text('voter').notNull(),stars:integer('stars').notNull()},table=>[primaryKey({columns:[table.book,table.voter]})]);
export const subscribers=sqliteTable('subscribers',{email:text('email').primaryKey(),createdAt:text('created_at').notNull(),status:text('status').notNull().default('pending-import')});
export const submissionLimits=sqliteTable('submission_limits',{identity:text('identity').primaryKey(),minute:integer('minute').notNull(),count:integer('count').notNull()});
