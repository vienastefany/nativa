import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testMySQL() {
  try {
    console.log("Probando conexion a MySQL...");

    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("Falta DATABASE_URL en .env.local");
      process.exit(1);
    }

    const connection = await mysql.createConnection(url);

    await connection.connect();
    console.log("Conexion exitosa a MySQL!");

    const [rows] = await connection.query<mysql.RowDataPacket[]>("SELECT * FROM roles");
    console.log("Roles encontrados: " + rows.length);
    console.log(rows);

    await connection.end();
    console.log("Conexion cerrada.");
  } catch (error) {
    console.error("Error de conexion:");
    console.error(error);
  }
}

testMySQL();