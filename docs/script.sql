-- Database: salud_publica
-- DATOS DE INGRESO:
-- Nombre: salud_publica
-- Usuario: postgres
-- Contraseña: postgres
-- Host: localhost
-- Puerto: 5432
-- Descripción: Base de datos para gestionar servicios de salud pública y zonas de riesgo en León, Guanajuato, México.
-- Este script crea la base de datos, las tablas y los registros iniciales para el sistema de salud pública.

-- DROP DATABASE IF EXISTS salud_publica;

CREATE DATABASE salud_publica
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'es-MX'
    LC_CTYPE = 'es-MX'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

-- Crear la extensión postgis si no existe para trabajar con coordenadas
CREATE EXTENSION IF NOT EXISTS postgis;

-- Asegúrate de que PostGIS esté habilitado en la base de datos
CREATE EXTENSION IF NOT EXISTS postgis;

-- Crear la tabla servicios_salud
CREATE TABLE servicios_salud (
  id SERIAL PRIMARY KEY,
  nombre TEXT,
  tipo TEXT,  -- hospital, clínica móvil, farmacia
  capacidad INTEGER,
  horario TEXT,
  telefono TEXT,
  estado TEXT,
  ubicacion GEOMETRY(Point, 4326),  -- georreferenciado
  direccion TEXT
);

-- Crear la tabla zonas
CREATE TABLE zonas (
  id SERIAL PRIMARY KEY,
  nombre TEXT,
  tipo TEXT, -- riesgo, atención
  descripcion TEXT,
  geom GEOMETRY(Polygon, 4326)
);

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'servicios_salud';

SELECT * FROM servicios_salud;
SELECT * FROM zonas;

-- INSERTAR ZONAS DE TLAXCALA
INSERT INTO zonas (nombre, tipo, descripcion, geom)
VALUES
('Zona Riesgo A', 'riesgo', 'Alta concentración de enfermedades respiratorias', 
 ST_GeomFromText('POLYGON((-98.2380 19.3160, -98.2400 19.3170, -98.2430 19.3200, -98.2450 19.3190, -98.2380 19.3160))', 4326)),
('Zona Riesgo B', 'riesgo', 'Alta incidencia de accidentes viales en el área urbana',
 ST_GeomFromText('POLYGON((-98.2200 19.3100, -98.2220 19.3120, -98.2250 19.3140, -98.2270 19.3120, -98.2200 19.3100))', 4326)),
('Zona Riesgo C', 'riesgo', 'Áreas con bajos niveles de saneamiento básico', 
 ST_GeomFromText('POLYGON((-98.2300 19.3300, -98.2320 19.3320, -98.2350 19.3350, -98.2370 19.3330, -98.2300 19.3300))', 4326)),
('Zona Riesgo D', 'riesgo', 'Áreas vulnerables a inundaciones por lluvias fuertes',
 ST_GeomFromText('POLYGON((-98.2400 19.3400, -98.2420 19.3420, -98.2450 19.3440, -98.2470 19.3420, -98.2400 19.3400))', 4326)),
('Zona Atención A', 'atención', 'Áreas con alta densidad poblacional y servicios de salud cercanos',
 ST_GeomFromText('POLYGON((-98.2300 19.3100, -98.2320 19.3120, -98.2350 19.3100, -98.2370 19.3080, -98.2300 19.3100))', 4326)),
('Zona Atención B', 'atención', 'Áreas con alta cobertura de clínicas móviles y hospitales de campaña', 
 ST_GeomFromText('POLYGON((-98.2500 19.3200, -98.2520 19.3220, -98.2550 19.3250, -98.2570 19.3230, -98.2500 19.3200))', 4326)),
('Zona Atención C', 'atención', 'Áreas rurales con programas de vacunación y medicinas disponibles', 
 ST_GeomFromText('POLYGON((-98.2200 19.3250, -98.2230 19.3280, -98.2250 19.3300, -98.2270 19.3270, -98.2200 19.3250))', 4326)),
('Zona Riesgo E', 'riesgo', 'Áreas con alta exposición a riesgos químicos e industriales', 
 ST_GeomFromText('POLYGON((-98.2600 19.3350, -98.2620 19.3380, -98.2650 19.3400, -98.2670 19.3380, -98.2600 19.3350))', 4326)),
('Zona Riesgo F', 'riesgo', 'Áreas con alta frecuencia de sismos y movimientos telúricos', 
 ST_GeomFromText('POLYGON((-98.2700 19.3450, -98.2720 19.3470, -98.2750 19.3500, -98.2770 19.3480, -98.2700 19.3450))', 4326)),
('Zona Atención D', 'atención', 'Áreas urbanas con centros de salud y hospitales públicos y privados', 
 ST_GeomFromText('POLYGON((-98.2000 19.3000, -98.2020 19.3020, -98.2050 19.3050, -98.2070 19.3030, -98.2000 19.3000))', 4326));

-- INSERTAR REGISTROS DE SALUD EN LEÓN
INSERT INTO servicios_salud (nombre, tipo, capacidad, horario, telefono, estado, ubicacion, direccion)
VALUES
('Hospital General de León', 'hospital', 300, '24h', '477 123 4567', 'activo', ST_SetSRID(ST_Point(-101.6897, 21.1217), 4326), 'Avenida López Mateos No. 2301, León, Gto.'),
('Hospital de Especialidades', 'hospital', 150, '24h', '477 234 5678', 'activo', ST_SetSRID(ST_Point(-101.6764, 21.1205), 4326), 'Blvd. Adolfo López Mateos 301, León, Gto.'),
('Hospital General de León 2', 'hospital', 180, '24h', '477 345 6789', 'activo', ST_SetSRID(ST_Point(-101.6834, 21.1182), 4326), 'Calle Hidalgo 52, León, Gto.'),
('Hospital Comunitario de León', 'hospital', 100, '24h', '477 456 7890', 'activo', ST_SetSRID(ST_Point(-101.6778, 21.1265), 4326), 'Calle 20 de Septiembre No. 123, León, Gto.'),
('Hospital de la Mujer de León', 'hospital', 80, '24h', '477 567 8901', 'activo', ST_SetSRID(ST_Point(-101.6864, 21.1189), 4326), 'Avenida López Mateos, León, Gto.'),
('Hospital IMSS León', 'hospital', 200, '24h', '477 678 9012', 'activo', ST_SetSRID(ST_Point(-101.6887, 21.1247), 4326), 'Avenida Los Ángeles No. 500, León, Gto.'),
('Hospital León', 'hospital', 250, '24h', '477 789 0123', 'activo', ST_SetSRID(ST_Point(-101.6801, 21.1261), 4326), 'Boulevard Aeropuerto, León, Gto.'),
('Hospital del ISSSTE León', 'hospital', 120, '24h', '477 890 1234', 'activo', ST_SetSRID(ST_Point(-101.6937, 21.1222), 4326), 'Calle Juárez No. 150, León, Gto.'),
('Hospital General IMSS', 'hospital', 300, '24h', '477 901 2345', 'activo', ST_SetSRID(ST_Point(-101.6852, 21.1186), 4326), 'Avenida López Mateos, León, Gto.'),
('Hospital San Juan de Dios', 'hospital', 100, '24h', '477 910 5678', 'activo', ST_SetSRID(ST_Point(-101.6785, 21.1233), 4326), 'Calle Independencia No. 15, León, Gto.'),
('Unidad Médica Móvil León I', 'clinica movil', 30, '8h-18h', '477 234 5678', 'activo', ST_SetSRID(ST_Point(-101.6853, 21.1220), 4326), 'Calle 5 de Febrero, León, Gto.'),
('Caravana por la Salud León', 'clinica movil', 25, '8h-18h', '477 345 6789', 'activo', ST_SetSRID(ST_Point(-101.6885, 21.1245), 4326), 'Zona Centro, León, Gto.'),
('Clínica Móvil IMSS León', 'clinica movil', 35, '8h-17h', '477 456 7890', 'activo', ST_SetSRID(ST_Point(-101.6899, 21.1207), 4326), 'Avenida Los Ángeles, León, Gto.'),
('Caravana por la Salud IMSS León', 'clinica movil', 40, '9h-17h', '477 567 8901', 'activo', ST_SetSRID(ST_Point(-101.6832, 21.1183), 4326), 'Calle Hidalgo, León, Gto.'),
('Unidad Médica Móvil por la Salud', 'clinica movil', 30, '9h-18h', '477 678 9012', 'activo', ST_SetSRID(ST_Point(-101.6856, 21.1223), 4326), 'Colonia Obregón, León, Gto.'),
('Caravana Médica León', 'clinica movil', 25, '8h-16h', '477 789 0123', 'activo', ST_SetSRID(ST_Point(-101.6889, 21.1234), 4326), 'Calle 20 de Septiembre, León, Gto.'),
('Unidad Médica San Juan de Dios', 'clinica movil', 30, '8h-17h', '477 890 1234', 'activo', ST_SetSRID(ST_Point(-101.6900, 21.1250), 4326), 'Calle 5 de Mayo, León, Gto.'),
('Clínica Móvil ISSSTE León', 'clinica movil', 25, '9h-18h', '477 901 2345', 'activo', ST_SetSRID(ST_Point(-101.6795, 21.1240), 4326), 'Calle Benito Juárez, León, Gto.'),
('Caravana por la Salud IMSS 2', 'clinica movil', 30, '9h-18h', '477 910 5678', 'activo', ST_SetSRID(ST_Point(-101.6910, 21.1270), 4326), 'Calle Morelos, León, Gto.'),
('Unidad Médica Móvil IMSS', 'clinica movil', 30, '8h-17h', '477 920 6789', 'activo', ST_SetSRID(ST_Point(-101.6841, 21.1195), 4326), 'Avenida López Mateos, León, Gto.'),
('Farmacia San Juan', 'farmacia', 30, '7h-22h', '477 345 6789', 'activo', ST_SetSRID(ST_Point(-101.6882, 21.1227), 4326), 'Calle Hidalgo No. 8, León, Gto.'),
('Farmacia del Ahorro', 'farmacia', 25, '8h-21h', '477 456 7890', 'activo', ST_SetSRID(ST_Point(-101.6893, 21.1234), 4326), 'Avenida López Mateos, León, Gto.'),
('Farmacia La Loma', 'farmacia', 20, '9h-20h', '477 567 8901', 'activo', ST_SetSRID(ST_Point(-101.6904, 21.1241), 4326), 'Calle Morelos No. 10, León, Gto.'),
('Farmacia Guadalajara', 'farmacia', 35, '24h', '477 678 9012', 'activo', ST_SetSRID(ST_Point(-101.6915, 21.1250), 4326), 'Boulevard Adolfo López Mateos, León, Gto.'),
('Farmacia Similares', 'farmacia', 30, '7h-22h', '477 789 0123', 'activo', ST_SetSRID(ST_Point(-101.6934, 21.1260), 4326), 'Calle Independencia No. 22, León, Gto.'),
('Farmacia Roma', 'farmacia', 25, '8h-21h', '477 890 1234', 'activo', ST_SetSRID(ST_Point(-101.6945, 21.1270), 4326), 'Calle 20 de Septiembre, León, Gto.'),
('Farmacia San Pablo', 'farmacia', 28, '8h-23h', '477 901 2345', 'activo', ST_SetSRID(ST_Point(-101.6956, 21.1280), 4326), 'Avenida Independencia No. 18, León, Gto.'),
('Farmacia del Pueblo', 'farmacia', 20, '9h-18h', '477 912 3456', 'activo', ST_SetSRID(ST_Point(-101.6967, 21.1290), 4326), 'Calle Zaragoza No. 30, León, Gto.'),
('Farmacia Medex', 'farmacia', 18, '8h-22h', '477 923 4567', 'activo', ST_SetSRID(ST_Point(-101.6978, 21.1300), 4326), 'Calle Allende No. 50, León, Gto.'),
('Farmacia San Fernando', 'farmacia', 22, '7h-20h', '477 934 5678', 'activo', ST_SetSRID(ST_Point(-101.6989, 21.1310), 4326), 'Calle Guerrero No. 40, León, Gto.');

-- INSERTAR ZONAS EN LEON GTO
INSERT INTO zonas (nombre, tipo, descripcion, geom)
VALUES
('Zona Riesgo A', 'riesgo', 'Áreas con alta contaminación vehicular y polución atmosférica', 
 ST_GeomFromText('POLYGON((-101.6830 21.1220, -101.6860 21.1240, -101.6880 21.1250, -101.6900 21.1240, -101.6830 21.1220))', 4326)),
('Zona Riesgo B', 'riesgo', 'Zonas cercanas a la industria con exposición a contaminantes industriales', 
 ST_GeomFromText('POLYGON((-101.6780 21.1290, -101.6800 21.1310, -101.6820 21.1330, -101.6840 21.1320, -101.6780 21.1290))', 4326)),
('Zona Riesgo C', 'riesgo', 'Áreas propensas a inundaciones durante temporada de lluvias fuertes', 
 ST_GeomFromText('POLYGON((-101.6860 21.1160, -101.6880 21.1180, -101.6900 21.1200, -101.6920 21.1180, -101.6860 21.1160))', 4326)),
('Zona Riesgo D', 'riesgo', 'Áreas de alta actividad sísmica y movimientos telúricos', 
 ST_GeomFromText('POLYGON((-101.6920 21.1210, -101.6940 21.1220, -101.6970 21.1240, -101.6990 21.1230, -101.6920 21.1210))', 4326)),
('Zona Riesgo E', 'riesgo', 'Áreas de alta congestión vial con frecuentes accidentes de tránsito', 
 ST_GeomFromText('POLYGON((-101.6720 21.1150, -101.6740 21.1160, -101.6770 21.1180, -101.6790 21.1170, -101.6720 21.1150))', 4326)),
('Zona Riesgo F', 'riesgo', 'Áreas con alta concentración de residuos sólidos y problemas de saneamiento', 
 ST_GeomFromText('POLYGON((-101.6900 21.1120, -101.6920 21.1130, -101.6940 21.1150, -101.6960 21.1140, -101.6900 21.1120))', 4326)),
('Zona Riesgo G', 'riesgo', 'Áreas con problemas de inseguridad y delitos frecuentes', 
 ST_GeomFromText('POLYGON((-101.6960 21.1200, -101.6980 21.1210, -101.7010 21.1230, -101.7030 21.1220, -101.6960 21.1200))', 4326)),
('Zona Riesgo H', 'riesgo', 'Áreas afectadas por la contaminación del agua y problemas de suministro', 
 ST_GeomFromText('POLYGON((-101.7040 21.1250, -101.7060 21.1270, -101.7090 21.1280, -101.7110 21.1270, -101.7040 21.1250))', 4326)),
('Zona Riesgo I', 'riesgo', 'Zonas cercanas a minas y con exposición a materiales peligrosos', 
 ST_GeomFromText('POLYGON((-101.7150 21.1200, -101.7170 21.1210, -101.7190 21.1230, -101.7210 21.1220, -101.7150 21.1200))', 4326)),
('Zona Riesgo J', 'riesgo', 'Áreas rurales propensas a sequías y falta de acceso a agua potable', 
 ST_GeomFromText('POLYGON((-101.7400 21.1300, -101.7420 21.1310, -101.7450 21.1340, -101.7470 21.1320, -101.7400 21.1300))', 4326)),
 ('Zona Atención A', 'atención', 'Áreas con alta cobertura de hospitales públicos y privados cercanos', 
 ST_GeomFromText('POLYGON((-101.6800 21.1240, -101.6820 21.1260, -101.6850 21.1280, -101.6870 21.1270, -101.6800 21.1240))', 4326)),
('Zona Atención B', 'atención', 'Áreas rurales con acceso a clínicas móviles y programas de vacunación', 
 ST_GeomFromText('POLYGON((-101.6740 21.1300, -101.6760 21.1310, -101.6780 21.1330, -101.6800 21.1320, -101.6740 21.1300))', 4326)),
('Zona Atención C', 'atención', 'Zonas urbanas con servicios médicos completos y hospitales de especialidades', 
 ST_GeomFromText('POLYGON((-101.6830 21.1210, -101.6850 21.1230, -101.6880 21.1250, -101.6900 21.1240, -101.6830 21.1210))', 4326)),
('Zona Atención D', 'atención', 'Áreas con servicios sociales y médicos de atención a grupos vulnerables', 
 ST_GeomFromText('POLYGON((-101.6720 21.1150, -101.6740 21.1160, -101.6770 21.1180, -101.6790 21.1170, -101.6720 21.1150))', 4326)),
('Zona Atención E', 'atención', 'Áreas con presencia de centros de salud y programas preventivos', 
 ST_GeomFromText('POLYGON((-101.6920 21.1210, -101.6940 21.1220, -101.6970 21.1240, -101.6990 21.1230, -101.6920 21.1210))', 4326)),
('Zona Atención F', 'atención', 'Áreas con alta disponibilidad de clínicas de salud y centros de vacunación', 
 ST_GeomFromText('POLYGON((-101.6960 21.1200, -101.6980 21.1210, -101.7010 21.1230, -101.7030 21.1220, -101.6960 21.1200))', 4326)),
('Zona Atención G', 'atención', 'Áreas con cobertura en programas de salud pública y prevención de enfermedades', 
 ST_GeomFromText('POLYGON((-101.7040 21.1250, -101.7060 21.1270, -101.7090 21.1280, -101.7110 21.1270, -101.7040 21.1250))', 4326)),
('Zona Atención H', 'atención', 'Áreas con cobertura de salud mental y programas de atención psicológica', 
 ST_GeomFromText('POLYGON((-101.7150 21.1200, -101.7170 21.1210, -101.7190 21.1230, -101.7210 21.1220, -101.7150 21.1200))', 4326)),
('Zona Atención I', 'atención', 'Zonas urbanas con hospitales infantiles y atención pediátrica de emergencia', 
 ST_GeomFromText('POLYGON((-101.7400 21.1300, -101.7420 21.1310, -101.7450 21.1340, -101.7470 21.1320, -101.7400 21.1300))', 4326)),
('Zona Atención J', 'atención', 'Áreas con servicios de atención primaria y programas médicos gratuitos', 
 ST_GeomFromText('POLYGON((-101.7520 21.1350, -101.7540 21.1370, -101.7570 21.1380, -101.7590 21.1370, -101.7520 21.1350))', 4326));