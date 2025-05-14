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
//const markersGroup = L.layerGroup().addTo(map);
const markersClusterGroup = L.markerClusterGroup();
map.addLayer(markersClusterGroup);

// Array auxiliar para guardar { marker, props } y poder re-filtrar
const allMarkers = [];

// Capas separadas para polígonos de riesgo y atención
const riesgoLayer    = L.layerGroup().addTo(map);
const atencionLayer  = L.layerGroup().addTo(map);

// Capas separadas para marcadores de cada tipo de servicio
const hospitalLayer = L.layerGroup().addTo(map);
const farmaciaLayer = L.layerGroup().addTo(map);
const clinicaLayer = L.layerGroup().addTo(map);

// Variables globales para almacenar los puntos en zonas
let puntosGeoJSONGlobal = null;
let poligonosGeoJSONGlobal = null;

// Capa para mostrar centroides de los polígonos
const centroidesLayer = L.layerGroup();
let centroidesVisible = false;

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
  puntosGeoJSONGlobal = points;

   // Limpiar grupo y array si ya estaba cargado
  markersClusterGroup.clearLayers();
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

  // Intenta actualizar popups si polígonos ya están cargados
  if (poligonosGeoJSONGlobal) {
    actualizarPopupsConConteo();
  }
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
  
    // Guarda el GeoJSON global para usarlo en conteos
    poligonosGeoJSONGlobal = polygons;

    // Limpia las capas si ya tenían datos
    riesgoLayer.clearLayers();
    atencionLayer.clearLayers();
  
    polygons.features.forEach(feature => {
      const props    = feature.properties;
      const tipoNorm = normalizeTipo(props.tipo || "");
      
      // Inicial popup sin conteo
    const popupContent = `
      <strong>Nombre:</strong> ${props.nombre}<br>
      <strong>Tipo:</strong> ${props.tipo}<br>
      <strong>Descripción:</strong> ${props.descripcion}<br>
      <strong>Entidades dentro:</strong> Cargando...
    `;

      // Define el estilo dinámicamente por color según el tipo
      const style = {
        color: "#000",
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
          lyr.bindPopup(popupContent);
        }
      });
  
      // Agrega al grupo correspondiente
      if (tipoNorm.includes("riesgo"))    riesgoLayer.addLayer(layer);
      if (tipoNorm.includes("atencion"))  atencionLayer.addLayer(layer);
    
      // Intenta actualizar popups si puntos ya están cargados
      if (puntosGeoJSONGlobal) {
        actualizarPopupsConConteo();
      }
    });
  }

// ==========================================================================================================================================================
// CARGA Y CONTAR
// Función para contar puntos dentro de cada polígono y actualizar los popups
function actualizarPopupsConConteo() {
  const conteos = contarEntidadesDentroDeZonas(puntosGeoJSONGlobal, poligonosGeoJSONGlobal);

  riesgoLayer.eachLayer((layer) => {
    if (layer.feature) {
      actualizarPopupDeLayer(layer, conteos);
    } else if (layer.getLayers) {
      // Es un grupo, recorremos hijos
      layer.getLayers().forEach((subLayer) => {
        if (subLayer.feature) actualizarPopupDeLayer(subLayer, conteos);
      });
    }
  });

  atencionLayer.eachLayer((layer) => {
    if (layer.feature) {
      actualizarPopupDeLayer(layer, conteos);
    } else if (layer.getLayers) {
      layer.getLayers().forEach((subLayer) => {
        if (subLayer.feature) actualizarPopupDeLayer(subLayer, conteos);
      });
    }
  });
}

function actualizarPopupDeLayer(layer, conteos) {
  const nombre = layer.feature.properties.nombre;
  const conteoObj = conteos.find(c => c.nombre === nombre);
  if (!conteoObj) return;

  const props = layer.feature.properties;
  const nuevoPopup = `
    <strong>Nombre:</strong> ${props.nombre}<br>
    <strong>Tipo:</strong> ${props.tipo}<br>
    <strong>Descripción:</strong> ${props.descripcion}<br>
    <strong>Entidades dentro:</strong> ${conteoObj.conteo}
  `;
  layer.setPopupContent(nuevoPopup);

}

function contarEntidadesDentroDeZonas(pointsGeoJSON, polygonsGeoJSON) {
  const conteos = polygonsGeoJSON.features.map((polygon) => {
    const puntosDentro = turf.pointsWithinPolygon(pointsGeoJSON, polygon);
    console.log(`Polígono: ${polygon.properties.nombre}, puntos dentro: ${puntosDentro.features.length}`);
    return {
      nombre: polygon.properties.nombre,
      tipo: polygon.properties.tipo,
      conteo: puntosDentro.features.length,
    };
  });

  return conteos;
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
  markersClusterGroup.clearLayers(); 

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
    markersClusterGroup.addLayer(marker);
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


  // ==========================================================================================================================================================
  // ANALISI DE TURF
  // Variable para controlar estado de buffer activo
let bufferActivo = false;
let bufferLayer = null; 

const btnCrearBuffer = document.getElementById("btnCrearBuffer");
const inputBufferRadio = document.getElementById("inputBufferRadio");

// Función para activar/desactivar modo buffer
btnCrearBuffer.addEventListener("click", () => {
  bufferActivo = !bufferActivo;
  if (bufferActivo) {
    btnCrearBuffer.textContent = "X";
    map.getContainer().style.cursor = "crosshair";
    alert("Haz clic en el mapa para seleccionar un punto y crear un buffer.");
  } else {
    btnCrearBuffer.textContent = "✔";
    map.getContainer().style.cursor = "";
  }
});

// Evento clic en mapa para crear buffer si está activo
map.on("click", (e) => {
  if (!bufferActivo) return; 

  // Obtener radio del input, limitar máximo a 5 km
  let radioKm = parseFloat(inputBufferRadio.value);
  if (isNaN(radioKm) || radioKm <= 0) {
    alert("Por favor ingresa un radio válido mayor a 0.");
    return;
  }
  if (radioKm > 5) {
    alert("El radio máximo permitido es 5 km.");
    radioKm = 5;
    inputBufferRadio.value = 5;
  }

  // Crear punto Turf con coordenadas [lng, lat]
  const punto = turf.point([e.latlng.lng, e.latlng.lat]);

  // Crear buffer con Turf (radio en km)
  const buffer = turf.buffer(punto, radioKm, { units: "kilometers" });

  // Remover buffer anterior si existe
  if (bufferLayer) {
    map.removeLayer(bufferLayer);
  }

  // Agregar buffer al mapa como GeoJSON con estilo
  bufferLayer = L.geoJSON(buffer, {
    style: {
      color: "black",
      fillColor: "yellow",
      fillOpacity: 0.3,
      weight: 2,
    },
  }).addTo(map);

  // Centrar mapa en buffer
  map.fitBounds(bufferLayer.getBounds());

  // Crear un FeatureCollection Turf de los puntos de todos los marcadores visibles
  const puntosMarcadores = {
    type: "FeatureCollection",
    features: allMarkers
      .filter(({ marker }) => map.hasLayer(marker)) // Solo los visibles en mapa
      .map(({ marker }) => {
        const latlng = marker.getLatLng();
        return turf.point([latlng.lng, latlng.lat]);
      }),
  };

  // Obtener los puntos dentro del buffer
  const puntosDentroBuffer = turf.pointsWithinPolygon(puntosMarcadores, buffer);
  alert(`Hay ${puntosDentroBuffer.features.length} vecinos dentro del radio de ${radioKm} km.`);

  // Resaltar los marcadores dentro del buffer (cambiar icono)
  allMarkers.forEach(({ marker }) => {
    const latlng = marker.getLatLng();
    const puntoMarcador = turf.point([latlng.lng, latlng.lat]);
    if (turf.booleanPointInPolygon(puntoMarcador, buffer)) {

      // Cambiar icono 
      marker.setIcon(L.icon({
        iconUrl: "static/img/icono-resaltado.png",
        iconSize: [80, 80],
      }));

      // Añadir marcadores al mapa para mostrar los resaltados
      if (!map.hasLayer(marker)) {
        markersClusterGroup.addLayer(marker);
      }
    } else {

      // Fuera del buffer: regresar icono normal según tipo
      const tipoNorm = normalizeTipo(marker.options.title || "");
      let iconUrl = "";

      // Guarda tipo en props o en marker.options para evitar duplicar código
      if (marker.options.icon.options.iconUrl) {

        // Usa iconUrl actual si no lo encuentra, sino reestablece a original
        iconUrl = marker.options.icon.options.iconUrl;
      }
      // Función para obtener icono normal
      allMarkers.forEach(({ marker, props }) => {
  const latlng = marker.getLatLng();
  const puntoMarcador = turf.point([latlng.lng, latlng.lat]);
  if (turf.booleanPointInPolygon(puntoMarcador, buffer)) {

    // Dentro del buffer: cambia icono resaltado
    marker.setIcon(L.icon({
      iconUrl: "static/img/marcar.png", // icono resaltado
      iconSize: [80, 80],
    }));
  } else {

    // Fuera del buffer: icono normal según tipo
    let iconUrl = "";
    const tipo = normalizeTipo(props.tipo || "");
    if (tipo.includes("hospital")) iconUrl = "static/img/hospital.png";
    else if (tipo.includes("clinica movil")) iconUrl = "static/img/clinica-movil.png";
    else if (tipo.includes("farmacia")) iconUrl = "static/img/farmacia.png";

    marker.setIcon(L.icon({ iconUrl, iconSize: [80, 80] }));
  }
});
    }
  });

  // Desactivar modo buffer
  bufferActivo = false;
  btnCrearBuffer.textContent = " ✔";
  map.getContainer().style.cursor = "";
});


// ==========================================================================================================================================================
// Medición de dos puntos
let punto1 = null;
let punto2 = null;
let markerP1 = null;
let markerP2 = null;

let modoSeleccion = null; // "p1", "p2", o null

const btnP1 = document.getElementById("btnP1");
const btnP2 = document.getElementById("btnP2");
const btnMedir = document.getElementById("btnMedir");
const distanciaTexto = document.getElementById("distanciaTexto");

// Al hacer clic en P1 o P2, activamos modo de selección
btnP1.addEventListener("click", () => {
  modoSeleccion = "p1";
  map.getContainer().style.cursor = "crosshair";
  alert("Haz clic en el mapa para seleccionar el Punto 1");
});

btnP2.addEventListener("click", () => {
  modoSeleccion = "p2";
  map.getContainer().style.cursor = "crosshair";
  alert("Haz clic en el mapa para seleccionar el Punto 2");
});

// Cuando se da click en el mapa y modoSeleccion está activo, guardamos el punto
map.on("click", (e) => {
  if (!modoSeleccion) return;

  const latlng = e.latlng;

  if (modoSeleccion === "p1") {
    punto1 = latlng;

    // Si ya había marcador, eliminarlo
    if (markerP1) map.removeLayer(markerP1);

    markerP1 = L.marker(latlng, {
      icon: L.divIcon({
        className: "marker-punto1",
        html: "<b>P1</b>",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(map);

  } else if (modoSeleccion === "p2") {
    punto2 = latlng;

    if (markerP2) map.removeLayer(markerP2);

    markerP2 = L.marker(latlng, {
      icon: L.divIcon({
        className: "marker-punto2",
        html: "<b>P2</b>",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(map);
  }

  modoSeleccion = null;
  map.getContainer().style.cursor = "";
});

// Al hacer click en Medir, calculamos la distancia geodésica en km entre puntos
btnMedir.addEventListener("click", () => {
  if (!punto1 || !punto2) {
    alert("Selecciona ambos puntos (P1 y P2) primero.");
    return;
  }

  // Método distance para metros
  const distanciaM = map.distance(punto1, punto2);
  const distanciaKm = (distanciaM / 1000).toFixed(2);

  distanciaTexto.textContent = `${distanciaKm} km`;
});

// ==========================================================================================================================================================
// CONTEO DE ENTIDADES
function contarEntidadesDentroDeZonas(pointsGeoJSON, polygonsGeoJSON) {
  // Retorna un arreglo con { polygonId, nombre, conteo }
  const conteos = polygonsGeoJSON.features.map((polygon) => {
    // Obtener puntos dentro del polígono
    const puntosDentro = turf.pointsWithinPolygon(pointsGeoJSON, polygon);

    return {
      nombre: polygon.properties.nombre,
      tipo: polygon.properties.tipo,
      conteo: puntosDentro.features.length,
      // Opcional: polygonId o cualquier otro dato que tengas
    };
  });

  return conteos;
}

// ==========================================================================================================================================================
// CENTROIDES
function mostrarCentroides() {
  centroidesLayer.clearLayers();

  if (!poligonosGeoJSONGlobal) {
    alert("Los polígonos no están cargados todavía.");
    return;
  }

  poligonosGeoJSONGlobal.features.forEach((feature) => {
    const centroid = turf.centroid(feature);
    const [lng, lat] = centroid.geometry.coordinates;

    // Crear marcador para el centroide con un icono o estilo especial
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "yellow",
      fillColor: "orange",
      fillOpacity: 0.9,
      weight: 2,
    }).bindPopup(`
      <strong>Centroide de:</strong> ${feature.properties.nombre}<br>
      <strong>Tipo:</strong> ${feature.properties.tipo}
    `);

    centroidesLayer.addLayer(marker);
  });
}

function toggleCentroides() {
  if (centroidesVisible) {
    map.removeLayer(centroidesLayer);
    centroidesVisible = false;
    btnCentroides.textContent = "Mostrar centroides";
  } else {
    mostrarCentroides();
    map.addLayer(centroidesLayer);
    centroidesVisible = true;
    btnCentroides.textContent = "Ocultar centroides";
  }
}

const btnCentroides = document.getElementById("btnCentroides");
btnCentroides.addEventListener("click", toggleCentroides);
