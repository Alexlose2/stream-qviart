import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { env, isEmailAllowed } from "@/lib/config";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/"
  },
  providers:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET
          })
        ]
      : [],
  callbacks: {
    async signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    async jwt({ token }) {
      token.allowed = isEmailAllowed(token.email);
      return token;
    },
    async session({ session, token }) {
      session.user.allowed = Boolean(token.allowed);
      return session;
    }
  }
};
