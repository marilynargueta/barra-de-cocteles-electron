// ============================================================
// main.js — Proceso principal de Electron
// - Crea la ventana y carga la interfaz HTML.
// - Consulta la API TheCocktailDB (la interfaz le pide los datos
//   a través de preload.js + IPC; el renderizador no tiene Node).
// ============================================================

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const BASE_API = "https://www.thecocktaildb.com/api/json/v1/1/search.php?f=";
const LETRAS = "abcdefghijklmnopqrstuvwxyz0123456789".split(""); // algunos cócteles empiezan con número

const TIMEOUT_MS = 15000;
const MAX_REINTENTOS = 3;
const TANDA = 6;           // peticiones simultáneas (para no saturar la API)
const MAX_FALLAS = 3;      // letras que pueden fallar sin cancelar la carga
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

let cacheBebidas = null; // el catálogo se descarga una sola vez

// ------------------------------------------------------------
// Pide las bebidas que empiezan con una letra (con timeout y reintentos)
// La API devuelve { drinks: [...] } o { drinks: null } si no hay ninguna.
// ------------------------------------------------------------
async function descargarLetra(letra) {
    let ultimoError;

    for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
        try {
            const respuesta = await fetch(BASE_API + letra, { signal: AbortSignal.timeout(TIMEOUT_MS) });
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

            const datos = await respuesta.json();
            if (!datos || typeof datos !== "object" || !("drinks" in datos)) {
                throw new Error("la API devolvió un formato inesperado");
            }
            return Array.isArray(datos.drinks) ? datos.drinks : [];
        } catch (error) {
            ultimoError = error.name === "TimeoutError" ? new Error("la API tardó demasiado") : error;
            if (intento < MAX_REINTENTOS - 1) await esperar(700 * 2 ** intento);
        }
    }
    throw ultimoError;
}

async function descargarBebidas() {
    const bebidas = new Map(); // idDrink -> bebida (evita duplicados)
    let fallas = 0;
    let ultimoError;

    for (let i = 0; i < LETRAS.length; i += TANDA) {
        const resultados = await Promise.allSettled(LETRAS.slice(i, i + TANDA).map(descargarLetra));
        for (const r of resultados) {
            if (r.status === "fulfilled") r.value.forEach((drink) => bebidas.set(drink.idDrink, drink));
            else { fallas++; ultimoError = r.reason; }
        }
        if (fallas > MAX_FALLAS) break;
    }

    if (bebidas.size === 0 || fallas > MAX_FALLAS) {
        throw ultimoError || new Error("la API no devolvió bebidas");
    }
    return [...bebidas.values()];
}

// Canal IPC: la interfaz llama a "bebidas:obtener" y recibe { ok, datos } o { ok, error }
ipcMain.handle("bebidas:obtener", async () => {
    try {
        if (!cacheBebidas) cacheBebidas = await descargarBebidas();
        return { ok: true, datos: cacheBebidas };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});

function crearVentana() {
    const ventana = new BrowserWindow({
        width: 1200,
        height: 780,
        minWidth: 820,
        minHeight: 560,
        title: "Barra de Cócteles",
        icon: path.join(__dirname, "assets", "icon.png"),
        backgroundColor: "#f2eff7",
        webPreferences: {
            // Buenas prácticas de seguridad de Electron
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    ventana.setMenuBarVisibility(false);

    // La interfaz no puede abrir ventanas nuevas ni navegar fuera de la app
    ventana.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    ventana.webContents.on("will-navigate", (evento) => evento.preventDefault());

    // Carga el HTML desde el disco (sin servidor web local)
    ventana.loadFile(path.join(__dirname, "src", "index.html"));
}

app.whenReady().then(() => {
    crearVentana();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
