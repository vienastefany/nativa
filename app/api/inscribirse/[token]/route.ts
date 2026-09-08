import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

const dniValido = (dni: string) => /^\d{8}$/.test(dni);

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const tokenTrim = token.trim();
  if (!tokenTrim) {
    return NextResponse.json(
      { error: "Enlace inválido" },
      { status: 400 }
    );
  }

  try {
    const actividad = await prisma.actividadFormativa.findUnique({
      where: { token_inscripcion: tokenTrim },
      select: {
        id: true,
        titulo: true,
        estado: true,
        inscripciones_abiertas: true,
        capacidad: true,
      },
    });

    if (!actividad) {
      return NextResponse.json(
        { error: "El enlace no corresponde a una actividad" },
        { status: 404 }
      );
    }

    if (actividad.estado !== "Publicada") {
      return NextResponse.json(
        { error: "Las inscripciones aún no están abiertas" },
        { status: 409 }
      );
    }

    if (!actividad.inscripciones_abiertas) {
      return NextResponse.json(
        { error: "Las inscripciones están cerradas" },
        { status: 409 }
      );
    }

    const body = await request.json();

    const nombres =
      typeof body.nombres === "string" ? body.nombres.trim() : "";
    const apellidos =
      typeof body.apellidos === "string" ? body.apellidos.trim() : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";

    if (!nombres || !apellidos) {
      return NextResponse.json(
        { error: "Nombres y apellidos son obligatorios" },
        { status: 400 }
      );
    }
    if (!dniValido(dni)) {
      return NextResponse.json(
        { error: "Ingresa un DNI válido (8 dígitos)" },
        { status: 400 }
      );
    }

    const telefono =
      typeof body.telefono === "string" ? body.telefono.trim() || null : null;
    const direccion =
      typeof body.direccion === "string" ? body.direccion.trim() || null : null;

    const inscritas = await prisma.inscripcion.count({
      where: {
        actividad_formativa_id: actividad.id,
        estado: "Inscrita",
      },
    });

    if (
      actividad.capacidad != null &&
      inscritas >= actividad.capacidad
    ) {
      return NextResponse.json(
        { error: "El cupo de la actividad está completo" },
        { status: 409 }
      );
    }

    let participante = await prisma.participante.findUnique({
      where: { dni },
    });

    if (!participante) {
      participante = await prisma.participante.create({
        data: { nombres, apellidos, dni, telefono, direccion },
      });
    }

    try {
      const inscripcion = await prisma.inscripcion.create({
        data: {
          actividad_formativa_id: actividad.id,
          participante_id: participante.id,
          estado: "Inscrita",
        },
        include: {
          participante: {
            select: { id: true, nombres: true, apellidos: true, dni: true },
          },
        },
      });
      return NextResponse.json(
        {
          ok: true,
          mensaje: "Inscripción registrada correctamente",
          participante: `${inscripcion.participante.nombres} ${inscripcion.participante.apellidos}`,
        },
        { status: 201 }
      );
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === "P2002") {
        // Ya existía inscripción (quizá cancelada antes)
        const existente = await prisma.inscripcion.findUnique({
          where: {
            participante_id_actividad_formativa_id: {
              participante_id: participante.id,
              actividad_formativa_id: actividad.id,
            },
          },
        });

        if (existente && existente.estado === "Cancelada") {
          const reactivada = await prisma.inscripcion.update({
            where: {
              participante_id_actividad_formativa_id: {
                participante_id: participante.id,
                actividad_formativa_id: actividad.id,
              },
            },
            data: { estado: "Inscrita", fecha_cancelacion: null },
          });
          if (reactivada.estado === "Inscrita") {
            return NextResponse.json(
              {
                ok: true,
                mensaje: "Tu inscripción estaba cancelada y fue reactivada",
              },
              { status: 201 }
            );
          }
        }

        return NextResponse.json(
          { error: "Ya te encuentras inscrito en esta actividad" },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Error al inscribir participante:", error);
    return NextResponse.json(
      { error: "Error al procesar la inscripción" },
      { status: 500 }
    );
  }
}