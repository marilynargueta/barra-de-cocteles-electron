// ============================================================
// app.js — Lógica de la interfaz (proceso de renderizado)
// 1. Pide el catálogo de bebidas a través de window.api (preload).
// 2. Búsqueda y filtros se calculan aquí, con JavaScript, sobre
//    los datos descargados (no se vuelve a llamar a la API).
// ============================================================

const POR_PAGINA = 24;
const MIN_BEBIDAS_POR_INGREDIENTE = 5; // el filtro de ingredientes solo lista los más usados

// Traducciones solo para mostrar (los valores reales de la API se usan para filtrar).
// Las claves van en minúsculas: la API a veces cambia mayúsculas ("Martini Glass" / "Martini glass").
const CATEGORIAS = {
    "ordinary drink": "Bebida común", "cocktail": "Cóctel", "shake": "Batido", "other / unknown": "Otras",
    "cocoa": "Cacao", "shot": "Shot", "coffee / tea": "Café / té", "homemade liqueur": "Licor casero",
    "punch / party drink": "Ponche / fiesta", "beer": "Cerveza", "soft drink": "Refresco", "soft drink / soda": "Refresco"
};

const TIPOS = {
    "alcoholic": "Con alcohol", "non alcoholic": "Sin alcohol", "optional alcohol": "Alcohol opcional"
};

const VASOS = {
    "highball glass": "Vaso highball", "cocktail glass": "Copa de cóctel", "old-fashioned glass": "Vaso old fashioned",
    "collins glass": "Vaso Collins", "shot glass": "Vaso de chupito", "martini glass": "Copa de martini",
    "champagne flute": "Flauta de champán", "wine glass": "Copa de vino", "white wine glass": "Copa de vino blanco",
    "margarita/coupette glass": "Copa margarita", "margarita glass": "Copa margarita", "coupe glass": "Copa coupé",
    "pint glass": "Vaso pinta", "beer mug": "Jarra de cerveza", "beer glass": "Vaso de cerveza",
    "beer pilsner": "Vaso pilsner", "coffee mug": "Taza de café", "mason jar": "Frasco", "jar": "Frasco",
    "pitcher": "Jarra", "punch bowl": "Ponchera", "irish coffee cup": "Taza de Irish coffee",
    "hurricane glass": "Vaso huracán", "whiskey glass": "Vaso de whisky", "whiskey sour glass": "Vaso whiskey sour",
    "brandy snifter": "Copa de brandy", "cordial glass": "Copa de licor", "pousse cafe glass": "Copa pousse-café",
    "nick and nora glass": "Copa Nick and Nora", "copper mug": "Taza de cobre", "balloon glass": "Copa balón",
    "parfait glass": "Copa parfait", "shot": "Vaso de chupito", "cup": "Taza"
};

const $ = (id) => document.getElementById(id);
const traducir = (mapa, valor) => mapa[String(valor || "").toLowerCase()] || valor || "No disponible";

let bebidas = [];    // catálogo completo ya normalizado
let filtradas = [];  // resultado de aplicar búsqueda + filtros
let pagina = 1;

// "Limón" -> "limon": buscar sin importar tildes ni mayúsculas
const normalizar = (texto) =>
    String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// ------------------------------------------------------------
// Datos: convierte cada registro de la API en un objeto simple
// ------------------------------------------------------------
function normalizarBebida(b) {
    // La API entrega strIngredient1 ... strIngredient15 (vacíos si no se usan)
    const ingredientes = [];
    for (let i = 1; i <= 15; i++) {
        const nombre = (b[`strIngredient${i}`] || "").trim();
        if (nombre) ingredientes.push(nombre);
    }
    const etiquetas = (b.strTags || "").split(",").map((t) => t.trim()).filter(Boolean);

    return {
        id: b.idDrink,
        nombre: b.strDrink || "Sin nombre",
        categoria: b.strCategory || "",
        alcohol: b.strAlcoholic || "",
        vaso: b.strGlass || "",
        foto: b.strDrinkThumb || "",
        etiquetas,
        ingredientes,
        // texto en el que se busca: nombre, categoría, tipo y vaso (inglés y español), etiquetas e ingredientes
        texto: normalizar([
            b.strDrink, b.strCategory, traducir(CATEGORIAS, b.strCategory), traducir(TIPOS, b.strAlcoholic),
            b.strGlass, etiquetas.join(" "), ingredientes.join(" ")
        ].join(" "))
    };
}

// ------------------------------------------------------------
// Búsqueda + filtros + orden (todo en JavaScript)
// ------------------------------------------------------------
function aplicarFiltros() {
    const texto = normalizar($("busqueda").value);
    const categoria = $("categoria").value;
    const alcohol = $("alcohol").value;
    const vaso = $("vaso").value;
    const ingrediente = $("ingrediente").value;
    const orden = $("orden").value;

    filtradas = bebidas.filter((b) => {
        if (texto && !b.texto.includes(texto)) return false;
        if (categoria && b.categoria !== categoria) return false;
        if (alcohol && b.alcohol !== alcohol) return false;
        if (vaso && b.vaso.toLowerCase() !== vaso) return false;
        if (ingrediente && !b.ingredientes.some((i) => normalizar(i) === ingrediente)) return false;
        return true;
    });

    if (orden === "ingredientes") filtradas.sort((a, b) => b.ingredientes.length - a.ingredientes.length || a.nombre.localeCompare(b.nombre));
    else if (orden === "nombre-desc") filtradas.sort((a, b) => b.nombre.localeCompare(a.nombre));
    else filtradas.sort((a, b) => a.nombre.localeCompare(b.nombre));

    pagina = 1;
    mostrar();
}

// ------------------------------------------------------------
// Pintar tarjetas con <template> (datos como texto, nunca como HTML)
// ------------------------------------------------------------
function mostrar() {
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    pagina = Math.min(pagina, totalPaginas);

    const lista = $("lista");
    lista.textContent = "";
    const fragmento = document.createDocumentFragment();
    const plantilla = $("plantilla").content;

    filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).forEach((b) => {
        const clon = plantilla.cloneNode(true);
        const img = clon.querySelector(".foto");
        // Miniatura mediana (más liviana); si falla, se usa la imagen original
        img.src = b.foto ? `${b.foto}/medium` : "";
        img.alt = `Foto de ${b.nombre}`;
        img.addEventListener("error", () => {
            if (b.foto && img.src !== b.foto) img.src = b.foto;
            else img.hidden = true;
        }, { once: true });

        clon.querySelector(".nombre").textContent = b.nombre;
        clon.querySelector(".etiquetas").textContent = b.etiquetas.join(" · ");
        clon.querySelector(".categoria").textContent = traducir(CATEGORIAS, b.categoria);
        clon.querySelector(".alcohol").textContent = traducir(TIPOS, b.alcohol);
        clon.querySelector(".vaso").textContent = traducir(VASOS, b.vaso);
        clon.querySelector(".cantidad").textContent = String(b.ingredientes.length);
        const primeros = b.ingredientes.slice(0, 4).join(", ");
        clon.querySelector(".incluye").textContent =
            b.ingredientes.length > 4 ? `${primeros}…` : (primeros || "No disponible");
        fragmento.appendChild(clon);
    });
    lista.appendChild(fragmento);

    $("vacio").classList.toggle("d-none", filtradas.length > 0);
    $("paginacion").classList.toggle("d-none", filtradas.length <= POR_PAGINA);
    $("pagina").textContent = `Página ${pagina} de ${totalPaginas}`;
    $("anterior").disabled = pagina <= 1;
    $("siguiente").disabled = pagina >= totalPaginas;
    $("resumen").textContent = `${filtradas.length} de ${bebidas.length} bebidas`;
    lista.parentElement.scrollTo({ top: 0 });
}

// ------------------------------------------------------------
// Opciones de los selectores a partir de los datos reales
// ------------------------------------------------------------
function llenarSelect(select, opciones) {
    opciones.forEach(([valor, texto]) => {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        select.appendChild(opcion);
    });
}

function prepararFiltros() {
    const unicos = (campo) => [...new Set(bebidas.map((b) => b[campo]).filter(Boolean))];
    const porTexto = (a, b) => a[1].localeCompare(b[1], "es");

    llenarSelect($("categoria"), unicos("categoria").map((c) => [c, traducir(CATEGORIAS, c)]).sort(porTexto));
    llenarSelect($("alcohol"), unicos("alcohol").map((a) => [a, traducir(TIPOS, a)]).sort(porTexto));

    // Vasos: la API escribe algunos con distintas mayúsculas; se unifican en minúsculas
    const vasos = [...new Set(bebidas.map((b) => b.vaso.toLowerCase()).filter(Boolean))];
    llenarSelect($("vaso"), vasos.map((v) => [v, traducir(VASOS, v)]).sort(porTexto));

    // Ingredientes: solo los que aparecen en varias bebidas (los demás volverían la lista interminable)
    const conteo = new Map();
    bebidas.forEach((b) => new Set(b.ingredientes.map(normalizar)).forEach((i) => conteo.set(i, (conteo.get(i) || 0) + 1)));
    const frecuentes = [...conteo].filter(([, n]) => n >= MIN_BEBIDAS_POR_INGREDIENTE).map(([i]) => i).sort();
    llenarSelect($("ingrediente"), frecuentes.map((i) => [i, i.charAt(0).toUpperCase() + i.slice(1)]));
}

// ------------------------------------------------------------
// Carga inicial
// ------------------------------------------------------------
async function cargar() {
    $("cargando").classList.remove("d-none");
    $("error").classList.add("d-none");

    try {
        const respuesta = await window.api.obtenerBebidas();
        if (!respuesta.ok) throw new Error(respuesta.error);

        bebidas = respuesta.datos.map(normalizarBebida);
        if ($("categoria").options.length === 1) prepararFiltros();
        aplicarFiltros();
    } catch (error) {
        $("mensaje-error").textContent =
            `No se pudo cargar la información (${error.message}). Revisa tu conexión a internet e inténtalo de nuevo.`;
        $("error").classList.remove("d-none");
    } finally {
        $("cargando").classList.add("d-none");
    }
}

// ------------------------------------------------------------
// Eventos
// ------------------------------------------------------------
$("busqueda").addEventListener("input", aplicarFiltros);
["categoria", "alcohol", "vaso", "ingrediente", "orden"].forEach((id) => $(id).addEventListener("change", aplicarFiltros));

$("filtros").addEventListener("submit", (e) => e.preventDefault());
$("limpiar").addEventListener("click", () => { $("filtros").reset(); aplicarFiltros(); });
$("anterior").addEventListener("click", () => { if (pagina > 1) { pagina--; mostrar(); } });
$("siguiente").addEventListener("click", () => { pagina++; mostrar(); });
$("reintentar").addEventListener("click", cargar);

document.addEventListener("DOMContentLoaded", () => {
    if (window.api) $("version").textContent = `Electron v${window.api.versionElectron}`;
    cargar();
});
