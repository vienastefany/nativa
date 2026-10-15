# Sistema de Gestión de Actividades Formativas

Aplicación para administrar organizaciones, usuarios, actividades formativas, sesiones e inscripciones públicas. Construida con Next.js 16, React 19, TypeScript, Tailwind CSS 4 y NextAuth. El backend se conecta a MySQL/MariaDB con `mysql2` y consultas SQL parametrizadas.

Toda la documentación del sistema se guarda en `D:\NATIVATEC\NATIVATEC_DOC`. Allí están `DOCUMENTACION_PROYECTO.md`, `Documentacion_Sistema_Gestion_Nativa.docx` y `ESQUEMA_BD.sql`, con arquitectura, funciones, datos, configuración y esquema SQL sin registros ni credenciales.

## Desarrollo

Requiere Node.js compatible, BD con esquema y catálogos, y variables locales `DATABASE_URL`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`.

```powershell
npm ci
npm run dev
```

Configurar `.env.local` a partir de `.env.example`. Abrir http://localhost:3000. La raíz dirige a `/login`. La BD existente se conserva; para una instalación vacía se puede importar `ESQUEMA_BD.sql` y luego inicializar roles/catálogos. No hay seed completo de estos datos.

El pool compartido está en `lib/db/index.ts`; las consultas SQL y sus tipos están en `lib/db/repository.ts` y `lib/db/types.ts`. `lib/db/registration.ts` controla la inscripción pública mediante transacción y bloqueo de cupo. Las credenciales y consultas se ejecutan exclusivamente en el servidor.

## Verificación y producción

```powershell
npx tsc --noEmit
npm run lint
npm run build
npm run test:db
npm run test:runtime
npm run start
```

## Estado

Existen módulos de organizaciones, administradores, actividades, sesiones compartibles, inscripciones, asistencia por QR, reportes PDF/Excel y dashboards. El Administrador gestiona su organización; SuperAdmin tiene alcance global. El rol Subadministrador fue retirado. Siguen pendientes el dashboard participante y la página de configuración.

`test:db` verifica operaciones SQL con rollback; `test:runtime` requiere build previo, crea registros de prueba, arranca temporalmente en el puerto 3197 y limpia registros/servidor al finalizar. Ambos necesitan la BD y catálogos configurados.

Consultar la documentación antes de desplegar: explica reconocimiento del participante durante 30 días, DNI alternativo, ventanas QR, reportes y pendientes de validación/cupos. `NEXTAUTH_URL` debe ser accesible desde los teléfonos que escanean. `scripts/migrate-admin-role.mjs` convierte cuentas del rol retirado conservando su organización; ya fue aplicado a la BD actual con autorización.
