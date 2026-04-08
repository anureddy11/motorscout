import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { JsonStore } from "./storage/jsonStore.js";
import { readJsonBody, sendJson, sendText, serveStatic } from "./utils/http.js";
import { generateInventory } from "./services/inventoryService.js";
import { applySearch, computeCoverage, computeSourceHealth, computeStats } from "./services/scoringService.js";

const store = new JsonStore(config.dataDir);

function getSearchPrefs(searchParams) {
  return {
    zip: searchParams.get("zip") || "94016",
    radius: Number(searchParams.get("radius") || 100),
    condition: searchParams.get("condition") || "all",
    inventoryFuel: searchParams.get("inventoryFuel") || "all",
    maxPrice: Number(searchParams.get("maxPrice") || 45000),
    sourceMode: searchParams.get("sourceMode") || "all",
    bodyStyle: searchParams.get("bodyStyle") || "any",
    preferredFuel: searchParams.get("preferredFuel") || "any",
    maxMileage: Number(searchParams.get("maxMileage") || 50000),
    yearFloor: Number(searchParams.get("yearFloor") || 2019),
    fitBias: Number(searchParams.get("fitBias") || 58)
  };
}

async function buildSearchResponse(prefs) {
  const { rows, dealerUniverse, sources } = generateInventory(prefs.zip, prefs.radius);
  const watchlist = await store.read("watchlist.json", []);
  const rankedRows = applySearch(rows, prefs, sources);
  const coverage = computeCoverage(rows, dealerUniverse, prefs, sources);
  const stats = computeStats(rankedRows, watchlist);
  const sourceHealth = computeSourceHealth(rows.filter((car) => car.distance <= prefs.radius), sources);
  const selected = rankedRows[0] || null;

  return {
    generatedAt: new Date().toISOString(),
    prefs,
    dealerUniverse,
    coverage,
    stats,
    sourceHealth,
    results: rankedRows.slice(0, 20),
    selected
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "motorscout",
      timestamp: new Date().toISOString()
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/search") {
    const payload = await buildSearchResponse(getSearchPrefs(url.searchParams));
    sendJson(res, 200, payload);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/saved-searches") {
    sendJson(res, 200, await store.read("saved-searches.json", []));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/saved-searches") {
    const body = await readJsonBody(req);
    const current = await store.read("saved-searches.json", []);
    const next = [{ ...body, id: `search-${Date.now()}` }, ...current].slice(0, 10);
    await store.write("saved-searches.json", next);
    sendJson(res, 201, next);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/watchlist") {
    sendJson(res, 200, await store.read("watchlist.json", []));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/watchlist") {
    const body = await readJsonBody(req);
    const current = await store.read("watchlist.json", []);
    if (!current.find((item) => item.id === body.id)) {
      current.unshift(body);
    }
    const next = current.slice(0, 12);
    await store.write("watchlist.json", next);
    sendJson(res, 201, next);
    return true;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/watchlist/")) {
    const id = url.pathname.split("/").pop();
    const current = await store.read("watchlist.json", []);
    const next = current.filter((item) => item.id !== id);
    await store.write("watchlist.json", next);
    sendJson(res, 200, next);
    return true;
  }

  return false;
}

export function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith("/api/")) {
        const handled = await handleApi(req, res, url);
        if (!handled) {
          sendJson(res, 404, { error: "Not found" });
        }
        return;
      }

      const served = await serveStatic(res, config.publicDir, url.pathname);
      if (!served) {
        sendText(res, 404, "Not found");
      }
    } catch (error) {
      sendJson(res, 500, { error: "Internal server error", detail: error.message });
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(`MotorScout listening on http://${config.host}:${config.port}`);
  });

  return server;
}
