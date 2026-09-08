import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    correo: string;
    rol: string;
    rolId: number;
    organizacionId: number | null;
    organizacionNombre: string | null;
  }

  interface Session {
    user: {
      id: string;
      correo: string;
      rol: string;
      rolId: number;
      organizacionId: number | null;
      organizacionNombre: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    correo: string;
    rol: string;
    rolId: number;
    organizacionId: number | null;
    organizacionNombre: string | null;
  }
}