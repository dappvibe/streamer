import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as authSchema from './auth-schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: authSchema.user,
      session: authSchema.session,
      account: authSchema.account,
      verification: authSchema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const users = await db.select().from(authSchema.user);
          if (users.length > 0) {
            throw new APIError('BAD_REQUEST', { message: 'Only one user is allowed to sign up.' });
          }
        },
      },
    },
  },
});
