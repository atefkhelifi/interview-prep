import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "./db";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  plugins: [nextCookies()], // must stay last
});

export { googleEnabled };

export async function getSession() {
  await connection(); // session checks read the clock; keep them at request time
  return auth.api.getSession({ headers: await headers() });
}

// For server components / actions that need a signed-in user.
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
