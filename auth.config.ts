import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const identity = user as {
          role?: string;
          subscriberId?: string;
          technicianId?: string;
          image?: string;
        };
        token.role = identity.role;
        token.subscriberId = identity.subscriberId;
        token.technicianId = identity.technicianId;
        if (identity.image) token.image = identity.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.subscriberId = token.subscriberId as string | undefined;
        session.user.technicianId = token.technicianId as string | undefined;
        if (token.image) session.user.image = token.image as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

