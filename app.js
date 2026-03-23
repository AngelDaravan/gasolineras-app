let resultadosActuales = [];
let estacionesCache = null;
let cargando = false;
let ultimaBusqueda = null;

const boton = document.getElementById("buscar");
const inputCP = document.getElementById("cp");
const sliderDistancia = document.getElementById("distanciaMax");
const valorDistancia = document.getElementById("valorDistancia");
const controles = document.getElementById("controlesOrden");
const sliderPrioridad = document.getElementById("prioridadScore");
const textoPrioridad = document.getElementById("textoPrioridad");
const contenedorCombustible = document.querySelector(".botones-combustible");
const botonPruebaJson = document.getElementById("prueba-json");
const tiposCombustible = {
  diesel: "gasoleoA",
  "95": "gasolina95E5",
  "98": "gasolina98E5"
};

console.log(sliderDistancia);
console.log(valorDistancia);

//botones ordenar
document.getElementById("orden-asc").addEventListener("click", () => {
  ordenarResultados("asc");
});

document.getElementById("orden-desc").addEventListener("click", () => {
  ordenarResultados("desc");
});

document.getElementById("orden-distancia").addEventListener("click", () => {
  ordenarResultados("distancia");
});

//mostar el valor del slider para distancia
sliderDistancia.addEventListener("input", () => {
  valorDistancia.textContent = sliderDistancia.value;
  actualizarBusqueda();
});

boton.addEventListener("click", async () => {
  if (cargando) return; // 🚫 bloquea spam

  cargando = true;
  boton.disabled = true;
  boton.textContent = "⏳ Buscando...";
  
  const cp = inputCP.value.trim();

  //comprobar formato cp
  if (cp.length !== 5) {
    // alert = pop up. Creamos funcion, menos invasivo
    mostrarError("Introduce un código postal válido (5 cifras)");
    return;
  }

  // try - catch
  try {
    mostrarSkeletonResultados();

    const codigoPostalUsuario = await getCP(cp);

    if (!codigoPostalUsuario) {
      mostrarError("No se encontraron coordenadas para ese código postal");
      return;
    }

    ultimaBusqueda = { cp, codigoPostalUsuario };
    await actualizarBusqueda(true);
  } catch (error) {
    mostrarError("Ha ocurrido un error al cargar los datos");
    console.error(error);
  } finally {
    // 🔓 siempre se ejecuta
    cargando = false;
    boton.disabled = false;
    boton.textContent = "🔎 Buscar";
  }
});

//Solo permitir números en el código postal
inputCP.addEventListener("input", () => {
  inputCP.value = inputCP.value.replace(/\D/g, "");
});
//pulsa Enter
inputCP.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    boton.click();
  }
});

sliderPrioridad.addEventListener("input", () => {
  const valor = Number(sliderPrioridad.value);

  if (valor < 35) {
    textoPrioridad.textContent = "Priorizar cercanía";
  } else if (valor > 65) {
    textoPrioridad.textContent = "Priorizar precio";
  } else {
    textoPrioridad.textContent = "Equilibrado";
  }

  actualizarBusqueda();
});

if (contenedorCombustible) {
  contenedorCombustible.addEventListener("click", (event) => {
    const botonSeleccionado = event.target.closest(".combustible-btn");

    if (!botonSeleccionado || !contenedorCombustible.contains(botonSeleccionado)) {
      return;
    }

    contenedorCombustible.querySelectorAll(".combustible-btn").forEach((boton) => {
      const estaActivo = boton === botonSeleccionado;
      boton.classList.toggle("active", estaActivo);
      boton.setAttribute("aria-pressed", String(estaActivo));
    });

    actualizarBusqueda();
  });
}

async function actualizarBusqueda(forzar = false) {
  if (!forzar && (!ultimaBusqueda || resultadosActuales.length === 0)) {
    return;
  }

  mostrarFavoritasInicio();

  if ((cargando && !forzar) || !ultimaBusqueda) {
    return;
  }

  const stations = await cargarEstaciones();
  const combustibleSeleccionado = getCombustibleSeleccionado();
  const distanciaMaxima = Number(sliderDistancia.value);

  const estacionesFiltradas = stations
    .map((st) => {
      const precioCombustible = obtenerPrecioCombustible(st, combustibleSeleccionado);

      if (!precioCombustible) {
        return null;
      }

      return {
        ...st,
        precio: precioCombustible.valor,
        tipoCombustible: precioCombustible.tipo,
        nombreCombustible: precioCombustible.nombre
      };
    })
    .filter(Boolean);

  const listaConDistancias = estacionesFiltradas
    .map(st => {
      const distancia = calcularDistancia(
        ultimaBusqueda.codigoPostalUsuario.lat,
        ultimaBusqueda.codigoPostalUsuario.lng,
        st.lat,
        st.lng
      );

      return {
        ...st,
        distancia: distancia
      };
    })
    .filter(st => st.distancia <= distanciaMaxima);

  resultadosActuales = calcularScore(listaConDistancias)
    .sort((a, b) => a.distancia - b.distancia);

  mostrarResultados(resultadosActuales);
}

function getCombustibleSeleccionado() {
  const botonActivo = contenedorCombustible?.querySelector(".combustible-btn.active");
  return botonActivo?.dataset.combustible ?? "diesel";
}

function obtenerPrecioCombustible(estacion, combustibleSeleccionado = getCombustibleSeleccionado()) {
  const tipoBuscado = tiposCombustible[combustibleSeleccionado];

  if (!tipoBuscado || !Array.isArray(estacion.precios)) {
    return null;
  }

  return estacion.precios.find((precio) => precio.tipo === tipoBuscado) ?? null;
}

//slider que calcula la puntuacion
function calcularScore(lista) {
  const prioridad = Number(sliderPrioridad.value);

  const pesoPrecio = prioridad / 100;
  const pesoDistancia = 1 - pesoPrecio;

  const minPrecio = Math.min(...lista.map(st => st.precio));
  const maxPrecio = Math.max(...lista.map(st => st.precio));
  const minDistancia = Math.min(...lista.map(st => st.distancia));
  const maxDistancia = Math.max(...lista.map(st => st.distancia));

  return lista.map(st => {
    const precioNormalizado =
      maxPrecio === minPrecio ? 0 : (st.precio - minPrecio) / (maxPrecio - minPrecio);

    const distanciaNormalizada =
      maxDistancia === minDistancia ? 0 : (st.distancia - minDistancia) / (maxDistancia - minDistancia);

    const score =
      (precioNormalizado * pesoPrecio) +
      (distanciaNormalizada * pesoDistancia);

    return {
      ...st,
      score: score
    };
  });
}

function mostrarResultados(lista) {
  const contenedor = document.getElementById("resultados");

  contenedor.innerHTML = "";

  if (lista.length === 0) {
    mostrarControles(false);
    contenedor.innerHTML = "<p class='mensaje'>No se han encontrado gasolineras en tu localidad</p>";
    return;
  }

  mostrarControles(lista.length > 1);

  const mensajeResultados = document.createElement("p");
  mensajeResultados.textContent =
    lista.length === 1
      ? "Se ha encontrado 1 gasolinera"
      : `Se han encontrado ${lista.length} gasolineras`;

  contenedor.appendChild(mensajeResultados);

  const estacionMasCercana = lista.reduce((min, st) =>
    st.distancia < min.distancia ? st : min
  );

  const estacionMasBarata = lista.reduce((min, st) =>
    st.precio < min.precio ? st : min
  );

  const estacionMejorOpcion = lista.reduce((min, st) =>
    st.score < min.score ? st : min
  );

  const destacadas = [];

  [estacionMasCercana, estacionMasBarata, estacionMejorOpcion].forEach(st => {
    const yaIncluida = destacadas.some(item => item.nombre === st.nombre);

    if (!yaIncluida) {
      destacadas.push(st);
    }
  });

  const resto = lista.filter(st => !destacadas.includes(st));

  // ===== TÍTULO BLOQUE DESTACADAS =====
  const tituloDestacadas = document.createElement("h2");
  tituloDestacadas.textContent = "Destacadas";
  tituloDestacadas.classList.add("titulo-bloque");
  contenedor.appendChild(tituloDestacadas);

  // ===== PINTAR DESTACADAS =====
  destacadas.forEach(st => {
    const div = document.createElement("div");
    div.classList.add("resultado", "resultado-destacado");

    const esMasBarata = st.nombre === estacionMasBarata.nombre;
    const esMasCercana = st.nombre === estacionMasCercana.nombre;
    const esMejorOpcion = st.nombre === estacionMejorOpcion.nombre;

    const favoritos = obtenerFavoritos();
    const esFavorita = favoritos.includes(st.nombre);
    const etiquetaFavorita = esFavorita
      ? `<span class="tag tag-favorita">❤️ Favorita</span>`
      : "";

    let etiquetas = [];
    let descripcion = "";

    if (esMejorOpcion) {
      etiquetas.push(`<span class="tag tag-mejor">⭐ Mejor opción</span>`);
      descripcion = "La mejor combinación entre cercanía y precio";
    }

    if (esMasCercana) {
      etiquetas.push(`<span class="tag tag-cercana">📍 Más cercana</span>`);
      if (!descripcion) {
        descripcion = "La opción más cercana para repostar rápido";
      }
    }

    if (esMasBarata) {
      etiquetas.push(`<span class="tag tag-barata">💸 Más barata</span>`);
      if (!descripcion) {
        descripcion = "La opción más económica aunque esté más lejos";
      }
    }

    div.innerHTML = `
      ${etiquetas.join(" ")}
      <p class="descripcion">${descripcion}</p>
      <strong>${st.nombre}</strong><br>
      Código postal: ${st.cp}<br>
      ${st.nombreCombustible}: ${st.precio}€<br>
      Distancia: ${st.distancia.toFixed(2)} km<br>
      Score: ${st.score.toFixed(3)}<br>
      <button onclick="toggleFavorito('${st.nombre}')">
        ${esFavorita ? "★ Quitar de favoritos" : "☆ Añadir a favoritos"}
      </button>
    `;

    contenedor.appendChild(div);
  });

  // ===== BLOQUE RESTO =====
  if (resto.length > 0) {
    const tituloResto = document.createElement("h2");
    tituloResto.textContent = "Resto de estaciones";
    tituloResto.classList.add("titulo-bloque");
    contenedor.appendChild(tituloResto);

    resto.forEach(st => {
      const div = document.createElement("div");
      const favoritos = obtenerFavoritos();
      const esFavorita = favoritos.includes(st.nombre);
      const etiquetaFavorita = esFavorita
        ? `<span class="tag tag-favorita">❤️ Favorita</span>`
        : "";

      div.classList.add("resultado");

      div.innerHTML = `
        <strong>${st.nombre}</strong><br>
        Código postal: ${st.cp}<br>
        ${st.nombreCombustible}: ${st.precio}€<br>
        Distancia: ${st.distancia.toFixed(2)} km<br>
        Score: ${st.score.toFixed(3)}<br>
        <button onclick="toggleFavorito('${st.nombre}')">
          ${esFavorita ? "★ Quitar de favoritos" : "☆ Añadir a favoritos"}
        </button>
      `;

      contenedor.appendChild(div);
    });
  }
}

function crearSkeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton skeleton-tag"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
  `;
}

function mostrarSkeletonResultados() {
  const contenedor = document.getElementById("resultados");

  mostrarControles(false);
  contenedor.innerHTML = `
    <div class="skeleton-bloque">
      <div class="skeleton skeleton-heading"></div>
      ${crearSkeletonCard()}
      ${crearSkeletonCard()}
      ${crearSkeletonCard()}
    </div>
  `;
}

function mostrarSkeletonFavoritas() {
  const contenedor = document.getElementById("favoritasInicio");

  contenedor.innerHTML = `
    <div class="skeleton-bloque">
      <div class="skeleton skeleton-heading"></div>
      ${crearSkeletonCard()}
      ${crearSkeletonCard()}
    </div>
  `;
}

function mostrarError(msg) {
  const contenedor = document.getElementById("resultados");
  
  mostrarControles(false);
  contenedor.innerHTML = `<p class="mensaje">${msg}</p>`;
}

function ordenarResultados(tipo) {
  if (resultadosActuales.length === 0) return;

  if (tipo === "asc") {
    resultadosActuales.sort((a, b) => a.precio - b.precio);
  } else {
    resultadosActuales.sort((a, b) => b.precio - a.precio);
  }

  mostrarResultados(resultadosActuales);
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const radioTierra = 6371; // km

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radioTierra * c;
}

function ordenarResultados(tipo) {
  if (resultadosActuales.length === 0) return;

  if (tipo === "asc") {
    resultadosActuales.sort((a, b) => a.precio - b.precio);
  } else if (tipo === "desc") {
    resultadosActuales.sort((a, b) => b.precio - a.precio);
  } else if (tipo === "distancia") {
    resultadosActuales.sort((a, b) => a.distancia - b.distancia);
  }

  mostrarResultados(resultadosActuales);
}

//ocultar y mostrar botones ordenar
function mostrarControles(visible) {
  const controles = document.getElementById("controlesOrden");
  controles.style.display = visible ? "block" : "none";
}

//GESTION FAVORITOS
function obtenerFavoritos() {
  const favoritos = localStorage.getItem("favoritos");
  return favoritos ? JSON.parse(favoritos) : [];
}

function guardarFavoritos(favoritos) {
  localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

function toggleFavorito(nombreEstacion) {
  let favoritos = obtenerFavoritos();

  if (favoritos.includes(nombreEstacion)) {
    favoritos = favoritos.filter(nombre => nombre !== nombreEstacion);
  } else {
    favoritos.push(nombreEstacion);
  }

  guardarFavoritos(favoritos);
  mostrarFavoritasInicio();
  mostrarResultados(resultadosActuales);
}

async function mostrarFavoritasInicio() {
  const contenedor = document.getElementById("favoritasInicio");
  const favoritos = obtenerFavoritos();

  contenedor.innerHTML = "";

  if (favoritos.length === 0) {
    return;
  }

  try {
    mostrarSkeletonFavoritas();

    const stations = await cargarEstaciones();

    const favoritas = stations.filter(st => favoritos.includes(st.nombre));

    if (favoritas.length === 0) {
      contenedor.innerHTML = "";
      return;
    }

    contenedor.innerHTML = "";

    const titulo = document.createElement("h2");
    titulo.textContent = "❤️ Tus gasolineras favoritas";
    titulo.classList.add("titulo-bloque");

    contenedor.appendChild(titulo);

    const subtitulo = document.createElement("p");
    subtitulo.textContent = "Toca una favorita para buscar rápidamente";
    subtitulo.classList.add("descripcion");

    contenedor.appendChild(subtitulo);

    favoritas.forEach(st => {
      const precioCombustible = obtenerPrecioCombustible(st);
      const textoPrecio = precioCombustible
        ? `${precioCombustible.nombre}: ${precioCombustible.valor}€`
        : "Sin precio para este combustible";

      const div = document.createElement("div");
      div.classList.add("resultado");

      div.innerHTML = `
        <span class="tag tag-favorita">❤️ Favorita</span>
        <strong>${st.nombre}</strong><br>
        Código postal: ${st.cp}<br>
        ${textoPrecio}
      `;

      div.addEventListener("click", () => {
        inputCP.value = st.cp;
        boton.click();
      });

      contenedor.appendChild(div);
    });
  } catch (error) {
    contenedor.innerHTML = "";
    console.error("Error al cargar favoritas iniciales:", error);
  }
}

function transformarEstacionAPI(st) {
  const precios = [
    { tipo: "gasoleoA", nombre: "Gasóleo A", valor: parsearNumeroAPI(st["Precio Gasoleo A"]) },
    { tipo: "gasolina95E5", nombre: "Gasolina 95 E5", valor: parsearNumeroAPI(st["Precio Gasolina 95 E5"]) },
    { tipo: "gasolina98E5", nombre: "Gasolina 98 E5", valor: parsearNumeroAPI(st["Precio Gasolina 98 E5"]) }
  ].filter(precio => Number.isFinite(precio.valor));

  return {
    nombre: `${st["Rótulo"]} - ${st["Dirección"]} (${st["C.P."]})`,
    cp: st["C.P."],
    precios,
    lat: parsearNumeroAPI(st["Latitud"]),
    lng: parsearNumeroAPI(st["Longitud (WGS84)"])
  };
}


function parsearNumeroAPI(valor) {
  if (typeof valor !== "string") {
    return Number.NaN;
  }

  const numero = parseFloat(valor.replace(",", ".").trim());
  return Number.isFinite(numero) ? numero : Number.NaN;
}

async function cargarEstaciones() {
  if (!estacionesCache) {
    estacionesCache = fetch("https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/")
      .then(res => {
        if (!res.ok) {
          throw new Error("No se pudieron cargar los datos");
        }

        return res.json();
      })
      .then(datosAPI => (
        Array.isArray(datosAPI.ListaEESSPrecio)
          ? datosAPI.ListaEESSPrecio
            .map(transformarEstacionAPI)
            .filter(st =>
              st.precios.length > 0 &&
              Number.isFinite(st.lat) &&
              Number.isFinite(st.lng)
            )
          : []
      ))
      .catch(error => {
        estacionesCache = null;
        throw error;
      });
  }

  return estacionesCache;
}

async function getCP(cp) {
  const url = `https://secure.geonames.org/postalCodeSearchJSON?postalcode=${cp}&country=ES&username=Daravan`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }

    const data = await res.json();

    if (data.postalCodes && data.postalCodes.length > 0) {
      return {
        cp,
        lat: Number(data.postalCodes[0].lat),
        lng: Number(data.postalCodes[0].lng)
      };
    }

    return null;
  } catch (error) {
    console.error("Error consultando GeoNames:", error);
    return null;
  }
}

mostrarFavoritasInicio();
