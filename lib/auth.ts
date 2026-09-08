import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

// ============================================
// Cliente de Prisma ESTÁNDAR con driver adapter
// ============================================
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({
          where: {
            correo: credentials.correo as string,
          },
          include: {
            rol: true,
            organizacion: true,
          },
        });

        if (!usuario || !usuario.activo) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          usuario.password
        );

        if (!passwordMatch) {
          return null;
        }

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimo_acceso: new Date() },
        });

        return {
          id: usuario.id.toString(),
          correo: usuario.correo,
          rol: usuario.rol.nombre,
          rolId: usuario.rol_id,
          organizacionId: usuario.organizacion_id,
          organizacionNombre: usuario.organizacion?.nombre || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.correo = user.correo;
        token.rol = user.rol;
        token.rolId = user.rolId;
        token.organizacionId = user.organizacionId;
        token.organizacionNombre = user.organizacionNombre;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.correo = token.correo as string;
        session.user.rol = token.rol as string;
        session.user.rolId = token.rolId as number;
        session.user.organizacionId = token.organizacionId as number | null;
        session.user.organizacionNombre = token.organizacionNombre as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function auth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
