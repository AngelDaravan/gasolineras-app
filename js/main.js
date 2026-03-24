import { tiposCombustible } from "./config.js";
import { elements } from "./dom.js";
import { state } from "./state.js";
import { cargarEstaciones, getCP } from "./api.js";
import { obtenerFavoritos, guardarFavoritos } from "./favorites.js";
import {
  mostrarControles,
  mostrarError,
  mostrarResultados,
  mostrarSkeletonFavoritas,
  mostrarSkeletonResultados,
  renderFavoritasInicio
} from "./render.js";
import { calcularDistancia } from "./utils.js";

function getCombustibleSeleccionado() {
  const botonActivo = elements.contenedorCombustible?.querySelector(".combustible-btn.active");
  return botonActivo?.dataset.combustible ?? "diesel";
}

function obtenerPrecioCombustible(estacion, combustibleSeleccionado = getCombustibleSeleccionado()) {
  const tipoBuscado = tiposCombustible[combustibleSeleccionado];

  if (!tipoBuscado || !Array.isArray(estacion.precios)) {
    return null;
  }

  return estacion.precios.find((precio) => precio.tipo === tipoBuscado) ?? null;
}

function calcularScore(lista) {
  const prioridad = Number(elements.sliderPrioridad.value);
  const pesoPrecio = prioridad / 100;
  const pesoDistancia = 1 - pesoPrecio;
  const minPrecio = Math.min(...lista.map((st) => st.precio));
  const maxPrecio = Math.max(...lista.map((st) => st.precio));
  const minDistancia = Math.min(...lista.map((st) => st.distancia));
  const maxDistancia = Math.max(...lista.map((st) => st.distancia));

  return lista.map((st) => {
    const precioNormalizado =
      maxPrecio === minPrecio ? 0 : (st.precio - minPrecio) / (maxPrecio - minPrecio);
    const distanciaNormalizada =
      maxDistancia === minDistancia ? 0 : (st.distancia - minDistancia) / (maxDistancia - minDistancia);
    const score = (precioNormalizado * pesoPrecio) + (distanciaNormalizada * pesoDistancia);

    return {
      ...st,
      score
    };
  });
}

async function actualizarBusqueda(forzar = false) {
  if (!forzar && (!state.ultimaBusqueda || state.resultadosActuales.length === 0)) {
    return;
  }

  mostrarFavoritasInicio();

  if ((state.cargando && !forzar) || !state.ultimaBusqueda) {
    return;
  }

  const stations = await cargarEstaciones();
  const combustibleSeleccionado = getCombustibleSeleccionado();
  const distanciaMaxima = Number(elements.sliderDistancia.value);

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
    .map((st) => ({
      ...st,
      distancia: calcularDistancia(
        state.ultimaBusqueda.codigoPostalUsuario.lat,
        state.ultimaBusqueda.codigoPostalUsuario.lng,
        st.lat,
        st.lng
      )
    }))
    .filter((st) => st.distancia <= distanciaMaxima);

  state.resultadosActuales = calcularScore(listaConDistancias)
    .sort((a, b) => a.distancia - b.distancia);

  mostrarResultados(state.resultadosActuales);
}

function ordenarResultados(tipo) {
  if (state.resultadosActuales.length === 0) {
    return;
  }

  if (tipo === "asc") {
    state.resultadosActuales.sort((a, b) => a.precio - b.precio);
  } else if (tipo === "desc") {
    state.resultadosActuales.sort((a, b) => b.precio - a.precio);
  } else if (tipo === "distancia") {
    state.resultadosActuales.sort((a, b) => a.distancia - b.distancia);
  }

  mostrarResultados(state.resultadosActuales);
}

async function mostrarFavoritasInicio() {
  const favoritos = obtenerFavoritos();
  elements.contenedorFavoritas.innerHTML = "";

  if (favoritos.length === 0) {
    return;
  }

  try {
    mostrarSkeletonFavoritas();

    const stations = await cargarEstaciones();
    const favoritas = stations.filter((st) => favoritos.includes(st.nombre));

    renderFavoritasInicio(
      favoritas,
      obtenerPrecioCombustible,
      (st) => {
        elements.inputCP.value = st.cp;
        elements.boton.click();
      }
    );
  } catch (error) {
    elements.contenedorFavoritas.innerHTML = "";
    console.error("Error al cargar favoritas iniciales:", error);
  }
}

function toggleFavorito(nombreEstacion) {
  let favoritos = obtenerFavoritos();

  if (favoritos.includes(nombreEstacion)) {
    favoritos = favoritos.filter((nombre) => nombre !== nombreEstacion);
  } else {
    favoritos.push(nombreEstacion);
  }

  guardarFavoritos(favoritos);
  mostrarFavoritasInicio();
  mostrarResultados(state.resultadosActuales);
}

function inicializarEventos() {
  document.getElementById("orden-asc").addEventListener("click", () => {
    ordenarResultados("asc");
  });

  document.getElementById("orden-desc").addEventListener("click", () => {
    ordenarResultados("desc");
  });

  document.getElementById("orden-distancia").addEventListener("click", () => {
    ordenarResultados("distancia");
  });

  elements.sliderDistancia.addEventListener("input", () => {
    elements.valorDistancia.textContent = elements.sliderDistancia.value;
    actualizarBusqueda();
  });

  elements.boton.addEventListener("click", async () => {
    if (state.cargando) {
      return;
    }

    state.cargando = true;
    elements.boton.disabled = true;
    elements.boton.textContent = "⏳ Buscando...";

    const cp = elements.inputCP.value.trim();

    if (cp.length !== 5) {
      mostrarError("Introduce un código postal válido (5 cifras)");
      state.cargando = false;
      elements.boton.disabled = false;
      elements.boton.textContent = "🔎 Buscar";
      return;
    }

    try {
      mostrarSkeletonResultados();

      const codigoPostalUsuario = await getCP(cp);

      if (!codigoPostalUsuario) {
        mostrarError("No se encontraron coordenadas para ese código postal");
        return;
      }

      state.ultimaBusqueda = { cp, codigoPostalUsuario };
      await actualizarBusqueda(true);
    } catch (error) {
      mostrarError("Ha ocurrido un error al cargar los datos");
      console.error(error);
    } finally {
      state.cargando = false;
      elements.boton.disabled = false;
      elements.boton.textContent = "🔎 Buscar";
    }
  });

  elements.inputCP.addEventListener("input", () => {
    elements.inputCP.value = elements.inputCP.value.replace(/\D/g, "");
  });

  elements.inputCP.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      elements.boton.click();
    }
  });

  elements.sliderPrioridad.addEventListener("input", () => {
    const valor = Number(elements.sliderPrioridad.value);

    if (valor < 35) {
      elements.textoPrioridad.textContent = "Priorizar cercanía";
    } else if (valor > 65) {
      elements.textoPrioridad.textContent = "Priorizar precio";
    } else {
      elements.textoPrioridad.textContent = "Equilibrado";
    }

    actualizarBusqueda();
  });

  if (elements.contenedorCombustible) {
    elements.contenedorCombustible.addEventListener("click", (event) => {
      const botonSeleccionado = event.target.closest(".combustible-btn");

      if (!botonSeleccionado || !elements.contenedorCombustible.contains(botonSeleccionado)) {
        return;
      }

      elements.contenedorCombustible.querySelectorAll(".combustible-btn").forEach((boton) => {
        const estaActivo = boton === botonSeleccionado;
        boton.classList.toggle("active", estaActivo);
        boton.setAttribute("aria-pressed", String(estaActivo));
      });

      actualizarBusqueda();
    });
  }
}

window.toggleFavorito = toggleFavorito;

mostrarControles(false);
inicializarEventos();
mostrarFavoritasInicio();
