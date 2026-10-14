const express = require("express");
const mysql = require("mysql2/promise");
const path = require("node:path");

const app = express();
const port = Number(process.env.PORT || 3000);

const database = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "producto_user",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "examen",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/productos", async (_request, response) => {
  const [productos] = await database.query(
    "SELECT id, nombre, categoria, precio FROM productos ORDER BY id DESC",
  );
  response.json(productos);
});

app.post("/api/productos", async (request, response) => {
  const { nombre, categoria, precio } = request.body || {};

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    nombre.trim().length > 120 ||
    typeof categoria !== "string" ||
    !categoria.trim() ||
    categoria.trim().length > 80 ||
    typeof precio !== "number" ||
    !Number.isFinite(precio) ||
    precio < 0.01 ||
    precio > 99999999.99
  ) {
    return response.status(400).json({
      error: "Ingresa nombre, categoría y un precio válido mayor que cero.",
    });
  }

  const [result] = await database.execute(
    "INSERT INTO productos (nombre, categoria, precio) VALUES (?, ?, ?)",
    [nombre.trim(), categoria.trim(), precio],
  );

  response.status(201).json({
    id: result.insertId,
    nombre: nombre.trim(),
    categoria: categoria.trim(),
    precio: precio.toFixed(2),
  });
});

app.use((error, _request, response, _next) => {
  console.error("Error al atender la solicitud:", error);
  response.status(500).json({ error: "Ocurrió un error en el servidor." });
});

async function start() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      categoria VARCHAR(80) NOT NULL,
      precio DECIMAL(10, 2) NOT NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  app.listen(port, "0.0.0.0", () => {
    console.log(`Aplicación disponible en http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar la aplicación o conectar con MySQL:", error);
  process.exitCode = 1;
});
