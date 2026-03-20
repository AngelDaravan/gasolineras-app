# Día 2 - Filtros, score, UX y favoritos

## 🧠 Qué he trabajado
- Mejora de la experiencia de usuario
- Lógica de cálculo de distancia
- Introducción de criterios de decisión (precio vs distancia)
- Persistencia de datos con localStorage

## 🔧 Funcionalidades implementadas

### 📍 Búsqueda y filtros
- Validación de código postal (solo números, 5 cifras)
- Cálculo de distancia entre usuario y gasolineras
- Slider de distancia máxima
- Filtrado por radio de búsqueda

### 📊 Ordenación
- Orden por precio (ascendente / descendente)
- Orden por distancia
- Mostrar/ocultar botones según resultados

### ⭐ Destacadas
- Gasolinera más cercana
- Gasolinera más barata
- Mejor opción (score)
- Bloque separado de “Destacadas”
- Descripciones contextuales (UX)

### ⚖️ Score dinámico
- Slider para priorizar:
  - cercanía
  - precio
- Normalización de valores
- Cálculo de score combinado

### ❤️ Favoritos
- Guardar favoritas con `localStorage`
- Añadir/quitar favoritos
- Mostrar favoritas al inicio
- Persistencia entre sesiones

## 🧩 Problemas encontrados
- Variables fuera de scope (`st is not defined`)
- Uso incorrecto de `.push()` en string
- Duplicados en destacadas
- Funciones no accesibles (`guardarFavoritos`)
- Variables no definidas (`resto`)

## ✅ Cómo los he solucionado
- Moviendo lógica dentro de `forEach`
- Usando arrays en vez de strings para etiquetas
- Uso de `.includes()` para evitar duplicados
- Definiendo funciones en scope global
- Reorganizando lógica de listas

## 💡 Conceptos aprendidos

### JavaScript
- `forEach` vs `map` vs `filter`
- `reduce` para encontrar mínimos
- Manejo de arrays y objetos
- Scope de variables

### Web
- `localStorage`
- Manipulación del DOM
- Eventos (`click`, `input`)
- Render dinámico

### UX/UI
- Feedback al usuario
- Ocultar/mostrar elementos
- Agrupar información (destacadas/resto)
- Uso de iconos y etiquetas

## 🚀 Próximos pasos
- Conectar con API real de gasolineras
- Añadir mapa (Leaflet)
- Sistema de usuarios
- Mejorar UI (animaciones, estilos)