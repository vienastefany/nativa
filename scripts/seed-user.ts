import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function seedUser() {
  try {
    console.log("Creando usuario de prueba...");

    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("Falta DATABASE_URL en .env.local");
      process.exit(1);
    }

    const connection = await mysql.createConnection(url);

    // Verificar si el usuario ya existe
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM usuarios WHERE correo = ?",
      ["admin@ejemplo.com"]
    );

    if (rows.length > 0) {
      console.log("El usuario admin@ejemplo.com ya existe.");
      console.log("Correo: admin@ejemplo.com");
      console.log("Contrasena: admin123");
      await connection.end();
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    await connection.query(
      `INSERT INTO usuarios 
       (correo, password, rol_id, organizacion_id, activo) 
       VALUES (?, ?, ?, ?, ?)`,
      ["admin@ejemplo.com", hashedPassword, 2, 1, 1]
    );

    console.log("Usuario creado exitosamente!");
    console.log("Correo: admin@ejemplo.com");
    console.log("Contrasena: admin123");

    await connection.end();
  } catch (error) {
    console.error("Error al crear usuario:");
    console.error(error);
  }
}

seedUser();