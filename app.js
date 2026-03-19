let resultadosActuales = [];

const boton = document.getElementById("buscar");
const inputCP = document.getElementById("cp");

document.getElementById("orden-asc").addEventListener("click", () => {
  ordenarResultados("asc");
});

document.getElementById("orden-desc").addEventListener("click", () => {
  ordenarResultados("desc");
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

    resultadosActuales = stations
      //.filter(st => st.cp === cp)
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
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 5);

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

function mostrarResultados(lista) {
  const contenedor = document.getElementById("resultados");
  contenedor.innerHTML = "";

  //Si el resultado es 0
  if (lista.length === 0) {
    contenedor.innerHTML = "<p class='mensaje'>No se han encontrado gasolineras en tu localidad</p>";
    return;
  }

  //Si hay resultados
  lista.forEach(st => {
    const div = document.createElement("div");
    div.classList.add("resultado");

    div.innerHTML = `
      <strong>${st.nombre}</strong><br>
      Precio: ${st.precio}€<br>
      Distancia: ${st.distancia.toFixed(2)} km
    `;

    contenedor.appendChild(div);
  });
}

function mostrarError(msg) {
  const contenedor = document.getElementById("resultados");
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