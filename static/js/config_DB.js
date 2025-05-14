const { Pool } = require('pg');

// Configuración para conectarse a la base de datos
const pool = new Pool({
  user: 'postgres', 
  host: 'localhost',
  database: 'salud_publica',  
  password: 'postgres', 
  port: 5432,
});

module.exports = pool;
