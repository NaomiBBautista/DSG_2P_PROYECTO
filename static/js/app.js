// =========================================================================================================================================================
// CÓDIGO MAPA
// Inicializar mapa en zona de león a nivel 16 (calle)
const map = L.map("map").setView([21.1234, -101.6893], 16);

// Añadir la capa base de Mapbox (satélite + calles)
L.tileLayer(
  "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
  {
    id: "mapbox/satellite-streets-v12",
    tileSize: 512,
    zoomOffset: -1,
    accessToken:
      "pk.eyJ1IjoibmFvbWliYmF1dGlzdGEiLCJhIjoiY204NHl2ZXI2MjhtZDJqcThuczg0bG1jeSJ9.FPkSsdtieplL-9yxl9Uf5g",
  }
).addTo(map);


// =========================================================================================================================================================
// CAPAS DE PUNTO Y POLIGONO
// normalizeTipo: estandariza un texto eliminando tildes y pasando a minúsculas
function normalizeTipo(str) {
    return str
      .toLowerCase()                             // pasa a minúsculas
      .normalize("NFD")                          // descompone caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "");          // elimina marcas de acento
  }

// Grupo donde pondremos TODOS los marcadores para filtrado único
const markersGroup = L.layerGroup().addTo(map);

// Array auxiliar para guardar { marker, props } y poder re-filtrar
const allMarkers = [];

// Capas separadas para polígonos de riesgo y atención
const riesgoLayer    = L.layerGroup().addTo(map);
const atencionLayer  = L.layerGroup().addTo(map);

// Capas separadas para marcadores de cada tipo de servicio
const hospitalLayer = L.layerGroup().addTo(map);
const farmaciaLayer = L.layerGroup().addTo(map);
const clinicaLayer = L.layerGroup().addTo(map);


// ==========================================================================================================================================================
// PUNTOS 
/**
 * loadPoints:  
 *  - Hace fetch a /puntos  
 *  - Crea un L.marker por cada feature  
 *  - Asigna un icono según props.tipo  
 *  - Guarda {marker,props} en allMarkers  
 *  - Llama a applyFilters() para mostrarlos filtrados
 */
async function loadPoints() {
  const resp = await fetch("http://localhost:3000/puntos");
  const points = await resp.json();

   // Limpiar grupo y array si ya estaba cargado
  markersGroup.clearLayers();
  allMarkers.length = 0;

  points.features.forEach((feat) => {
    const props = feat.properties;
    const [lng, lat] = feat.geometry.coordinates;
    const tipoNorm = normalizeTipo(props.tipo || "");

    // Escoge el icono según el tipo normalizado
    let iconUrl = "";
    if (tipoNorm.includes("hospital")) iconUrl = "static/img/hospital.png";
    else if (tipoNorm.includes("clinica movil"))
      iconUrl = "static/img/clinica-movil.png";
    else if (tipoNorm.includes("farmacia")) iconUrl = "static/img/farmacia.png";

    // Crear el marcador con popup de información
    const marker = L.marker([lat, lng], {
      icon: L.icon({ iconUrl, iconSize: [80, 80] }),
    }).bindPopup(`
        <strong>Nombre:</strong> ${props.nombre}<br>
        <strong>Tipo:</strong> ${props.tipo}<br>
        <strong>Capacidad:</strong> ${props.capacidad}<br>
        <strong>Horario:</strong> ${props.horario}<br>
        <strong>Estado:</strong> ${props.estado}<br>
        <strong>Dirección:</strong> ${props.direccion}
      `);

    // Añade al array para futuros filtrados
    allMarkers.push({ marker, props });
  });

  // Muestra los marcadores según los filtros iniciales
  applyFilters();
}

// ==========================================================================================================================================================
// POLÍGONOS
/**
 * loadPolygons:  
 *  - Hace fetch a /poligonos  
 *  - Para cada feature crea un L.geoJSON con estilo rojo/azul  
 *  - Lo añade o a riesgoLayer o a atencionLayer según props.tipo  
 */
async function loadPolygons() {
    const resp     = await fetch("http://localhost:3000/poligonos");
    const polygons = await resp.json();
  
    // Limpia las capas si ya tenían datos
    riesgoLayer.clearLayers();
    atencionLayer.clearLayers();
  
    polygons.features.forEach(feature => {
      const props    = feature.properties;
      const tipoNorm = normalizeTipo(props.tipo || "");
      
      // Define el estilo dinámicamente por color según el tipo
      const style = {
        color: "#000",          // contorno
        weight: 2,
        fillOpacity: 0.4,
        fillColor: tipoNorm.includes("riesgo")
          ? "red"
          : tipoNorm.includes("atencion")
            ? "blue"
            : "#888"
      };
  
      // Crea la capa para este feature
      const layer = L.geoJSON(feature, {
        style,
        onEachFeature: (f, lyr) => {
          lyr.bindPopup(`
            <strong>Nombre:</strong> ${props.nombre}<br>
            <strong>Tipo:</strong> ${props.tipo}<br>
            <strong>Descripción:</strong> ${props.descripcion}
          `);
        }
      });
  
      // Agrega al grupo correspondiente
      if (tipoNorm.includes("riesgo"))    riesgoLayer.addLayer(layer);
      if (tipoNorm.includes("atencion"))  atencionLayer.addLayer(layer);
    });
  }
  

// ==========================================================================================================================================================
// FILTROS
/**
 * applyFilters:  
 *  - Lee el estado de todos los checkboxes  
 *  - Recorre allMarkers y evalúa cada condición:
 *      • Tipo de servicio  
 *      • Capacidad <100 / >100  
 *      • Horario 24h / distinto  
 *      • Estado activo/operativo  
 *  - Añade a markersGroup sólo los que pasen todos los filtros
 */
function applyFilters() {
  // Lee estados y si hay alguno activo por grupo
  const tipoH = document.getElementById("hospital").checked;
  const tipoF = document.getElementById("farmacia").checked;
  const tipoC = document.getElementById("clinica").checked;
  const tipoAny = tipoH || tipoF || tipoC;

  // Capacidad
  const capL100 = document.getElementById("menos100").checked;
  const capG100 = document.getElementById("mas100").checked;
  const capAny = capL100 || capG100;

   // Horario
  const hor24 = document.getElementById("24hrs").checked;
  const horNo24 = document.getElementById("no24hrs").checked;
  const horAny = hor24 || horNo24;

   // Estado
  const estAct = document.getElementById("activo").checked;
  const estOpe = document.getElementById("operativo").checked;
  const estAny = estAct || estOpe;

  // Limpia marcadores previos
  markersGroup.clearLayers();

  // Recorre cada marcador y sus propiedades
  allMarkers.forEach(({ marker, props }) => {
    const tipo = normalizeTipo(props.tipo || "");
    const cap = Number(props.capacidad);
    const hor = (props.horario || "").toLowerCase();
    const est = normalizeTipo(props.estado || "");

    // FILTRO DE TIPO DE SERVICIO
    if (!tipoAny) {
      // Si no hay ningún tipo marcado, bloquea TODO
      return;
    }
    if (
      !(
        (tipoH && tipo.includes("hospital")) ||
        (tipoF && tipo.includes("farmacia")) ||
        (tipoC && tipo.includes("clinica movil"))
      )
    ) {
      return;
    }

    // FILTRO DE CAPACIDAD
    if (capAny) {
      if (!((capL100 && cap < 100) || (capG100 && cap > 100))) {
        return;
      }
    }

    // FILTRO DE HORARIO
    if (horAny) {
      if (
        !((hor24 && hor.includes("24")) || (horNo24 && !hor.includes("24")))
      ) {
        return;
      }
    }

    // FILTRO DE ESTADO
    if (estAny) {
      if (!((estAct && est === "activo") || (estOpe && est === "operativo"))) {
        return;
      }
    }

    // Si pasa **todos** los filtros, lo añade
    markersGroup.addLayer(marker);
  });
}


// ==========================================================================================================================================================
// CONTROL DE CAPAS (Mostrar/Ocultar layers según checkboxes)

/**
 * toggleLayer:  
 *  - Sincroniza un layerGroup con un checkbox  
 *  - Lo arranca marcado (cb.checked = true)  
 *  - Añade/quita la capa al mapa en cada cambio
 */
function toggleLayer(checkboxId, layerGroup) {
  const cb = document.getElementById(checkboxId);

  // Forzar que arranque marcado
  cb.checked = true;

  // Función que añade o quita la visibilidad del layer
  function update() {
    if (cb.checked) map.addLayer(layerGroup);
    else map.removeLayer(layerGroup);
  }

  // Ejecución al iniciar la app
  update();

  // Verifica cada vez que cambie el checkbox
  cb.addEventListener("change", update);
}

// IDs de todos tus checkboxes:
const allChecks = [
  "hospital",
  "farmacia",
  "clinica",
  "menos100",
  "mas100",
  "24hrs",
  "no24hrs",
  "activo",
  "operativo",
];

allChecks.forEach((id) => {
  document.getElementById(id).addEventListener("change", applyFilters);
});

// ==========================================================================================================================================================
// INICIALIZACIÓN FINAL
// Carga y filtra los puntos
loadPoints();
toggleLayer("hospital", hospitalLayer);
toggleLayer("farmacia", farmaciaLayer);
toggleLayer("clinica", clinicaLayer);

// Carga los polígonos y los separa en capas
loadPolygons();
toggleLayer("riesgo",   riesgoLayer);
toggleLayer("atencion", atencionLayer);

/// ==========================================================================================================================================================
/// CONEXIÓN A HTML
// Cambiar entre secciones html
function showSection(sectionId) {
    // Desactivar todas las secciones
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(sectionId).classList.add("active");
  
    // Desactivar botones
    document.querySelectorAll(".nav-buttons button").forEach((button) => {
      button.classList.remove("active");
    });
    document
      .getElementById(
        `btn${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`
      )
      .classList.add("active");
  }