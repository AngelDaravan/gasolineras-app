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
  elements.contenedorFavoritas.innerHTML = `
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
    ? `<span class="tag tag-favorita">❤️ Favorita</span>`
    : "";
  const descripcion = opciones.descripcion ?? "";
  const etiquetas = opciones.etiquetas ?? [];

  return `
    ${etiquetaFavorita}
    ${etiquetas.join(" ")}
    ${descripcion ? `<p class="descripcion">${descripcion}</p>` : ""}
    <strong>${st.nombre}</strong><br>
    Dirección: ${st.direccion}<br>
    Código postal: ${st.cp}<br>
    ${st.nombreCombustible}: ${st.precio}€<br>
    Distancia: ${st.distancia.toFixed(2)} km<br>
    Score: ${st.score.toFixed(3)}<br>
    <button onclick="toggleFavorito('${st.nombre}')">
      ${esFavorita ? "★ Quitar de favoritos" : "☆ Añadir a favoritos"}
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
  elements.contenedorFavoritas.innerHTML = "";

  if (favoritas.length === 0) {
    return;
  }

  const titulo = document.createElement("h2");
  titulo.textContent = "❤️ Tus gasolineras favoritas";
  titulo.classList.add("titulo-bloque");
  elements.contenedorFavoritas.appendChild(titulo);

  const subtitulo = document.createElement("p");
  subtitulo.textContent = "Toca una favorita para buscar rápidamente";
  subtitulo.classList.add("descripcion");
  elements.contenedorFavoritas.appendChild(subtitulo);

  favoritas.forEach((st) => {
    const precioCombustible = obtenerPrecioCombustible(st);
    const textoPrecio = precioCombustible
      ? `${precioCombustible.nombre}: <strong>${precioCombustible.valor}€</strong>`
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
      onSeleccionarFavorita(st);
    });

    elements.contenedorFavoritas.appendChild(div);
  });
}
