import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { randomUUID } from "node:crypto";

export const demoLoginEnabled = () => process.env.DEMO_LOGIN === "1";
export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const providers: NextAuthOptions["providers"] = [];
if (googleEnabled()) {
  providers.push(GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }));
}
if (demoLoginEnabled()) {
  // DEMO ONLY: every click creates a fresh anonymous demo account. Not identity verification.
  providers.push(
    CredentialsProvider({
      id: "demo",
      name: "כניסת הדגמה",
      credentials: {},
      async authorize() {
        return { id: `demo:${randomUUID()}`, name: "משתמש/ת הדגמה" };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) token.acct = `${account.provider}:${account.providerAccountId ?? user.id}`;
      return token;
    },
    async session({ session, token }) {
      (session as { acct?: string }).acct = token.acct as string | undefined;
      return session;
    },
  },
};

export async function sessionAccount(): Promise<string | null> {
  const { getServerSession } = await import("next-auth");
  const s = await getServerSession(authOptions);
  return (s as { acct?: string } | null)?.acct ?? null;
}
