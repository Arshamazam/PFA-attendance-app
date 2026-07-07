import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "superadmin.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: false,
      },
    },
  },
  providers: [
    // Direct login via email + password (for 3002/login form)
    Credentials({
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(
            `${process.env.BACKEND_URL || "http://localhost:3000"}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );
          if (!res.ok) return null;
          const data = await res.json();
          const accessToken: string = data.token || data.access_token;
          const employee = data.employee || data.user;
          if (!accessToken || !employee) return null;

          const payload = JSON.parse(
            Buffer.from(accessToken.split(".")[1], "base64url").toString()
          );
          const role: string = payload.role || employee.role || "";
          if (role !== "super_admin") return null;

          return {
            id: employee.id ?? payload.sub,
            name: employee.name,
            email: employee.email,
            role,
            accessToken,
          };
        } catch {
          return null;
        }
      },
    }),

    // SSO: accept a pre-issued backend JWT from admin panel (3001)
    Credentials({
      id: "token-auth",
      credentials: { token: { type: "text" } },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        try {
          const token = credentials.token as string;
          // Verify against the backend — if /auth/me succeeds the token is valid
          const res = await fetch(
            `${process.env.BACKEND_URL || "http://localhost:3000"}/auth/me`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return null;
          const employee = await res.json();

          // Decode payload to get role (already verified via /auth/me)
          const payload = JSON.parse(
            Buffer.from(token.split(".")[1], "base64url").toString()
          );
          const role: string = payload.role || employee.role || "";
          if (role !== "super_admin") return null;

          return {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role,
            accessToken: token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: string; accessToken: string; id: string };
        token.role = u.role;
        token.accessToken = u.accessToken;
        token.id = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role as string;
        session.user.accessToken = token.accessToken as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      accessToken: string;
    };
  }
}
