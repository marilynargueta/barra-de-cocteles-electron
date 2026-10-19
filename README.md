# Barra de Cócteles (Electron)

Aplicación de escritorio para explorar cócteles y bebidas del mundo: listado con fotos, buscador y filtros.
Desarrollada con HTML, CSS, JavaScript y Electron.

## Cómo ejecutarla

Requisitos: [Node.js](https://nodejs.org/) (versión LTS) y conexión a internet.

```bash
npm install
npm start
```

No necesita servidor web local ni Live Server: Electron carga `src/index.html` directamente desde el disco.
(La app solo funciona dentro de Electron; abrir `index.html` en un navegador no carga los datos.)

## API utilizada

- **Nombre:** TheCocktailDB
- **URL base:** https://www.thecocktaildb.com/api/json/v1/1/
- **Documentación:** https://www.thecocktaildb.com/api.php
- Pública, HTTP/REST, respuestas en JSON, sin registro (usa la clave de pruebas `1` incluida en la URL, pensada para desarrollo y uso educativo).
- Consulta realizada: `search.php?f=<carácter>` para las letras a–z y los dígitos 0–9 (36 peticiones, una sola vez al iniciar).
  El catálogo se guarda en memoria y todo el filtrado se hace después en JavaScript.
- La versión gratuita de la API puede limitar cuántas bebidas devuelve por consulta, por eso el total puede variar.

> Estado de aprobación del docente: _pendiente de completar antes de entregar_.

## Campos de datos utilizados

| Campo de la API | Uso en la aplicación |
|---|---|
| `idDrink` | Identificador (evita duplicados) |
| `strDrink` | Nombre de la bebida; se muestra y se busca |
| `strDrinkThumb` | Foto de la bebida |
| `strCategory` | Se muestra y es el **Filtro 1:** Categoría |
| `strAlcoholic` | Se muestra y es el **Filtro 2:** Tipo (con alcohol / sin alcohol / opcional) |
| `strGlass` | Se muestra y es el **Filtro 3:** Vaso recomendado |
| `strIngredient1` … `strIngredient15` | Cantidad e ingredientes mostrados, búsqueda y **Filtro 4:** Ingrediente |
| `strTags` | Etiquetas mostradas y usadas en la búsqueda |

## Funcionalidades

1. **Listado:** tarjetas con foto, nombre, etiquetas, categoría, tipo, vaso, cantidad de ingredientes y los primeros ingredientes. Paginación de 24 en 24.
2. **Buscador:** escribe bebida, ingrediente, categoría, tipo o vaso (en inglés o español); ignora mayúsculas y tildes. La lógica está en `src/js/app.js` (`aplicarFiltros`).
3. **Filtros:** categoría, tipo, vaso e ingrediente (se combinan entre sí y con el buscador). El filtro de ingredientes lista solo los que aparecen en 5 o más bebidas. También se puede ordenar por nombre o por cantidad de ingredientes.

## Estructura

```
ejercicio_02/
├── package.json
├── main.js          # proceso principal: ventana y consulta a la API (IPC)
├── preload.js       # puente seguro (contextBridge) hacia la interfaz
├── src/
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js    # búsqueda, filtros, paginación y pintado de tarjetas
└── assets/
    └── icon.png     # icono de la aplicación
```

## Seguridad (buenas prácticas de Electron)

- `nodeIntegration: false`, `contextIsolation: true` y `sandbox: true`.
- La interfaz no tiene acceso a Node.js ni a `ipcRenderer`: `preload.js` solo expone con `contextBridge`
  la función `api.obtenerBebidas()`, que el proceso principal atiende por IPC (`bebidas:obtener`).
- Política de seguridad de contenido (CSP): la interfaz no puede hacer conexiones de red
  (`connect-src 'none'`); solo carga las fotos desde `www.thecocktaildb.com`.
- Se bloquean ventanas nuevas y navegación externa.
- Los datos de la API se insertan con `textContent`, nunca como HTML.

## Pruebas manuales sugeridas

- Abrir con `npm start`; comprobar ventana, título e icono. La primera carga tarda unos segundos (36 consultas).
- Buscar `margarita`, `ron`, `lime`; comprobar que ignora tildes y mayúsculas.
- Probar cada filtro por separado y combinados; usar "Limpiar filtros".
- Cambiar el orden y navegar entre páginas.
- Buscar un texto inexistente y comprobar el aviso.
- Sin internet: reiniciar la app, comprobar el error y reintentar al reconectar.
