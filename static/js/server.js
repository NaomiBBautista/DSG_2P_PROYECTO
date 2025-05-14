const express = require("express");
const cors = require("cors");
const pool = require("./config_DB");
const app = express();

// Habilitar CORS
app.use(cors());

// Servir archivos estáticos desde la carpeta 'static'
app.use(express.static("static"));

// Ruta para obtener los puntos de la tabla
app.get("/puntos", async (req, res) => {
  const result = await pool.query(`
    SELECT id, nombre, tipo, capacidad, horario, telefono, estado, direccion,
    ST_AsGeoJSON(ubicacion) AS ubicacion
    FROM servicios_salud;
  `);

  const geojson = {
    type: "FeatureCollection",
    features: result.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.ubicacion),
      properties: {
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        capacidad: row.capacidad,
        horario: row.horario,
        telefono: row.telefono,
        estado: row.estado,
        direccion: row.direccion,
      },
    })),
  };

  res.json(geojson);
});

// Ruta para obtener los polígonos
app.get("/poligonos", async (req, res) => {
  const result = await pool.query(`
      SELECT id, nombre, tipo, descripcion, ST_AsGeoJSON(geom) AS geom
      FROM zonas;
    `);

  const geojson = {
    type: "FeatureCollection",
    features: result.rows.map((row) => ({
      type: "Feature",
      geometry: JSON.parse(row.geom),
      properties: {
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        descripcion: row.descripcion,
      },
    })),
  };

  res.json(geojson);
});

// Iniciar el servidor
app.listen(3000, () => console.log("Servidor en http://localhost:3000"));
