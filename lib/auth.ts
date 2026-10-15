import { getUser, getUserByEmail, updateUser } from "@/lib/db/repository";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

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

        const usuario = await getUserByEmail(credentials.correo as string);

        if (!usuario || !usuario.activo || !["SuperAdmin", "Administrador"].includes(usuario.rol.nombre)) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          usuario.password
        );

        if (!passwordMatch) {
          return null;
        }

        await updateUser(usuario.id, { ultimo_acceso: new Date() });

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
      } else if (token.id) {
        const current = await getUser(Number(token.id));
        token.rol = current?.activo && ["SuperAdmin", "Administrador"].includes(current.rol.nombre) ? current.rol.nombre : "SinAcceso";
        token.rolId = current?.rol_id ?? 0;
        token.organizacionId = current?.organizacion_id ?? null;
        token.organizacionNombre = current?.organizacion?.nombre ?? null;
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
