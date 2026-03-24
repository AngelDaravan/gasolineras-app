import { state } from "./state.js";
import { parsearNumeroAPI } from "./utils.js";

function transformarEstacionAPI(st) {
  console.log("Estacion API antes del filtrado:", st);
  const precios = [
    { tipo: "gasoleoA", nombre: "Gasóleo A", valor: parsearNumeroAPI(st["Precio Gasoleo A"]) },
    { tipo: "gasolina95E5", nombre: "Gasolina 95 E5", valor: parsearNumeroAPI(st["Precio Gasolina 95 E5"]) },
    { tipo: "gasolina98E5", nombre: "Gasolina 98 E5", valor: parsearNumeroAPI(st["Precio Gasolina 98 E5"]) }
  ].filter((precio) => Number.isFinite(precio.valor));

  return {
    nombre: `${st["Rótulo"]} - ${st["Localidad"]} (${st["C.P."]})`,
    direccion: st["Dirección"],
    cp: st["C.P."],
    precios,
    lat: parsearNumeroAPI(st["Latitud"]),
    lng: parsearNumeroAPI(st["Longitud (WGS84)"])
  };
}

export async function cargarEstaciones() {
  if (!state.estacionesCache) {
    state.estacionesCache = fetch("https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/")
      .then((res) => {
        if (!res.ok) {
          throw new Error("No se pudieron cargar los datos");
        }

        return res.json();
      })
      .then((datosAPI) => (
        Array.isArray(datosAPI.ListaEESSPrecio)
          ? datosAPI.ListaEESSPrecio
            .map(transformarEstacionAPI)
            .filter((st) =>
              st.precios.length > 0 &&
              Number.isFinite(st.lat) &&
              Number.isFinite(st.lng)
            )
          : []
      ))
      .catch((error) => {
        state.estacionesCache = null;
        throw error;
      });
  }

  return state.estacionesCache;
}

export async function getCP(cp) {
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
