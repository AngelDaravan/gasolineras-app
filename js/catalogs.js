import { cargarEstaciones } from "./api.js";
import { elements } from "./dom.js";

export function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coincideTexto(valor, esperado) {
  return normalizarTexto(valor ?? "") === normalizarTexto(esperado ?? "");
}

export async function actualizarLocalidadesPorProvincia() {
  const provinciaSeleccionada = elements.provincia.value.trim();
  if (elements.listaLocalidades) {
    elements.listaLocalidades.innerHTML = "";
  }

  if (elements.inputLocalidad) {
    elements.inputLocalidad.value = "";
  }

  if (elements.sugerenciasLocalidad) {
    elements.sugerenciasLocalidad.innerHTML = "";
  }

  if (!provinciaSeleccionada) {
    return;
  }

  const estaciones = await cargarEstaciones();

  const mapaLocalidades = new Map();

  estaciones
    .filter((st) => coincideTexto(st.provincia, provinciaSeleccionada))
    .forEach((st) => {
      if (!st.localidad) return;

      const visible = st.localidad.trim();
      const clave = normalizarTexto(visible);

      if (!mapaLocalidades.has(clave)) {
        mapaLocalidades.set(clave, visible);
      }
    });

  Array.from(mapaLocalidades.values())
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((localidad) => {
      if (!elements.listaLocalidades) {
        return;
      }

      const option = document.createElement("option");
      option.value = localidad;
      elements.listaLocalidades.appendChild(option);
    });
}

async function obtenerLocalidadesProvincia(provincia) {
  const estaciones = await cargarEstaciones();
  const mapa = new Map();

  estaciones
    .filter((st) => coincideTexto(st.provincia, provincia))
    .forEach((st) => {
      if (!st.localidad) return;

      const visible = st.localidad.trim();
      const clave = normalizarTexto(visible);

      if (!mapa.has(clave)) {
        mapa.set(clave, visible);
      }
    });

  return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, "es"));
}

export async function mostrarSugerenciasLocalidad() {
  const provincia = elements.provincia.value.trim();
  const texto = elements.inputLocalidad.value.trim();

  if (!elements.sugerenciasLocalidad) {
    return;
  }

  elements.sugerenciasLocalidad.innerHTML = "";

  if (!provincia || texto.length < 3) {
    return;
  }

  const localidades = await obtenerLocalidadesProvincia(provincia);
  const textoNormalizado = normalizarTexto(texto);

  const coincidencias = localidades
    .filter((loc) => normalizarTexto(loc).includes(textoNormalizado))
    .slice(0, 8);

  coincidencias.forEach((localidad) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "sugerencia-item";
    item.textContent = localidad;

    item.addEventListener("click", () => {
      elements.inputLocalidad.value = localidad;
      elements.sugerenciasLocalidad.innerHTML = "";
    });

    elements.sugerenciasLocalidad.appendChild(item);
  });
}

export function limpiarSugerenciasLocalidad() {
  if (elements.sugerenciasLocalidad) {
    elements.sugerenciasLocalidad.innerHTML = "";
  }
}
