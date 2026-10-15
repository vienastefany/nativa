import dotenv from "dotenv";
import { load } from "./load-typescript.mjs";
dotenv.config({ path: ".env.local", quiet: true });
const db = load("../lib/db/index.ts");
try {
  const count = await db.withTransaction(async connection => {
    const [admin] = await db.queryRows("SELECT id FROM roles WHERE nombre = 'Administrador' AND activo = 1", [], connection);
    if (!admin) throw new Error("Falta el rol Administrador activo");
    const result = await db.executeSql(`UPDATE usuarios u JOIN roles r ON r.id = u.rol_id
      SET u.rol_id = ?, u.updated_at = CURRENT_TIMESTAMP
      WHERE r.nombre = 'Subadministrador'`, [admin.id], connection);
    await db.executeSql("UPDATE roles SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE nombre = 'Subadministrador'", [], connection);
    return result.affectedRows;
  });
  console.log(`Cuentas convertidas a Administrador: ${count}. Organización, contraseña, estado e historial conservados.`);
} finally { await db.closePool(); }
