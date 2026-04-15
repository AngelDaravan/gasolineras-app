import { elements } from "./dom.js";
import { obtenerFavoritos } from "./favorites.js";

export function mostrarControles(visible) {
  elements.controles.style.display = visible ? "block" : "none";
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

function obtenerSubtituloFavoritas() {
  return document.getElementById("descripcionFavoritas");
}

function obtenerListaFavoritas() {
  return document.getElementById("listaFavoritasInicio");
}

export function mostrarSkeletonResultados() {
  mostrarControles(false);
  elements.contenedorResultados.innerHTML = `
    <div class="skeleton-bloque">
      <div class="skeleton skeleton-heading"></div>
      ${crearSkeletonCard()}
      ${crearSkeletonCard()}
      ${crearSkeletonCard()}
    </div>
  `;
}

export function mostrarSkeletonFavoritas() {
  const subtitulo = obtenerSubtituloFavoritas();
  const listaFavoritas = obtenerListaFavoritas();

  if (subtitulo) {
    subtitulo.textContent = "Cargando tus favoritas...";
  }

  if (!listaFavoritas) {
    return;
  }

  listaFavoritas.innerHTML = `
    <div class="skeleton-bloque">
      <div class="skeleton skeleton-heading"></div>
      ${crearSkeletonCard()}
      ${crearSkeletonCard()}
    </div>
  `;
}

export function mostrarError(msg) {
  mostrarControles(false);
  elements.contenedorResultados.innerHTML = `<p class="mensaje">${msg}</p>`;
}

function construirTarjetaResultado(st, opciones = {}) {
  const favoritos = obtenerFavoritos();
  const esFavorita = favoritos.includes(st.nombre);
  const etiquetaFavorita = esFavorita
    ? `<span class="tag tag-favorita">Favorita</span>`
    : "";
  const descripcion = opciones.descripcion ?? "";
  const etiquetas = opciones.etiquetas ?? [];

  return `
    ${etiquetaFavorita}
    ${etiquetas.join(" ")}
    ${descripcion ? `<p class="descripcion">${descripcion}</p>` : ""}
    <strong>${st.nombre}</strong><br>
    <div>
      Direccion:
      <a
        href="https://www.google.com/maps?q=${st.lat},${st.lng}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${st.direccion}
      </a>
    </div>
    Codigo postal: ${st.cp}<br>
    ${st.nombreCombustible}: ${st.precio} EUR<br>
    Distancia: ${st.distancia.toFixed(2)} km<br>
    Puntuacion prioridad: ${st.score.toFixed(3)}<br>
    <button onclick="toggleFavorito('${st.nombre}')">
      ${esFavorita ? "Quitar de favoritos" : "Anadir a favoritos"}
    </button>
  `;
}

export function mostrarResultados(lista) {
  elements.contenedorResultados.innerHTML = "";

  if (lista.length === 0) {
    mostrarControles(false);
    elements.contenedorResultados.innerHTML = "<p class='mensaje'>No se han encontrado gasolineras en tu localidad</p>";
    return;
  }

  mostrarControles(lista.length > 1);

  const mensajeResultados = document.createElement("p");
  mensajeResultados.textContent =
    lista.length === 1
      ? "Se ha encontrado 1 gasolinera"
      : `Se han encontrado ${lista.length} gasolineras`;

  elements.contenedorResultados.appendChild(mensajeResultados);

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
  [estacionMasCercana, estacionMasBarata, estacionMejorOpcion].forEach((st) => {
    const yaIncluida = destacadas.some((item) => item.nombre === st.nombre);
    if (!yaIncluida) {
      destacadas.push(st);
    }
  });

  const resto = lista.filter((st) => !destacadas.includes(st));

  const tituloDestacadas = document.createElement("h2");
  tituloDestacadas.textContent = "Destacadas";
  tituloDestacadas.classList.add("titulo-bloque");
  elements.contenedorResultados.appendChild(tituloDestacadas);

  destacadas.forEach((st) => {
    const div = document.createElement("div");
    div.classList.add("resultado", "resultado-destacado");

    const esMasBarata = st.nombre === estacionMasBarata.nombre;
    const esMasCercana = st.nombre === estacionMasCercana.nombre;
    const esMejorOpcion = st.nombre === estacionMejorOpcion.nombre;
    const etiquetas = [];
    let descripcion = "";

    if (esMejorOpcion) {
      etiquetas.push(`<span class="tag tag-mejor">Mejor opcion</span>`);
      descripcion = "La mejor combinacion entre cercania y precio";
    }

    if (esMasCercana) {
      etiquetas.push(`<span class="tag tag-cercana">Mas cercana</span>`);
      if (!descripcion) {
        descripcion = "La opcion mas cercana para repostar rapido";
      }
    }

    if (esMasBarata) {
      etiquetas.push(`<span class="tag tag-barata">Mas barata</span>`);
      if (!descripcion) {
        descripcion = "La opcion mas economica aunque este mas lejos";
      }
    }

    div.innerHTML = construirTarjetaResultado(st, { descripcion, etiquetas });
    elements.contenedorResultados.appendChild(div);
  });

  if (resto.length > 0) {
    const tituloResto = document.createElement("h2");
    tituloResto.textContent = "Resto de estaciones";
    tituloResto.classList.add("titulo-bloque");
    elements.contenedorResultados.appendChild(tituloResto);

    resto.forEach((st) => {
      const div = document.createElement("div");
      div.classList.add("resultado");
      div.innerHTML = construirTarjetaResultado(st);
      elements.contenedorResultados.appendChild(div);
    });
  }
}

export function renderFavoritasInicio(favoritas, obtenerPrecioCombustible, onSeleccionarFavorita) {
  const subtitulo = obtenerSubtituloFavoritas();
  const listaFavoritas = obtenerListaFavoritas();

  if (!listaFavoritas) {
    return;
  }

  listaFavoritas.innerHTML = "";

  if (favoritas.length === 0) {
    if (subtitulo) {
      subtitulo.textContent = "Aun no tienes favoritas. Anade alguna gasolinera para tenerla siempre a mano.";
    }
    return;
  }

  if (subtitulo) {
    subtitulo.textContent = "Toca una favorita para buscar rapidamente.";
  }

  favoritas.forEach((st) => {
    const precioCombustible = obtenerPrecioCombustible(st);
    const textoPrecio = precioCombustible
      ? `${precioCombustible.nombre}: <strong>${precioCombustible.valor} EUR</strong>`
      : "Sin precio para este combustible";

    const div = document.createElement("div");
    div.classList.add("resultado");
    div.innerHTML = `
      <span class="tag tag-favorita">Favorita</span>
      <strong>${st.nombre}</strong><br>
      Direccion: ${st.direccion}<br>
      ${textoPrecio}
    `;

    div.addEventListener("click", () => {
      onSeleccionarFavorita(st);
    });

    listaFavoritas.appendChild(div);
  });
}
