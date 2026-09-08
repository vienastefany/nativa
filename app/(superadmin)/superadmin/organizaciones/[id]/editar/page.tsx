import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OrganizacionForm from "@/components/organizaciones/OrganizacionForm";
import { SUPERADMIN } from "@/lib/auth-guard";

export default async function EditarOrganizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.rol !== SUPERADMIN) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const organizacionId = Number(id);
  if (!Number.isInteger(organizacionId)) {
    notFound();
  }

  const organizacion = await prisma.organizacion.findUnique({
    where: { id: organizacionId },
  });

  if (!organizacion) {
    notFound();
  }

  return (
    <OrganizacionForm
      modo="editar"
      organizacionId={organizacion.id}
      initialData={{
        nombre: organizacion.nombre,
        ruc: organizacion.ruc,
        direccion: organizacion.direccion,
        telefono: organizacion.telefono,
        correo: organizacion.correo,
        logo_url: organizacion.logo_url,
        activo: organizacion.activo,
      }}
    />
  );
}
