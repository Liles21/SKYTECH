import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';
import { DEMO_ACCOUNTS } from '@/app/lib/demo-accounts';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');

        // 1. Built-in accounts (Guaranteed to work always)
        const builtIn = Object.values(DEMO_ACCOUNTS).find(
          (account) =>
            account.email.toLowerCase() === email ||
            (account.subscriberId && account.subscriberId.toLowerCase() === email)
        );

        if (builtIn && password === builtIn.password) {
          // If maintenance mode is active, prevent subscriber login
          if (builtIn.role === 'subscriber') {
            try {
              const settings = await prisma.systemSettings.findUnique({
                where: { id: 'singleton' },
                select: { maintenanceMode: true },
              });
              if (settings?.maintenanceMode) {
                return null;
              }
            } catch {
              // Ignore DB check error in fallback
            }
          }

          let builtInImage: string | null = null;
          // Sync with database if reachable
          try {
            const hashedPassword = await bcrypt.hash(builtIn.password, 10);
            const dbUser = await prisma.user.upsert({
              where: { email: builtIn.email },
              update: {
                password: hashedPassword,
                role: builtIn.role,
                name: builtIn.name,
              },
              create: {
                id: builtIn.id,
                name: builtIn.name,
                email: builtIn.email,
                password: hashedPassword,
                role: builtIn.role,
                subscriberId: builtIn.subscriberId,
                technicianId: builtIn.technicianId,
              },
            });

            if (dbUser?.image) {
              builtInImage = dbUser.image;
            } else if (builtIn.subscriberId) {
              const sub = await prisma.subscriber.findUnique({ where: { id: builtIn.subscriberId } });
              builtInImage = sub?.image || null;
            }
          } catch (e) {
            console.warn('Database offline or unreachable; using built-in account authentication.', e);
          }

          return {
            id: builtIn.id,
            name: builtIn.name,
            email: builtIn.email,
            role: builtIn.role,
            subscriberId: builtIn.subscriberId,
            technicianId: builtIn.technicianId,
            image: builtInImage || undefined,
          };
        }

        // 2. Database user lookup for custom registered accounts & updated passwords
        try {
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email },
                { subscriberId: email.toUpperCase() },
                { subscriberId: email },
              ],
            },
          });
          if (user && (await bcrypt.compare(password, user.password))) {
            // If maintenance mode is active, prevent subscriber login
            if (user.role === 'subscriber') {
              try {
                const settings = await prisma.systemSettings.findUnique({
                  where: { id: 'singleton' },
                  select: { maintenanceMode: true },
                });
                if (settings?.maintenanceMode) {
                  return null;
                }
              } catch {
                // Ignore DB error
              }
            }

            if (builtIn) {
              builtIn.password = password;
            }
            let userImage = user.image;
            if (!userImage && user.subscriberId) {
              const sub = await prisma.subscriber.findUnique({ where: { id: user.subscriberId } });
              userImage = sub?.image || null;
            }
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              subscriberId: user.subscriberId,
              technicianId: user.technicianId,
              image: userImage || undefined,
            };
          }
        } catch (error) {
          console.warn('Prisma user lookup error:', error instanceof Error ? error.message : error);
        }

        return null;
      },
    }),
  ],
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
        session.user.subscriberId = token.subscriberId;
        session.user.technicianId = token.technicianId;
        if (token.image) session.user.image = token.image as string;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
});
