let resultadosActuales = [];

const boton = document.getElementById("buscar");
const inputCP = document.getElementById("cp");
const sliderDistancia = document.getElementById("distanciaMax");
const valorDistancia = document.getElementById("valorDistancia");
const controles = document.getElementById("controlesOrden");
const sliderPrioridad = document.getElementById("prioridadScore");
const textoPrioridad = document.getElementById("textoPrioridad");

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
  //console.log("slider movido:", sliderDistancia.value);
});

boton.addEventListener("click", async () => {
  const cp = inputCP.value.trim();

  //comprobar formato cp
  if (cp.length !== 5) {
    // alert = pop up. Creamos funcion, menos invasivo
    mostrarError("Introduce un código postal válido (5 cifras)");
    return;
  }

  // try - catch
  try {
    const resStations = await fetch("data/stations.json");
    const resPostalCodes = await fetch("data/postal_codes.json");

    if (!resStations.ok || !resPostalCodes.ok) {
      throw new Error("No se pudieron cargar los datos");
    }

    const stations = await resStations.json();
    const postalCodes = await resPostalCodes.json();
    // Filtrar estaciones por código postal
    //Guardar datos en una variable global
    const codigoPostalUsuario = postalCodes.find(item => item.cp === cp);

    if (!codigoPostalUsuario) {
      mostrarError("No se encontraron coordenadas para ese código postal");
      return;
    }

    const distanciaMaxima = Number(sliderDistancia.value);

    resultadosActuales = stations
      //gestión del json y cada elemento
      .map(st => {
        const distancia = calcularDistancia(
          codigoPostalUsuario.lat,
          codigoPostalUsuario.lng,
          st.lat,
          st.lng
        );

        return {
          ...st,
          distancia: distancia
        };
      })
      .filter(st => st.distancia <= distanciaMaxima)
      .sort((a, b) => a.distancia - b.distancia);

    const listaConDistancias = stations
      .map(st => {
        const distancia = calcularDistancia(
          codigoPostalUsuario.lat,
          codigoPostalUsuario.lng,
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
  } catch (error) {
    mostrarError("Ha ocurrido un error al cargar los datos");
    console.error(error);
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
});

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
      Precio: ${st.precio}€<br>
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
        Precio: ${st.precio}€<br>
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
    const res = await fetch("data/stations.json");
    const stations = await res.json();

    const favoritas = stations.filter(st => favoritos.includes(st.nombre));

    if (favoritas.length === 0) {
      return;
    }

    const titulo = document.createElement("h2");
    titulo.textContent = "❤️ Tus gasolineras favoritas";
    titulo.classList.add("titulo-bloque");

    contenedor.appendChild(titulo);

    const subtitulo = document.createElement("p");
    subtitulo.textContent = "Toca una favorita para buscar rápidamente";
    subtitulo.classList.add("descripcion");

    contenedor.appendChild(subtitulo);

    favoritas.forEach(st => {
      const div = document.createElement("div");
      div.classList.add("resultado");

      div.innerHTML = `
        <span class="tag tag-favorita">❤️ Favorita</span>
        <strong>${st.nombre}</strong><br>
        Código postal: ${st.cp}<br>
        Precio: ${st.precio}€
      `;

      div.addEventListener("click", () => {
        inputCP.value = st.cp;
        boton.click();
      });

      contenedor.appendChild(div);
    });
  } catch (error) {
    console.error("Error al cargar favoritas iniciales:", error);
  }
}

mostrarFavoritasInicio();