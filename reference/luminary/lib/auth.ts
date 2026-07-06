import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { isDemoMode } from "./utils";

/**
 * Auth configuration.
 * - Email magic-link is the primary method (NextAuth EmailProvider).
 *   When SMTP env vars are absent, the login link is printed to the server
 *   console instead of emailed, so the flow still works locally.
 * - A demo credentials provider (email only, no password) is enabled in
 *   demo mode so the whole app can be explored without an SMTP server.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
  },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER_HOST
        ? {
            host: process.env.EMAIL_SERVER_HOST,
            port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          }
        : undefined,
      from: process.env.EMAIL_FROM ?? "Luminary <hello@luminary.app>",
      async sendVerificationRequest({ identifier, url }) {
        if (!process.env.EMAIL_SERVER_HOST) {
          // eslint-disable-next-line no-console
          console.log(
            `\n✨ Luminary magic link for ${identifier}:\n${url}\n`,
          );
          return;
        }
        // Fall through to NextAuth's default nodemailer transport.
        const nodemailer = await import("nodemailer");
        const transport = nodemailer.createTransport({
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        });
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM,
          subject: "Your Luminary sign-in link",
          text: `Sign in to Luminary:\n${url}\n`,
          html: `<p>Sign in to <strong>Luminary</strong>:</p><p><a href="${url}">Enter Luminary</a></p>`,
        });
      },
    }),
    ...(isDemoMode()
      ? [
          CredentialsProvider({
            id: "demo",
            name: "Demo",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(creds) {
              const email = (creds?.email ?? "").toString().trim().toLowerCase();
              if (!email) return null;
              const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: { email, name: email.split("@")[0] },
              });
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      if (!token.uid && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) token.uid = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
};
