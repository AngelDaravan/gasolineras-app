export function obtenerFavoritos() {
  const favoritos = localStorage.getItem("favoritos");
  return favoritos ? JSON.parse(favoritos) : [];
}

export function guardarFavoritos(favoritos) {
  localStorage.setItem("favoritos", JSON.stringify(favoritos));
}
