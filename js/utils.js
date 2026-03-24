export function parsearNumeroAPI(valor) {
  if (typeof valor !== "string") {
    return Number.NaN;
  }

  const numero = parseFloat(valor.replace(",", ".").trim());
  return Number.isFinite(numero) ? numero : Number.NaN;
}

export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const radioTierra = 6371;
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
