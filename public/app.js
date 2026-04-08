const state = {
  search: null,
  savedSearches: [],
  watchlist: [],
  selectedId: null
};

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function pct(value) {
  return `${Math.round(value)}%`;
}

function signed(value, suffix = "") {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}${suffix}`;
}

function getPrefs() {
  return {
    zip: document.getElementById("zipInput").value.trim() || "94016",
    radius: document.getElementById("radiusInput").value,
    condition: document.getElementById("conditionInput").value,
    inventoryFuel: document.getElementById("inventoryFuelInput").value,
    maxPrice: document.getElementById("maxPriceInput").value,
    sourceMode: document.getElementById("sourceInput").value,
    bodyStyle: document.getElementById("bodyStyleInput").value,
    preferredFuel: document.getElementById("fuelInput").value,
    maxMileage: document.getElementById("maxMileageInput").value,
    yearFloor: document.getElementById("ageInput").value,
    fitBias: document.getElementById("fitBiasInput").value
  };
}

function explain(car, prefs) {
  const reasons = [];
  if (car.dealDeltaPct >= 8) reasons.push(`priced ${Math.round(car.dealDeltaPct)}% below fair value`);
  else if (car.dealDeltaPct >= 3) reasons.push("slightly below market");
  if (car.price <= Number(prefs.maxPrice)) reasons.push("inside budget");
  if (prefs.bodyStyle !== "any" && car.bodyStyle === prefs.bodyStyle) reasons.push("preferred body style");
  if (prefs.preferredFuel !== "any" && car.fuelType === prefs.preferredFuel) reasons.push("preferred fuel type");
  if (car.cpo) reasons.push("certified used coverage");
  if (car.listAgeDays >= 45) reasons.push("aged listing may be negotiable");
  if (!car.accidentFree) reasons.push("history flag lowers confidence");
  return reasons.slice(0, 4);
}

function fuelGradient(fuel) {
  if (fuel === "EV") return "linear-gradient(135deg, rgba(44,112,152,0.42), rgba(190,220,244,0.18))";
  if (fuel === "Hybrid") return "linear-gradient(135deg, rgba(31,87,78,0.42), rgba(195,229,203,0.18))";
  return "linear-gradient(135deg, rgba(182,82,40,0.38), rgba(244,198,170,0.18))";
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadSavedSearches() {
  state.savedSearches = await fetchJson("/api/saved-searches");
}

async function loadWatchlist() {
  state.watchlist = await fetchJson("/api/watchlist");
}

async function runSearch() {
  const params = new URLSearchParams(getPrefs());
  state.search = await fetchJson(`/api/search?${params.toString()}`);
  state.selectedId = state.search.results[0] ? state.search.results[0].id : null;
  renderAll();
}

function selectedCar() {
  return state.search?.results.find((car) => car.id === state.selectedId) || null;
}

function renderCoverage() {
  const coverage = state.search.coverage;
  const tone = coverage.score >= 82 ? "High confidence" : coverage.score >= 65 ? "Good but incomplete" : "Needs broader capture";
  document.getElementById("coverageScore").innerHTML = `
    <div class="score-top">
      <div>
        <div class="small">Inventory confidence</div>
        <div class="score-number">${coverage.score}</div>
      </div>
      <div class="small">${tone}. ${coverage.uniqueSources} sources and an estimated ${pct(coverage.dealerCoverage * 100)} dealer capture inside the radius.</div>
    </div>
    <div class="meter"><span style="width:${coverage.score}%"></span></div>
    <div class="mini-grid">
      <div class="mini"><small>Source Coverage</small><strong>${pct(coverage.sourceCoverage * 100)}</strong></div>
      <div class="mini"><small>Dealer Capture</small><strong>${pct(coverage.dealerCoverage * 100)}</strong></div>
      <div class="mini"><small>Stale Records</small><strong>${number(coverage.staleListings)}</strong></div>
      <div class="mini"><small>Weak Records</small><strong>${number(coverage.weakRows)}</strong></div>
    </div>
  `;
}

function renderInsights() {
  const top = state.search.results[0];
  const prefs = state.search.prefs;
  const items = state.search.results;
  document.getElementById("insightList").innerHTML = `
    <div class="feed">Best current opportunity is the ${top.year} ${top.make} ${top.model} with ${top.totalScore} overall, ${top.dealScore} deal, and ${top.matchScore} match.</div>
    <div class="feed">Coverage confidence is ${state.search.coverage.score}/99. The app checks whether the radius is actually covered instead of assuming visible listings are complete.</div>
    <div class="feed">${number(items.filter((car) => car.listAgeDays >= 45).length)} listings are aged 45+ days. Those are the best negotiation targets.</div>
    <div class="feed">${number(items.filter((car) => car.price > Number(prefs.maxPrice)).length)} listings exceed the stated budget, which helps the ranking model show tradeoffs instead of hard-hiding them.</div>
  `;
}

function renderSummary() {
  const { prefs, stats, coverage, results, generatedAt } = state.search;
  const fitLabel = Number(prefs.fitBias) <= 33 ? "Deal-first" : Number(prefs.fitBias) >= 67 ? "Preference-first" : "Balanced";
  document.getElementById("fitBiasLabel").textContent = fitLabel;
  document.getElementById("snapshotStamp").textContent = `ZIP ${prefs.zip} · ${new Date(generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  document.getElementById("resultBadge").textContent = `${number(results.length)} active listings`;
  document.getElementById("summaryText").textContent = `MotorScout is ranking inventory inside ${prefs.radius} miles of ${prefs.zip} by blending deal economics, buyer fit, and tracking confidence.`;
  document.getElementById("summaryChips").innerHTML = `
    <span class="pill">${prefs.radius} mile radius</span>
    <span class="pill">${prefs.condition === "all" ? "new + used" : prefs.condition}</span>
    <span class="pill">${prefs.inventoryFuel === "all" ? "all fuels" : `${prefs.inventoryFuel.toLowerCase()} only`}</span>
    <span class="pill">${fitLabel}</span>
    <span class="pill ${coverage.score < 65 ? "warn" : ""}">tracking ${coverage.score}/99</span>
  `;
  document.getElementById("statsGrid").innerHTML = stats ? `
    <div class="stat"><small>Median Ask</small><strong>${currency(stats.medianPrice)}</strong></div>
    <div class="stat"><small>Under Market</small><strong>${pct(stats.underMarketRate)}</strong></div>
    <div class="stat"><small>Median Age</small><strong>${number(stats.medianAgeDays)} days</strong></div>
    <div class="stat"><small>EV Share</small><strong>${pct(stats.evShare)}</strong></div>
    <div class="stat"><small>Watchlist Strength</small><strong>${number(stats.watchlistStrength)}</strong></div>
  ` : `<div class="empty">No listings match the current setup.</div>`;
}

function bindResultActions() {
  document.querySelectorAll(".result").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (event.target.classList.contains("add-watch")) return;
      state.selectedId = node.dataset.id;
      renderDetail();
      document.querySelectorAll(".result").forEach((row) => row.classList.remove("active"));
      node.classList.add("active");
    });
  });

  document.querySelectorAll(".add-watch").forEach((node) => {
    node.addEventListener("click", async (event) => {
      event.stopPropagation();
      const car = state.search.results.find((row) => row.id === node.dataset.id);
      state.watchlist = await fetchJson("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(car)
      });
      renderWatchlist();
    });
  });
}

function renderResults() {
  const prefs = state.search.prefs;
  document.getElementById("resultsList").innerHTML = state.search.results.map((car, index) => `
    <article class="result ${car.id === state.selectedId ? "active" : ""}" data-id="${car.id}">
      <div class="result-head">
        <div>
          <div class="kicker">Rank #${index + 1}</div>
          <h3>${car.year} ${car.make} ${car.model} ${car.trim}</h3>
          <div class="actions">
            <span class="chip">${car.source}</span>
            <span class="chip">${car.distance} mi away</span>
            <span class="chip">${car.bodyStyle}</span>
            <span class="chip">${car.fuelType}</span>
          </div>
        </div>
        <div class="actions">
          <div class="score-pill"><strong>${car.totalScore}</strong><span>Overall</span></div>
          <div class="score-pill"><strong>${car.dealScore}</strong><span>Deal</span></div>
        </div>
      </div>
      <div class="detail-stats">
        <div class="detail"><small>Ask</small><strong>${currency(car.price)}</strong></div>
        <div class="detail"><small>Fair</small><strong>${currency(car.fairPrice)}</strong></div>
        <div class="detail"><small>Delta</small><strong>${signed(car.dealDeltaPct, "%")}</strong></div>
        <div class="detail"><small>Quality</small><strong>${car.qualityScore}</strong></div>
      </div>
      <div class="actions">
        ${explain(car, prefs).map((reason) => `<span class="pill ${reason.includes("history") ? "bad" : reason.includes("aged") ? "warn" : ""}">${reason}</span>`).join("")}
      </div>
      <div class="stack-actions">
        <button class="btn add-watch" data-id="${car.id}" type="button">Add to shortlist</button>
      </div>
    </article>
  `).join("");
  bindResultActions();
}

function renderDetail() {
  const car = selectedCar();
  if (!car) {
    document.getElementById("detailPanel").innerHTML = `<div class="empty">Select a listing to inspect its economics and risk profile.</div>`;
    return;
  }
  const risks = [];
  if (!car.accidentFree) risks.push("History report flag. This needs direct verification before action.");
  if (car.owners >= 3) risks.push("High owner count can weaken resale confidence.");
  if (car.listAgeDays >= 60) risks.push("Long time on market can mean negotiable price or low demand.");
  if (car.qualityScore < 65) risks.push("Record quality is weaker than the launch standard.");
  if (!risks.length) risks.push("No obvious red flags beyond standard used-car diligence.");
  document.getElementById("detailCaption").textContent = `${car.year} ${car.make} ${car.model} is selected because it ranks strongly on both value and fit.`;
  document.getElementById("detailPanel").innerHTML = `
    <div class="hero-card" style="background:${fuelGradient(car.fuelType)}"></div>
    <div class="feed-list">
      <div class="detail">
        <small>Selected Vehicle</small>
        <strong>${car.year} ${car.make} ${car.model} ${car.trim}</strong>
        <p class="small">${car.condition} ${car.bodyStyle.toLowerCase()} from ${car.source}, ${car.distance} miles away, rated ${car.dealerRating}/5 by dealer quality.</p>
      </div>
      <div class="detail-stats">
        <div class="detail"><small>Ask</small><strong>${currency(car.price)}</strong></div>
        <div class="detail"><small>Fair Value</small><strong>${currency(car.fairPrice)}</strong></div>
        <div class="detail"><small>Monthly</small><strong>${currency(car.monthlyEstimate)}/mo</strong></div>
        <div class="detail"><small>Drops</small><strong>${car.priceDrops}</strong></div>
      </div>
      <div class="feed"><strong>Inventory confidence</strong><p class="small">Record completeness ${car.completeness}/100, history depth ${car.historyDepth}/100, feed freshness ${car.feedFreshness}/100, overall quality ${car.qualityScore}/100.</p></div>
      <div class="feed"><strong>Watch-outs</strong><p class="small">${risks.join(" ")}</p></div>
    </div>
  `;
}

function renderOps() {
  document.getElementById("opsGrid").innerHTML = `
    <div class="ops"><small>Dealer Universe</small><strong>${number(state.search.dealerUniverse)}</strong><p class="small">Estimated dealers and OEM points inside this radius.</p></div>
    <div class="ops"><small>Rows In Radius</small><strong>${number(state.search.coverage.inRadiusCount)}</strong><p class="small">Listings still active after geographic scope is applied.</p></div>
    <div class="ops"><small>Duplicate Overlap</small><strong>${pct(state.search.coverage.overlap * 100)}</strong><p class="small">Cross-channel listing overlap that reconciliation needs to handle.</p></div>
  `;
  document.getElementById("pipelineGrid").innerHTML = `
    <div class="pipeline"><small>Dealer/OEM Feeds</small><strong>Step 1</strong><p class="small">Capture direct dealer and OEM inventory within the radius.</p></div>
    <div class="pipeline"><small>Marketplace Feeds</small><strong>Step 2</strong><p class="small">Add public listing channels to catch leakage and off-network supply.</p></div>
    <div class="pipeline"><small>Deduplication</small><strong>Step 3</strong><p class="small">Merge VIN-first, fuzzy fallback on year, trim, miles, price, and timing.</p></div>
    <div class="pipeline"><small>Snapshot History</small><strong>Step 4</strong><p class="small">Track first seen, last seen, price movement, disappearance, and stale-feed risk.</p></div>
  `;
  document.getElementById("sourceList").innerHTML = state.search.sourceHealth.map((row) => `
    <div class="feed">
      <strong>${row.source}</strong>
      <p class="small">${number(row.total)} in-radius rows. Median age ${number(row.medianAgeDays)} days. Median price delta ${signed(row.medianDeltaPct, "%")}. Median record quality ${number(row.medianQuality)}/100.</p>
    </div>
  `).join("");
}

function renderSavedSearches() {
  const box = document.getElementById("searchList");
  if (!state.savedSearches.length) {
    box.innerHTML = `<div class="empty">No saved searches yet. Save a market setup from the left rail.</div>`;
    return;
  }
  box.innerHTML = state.savedSearches.map((item) => `
    <div class="saved-search">
      <strong>${item.name}</strong>
      <p class="small">${item.summary}</p>
    </div>
  `).join("");
}

function renderWatchlist() {
  const box = document.getElementById("watchList");
  if (!state.watchlist.length) {
    box.innerHTML = `<div class="empty">Shortlist is empty. Add ranked cars from Market View.</div>`;
    return;
  }
  box.innerHTML = state.watchlist.map((car) => `
    <div class="watch-item">
      <div class="watch-head">
        <div>
          <strong>${car.year} ${car.make} ${car.model}</strong>
          <p class="small">${currency(car.price)} · ${car.distance} mi · ${car.source}</p>
        </div>
        <div class="actions">
          <span class="pill">score ${car.totalScore}</span>
          <button class="btn remove-watch" data-id="${car.id}" type="button">Remove</button>
        </div>
      </div>
    </div>
  `).join("");
  document.querySelectorAll(".remove-watch").forEach((node) => {
    node.addEventListener("click", async () => {
      state.watchlist = await fetchJson(`/api/watchlist/${node.dataset.id}`, { method: "DELETE" });
      renderWatchlist();
    });
  });
}

function renderAll() {
  if (!state.search) return;
  renderCoverage();
  renderInsights();
  renderSummary();
  renderResults();
  renderDetail();
  renderOps();
  renderSavedSearches();
  renderWatchlist();
}

async function saveSearch() {
  const prefs = getPrefs();
  state.savedSearches = await fetchJson("/api/saved-searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Search ${prefs.zip} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      summary: `${prefs.zip} · ${prefs.radius} miles · ${prefs.inventoryFuel === "all" ? "all fuels" : prefs.inventoryFuel} · budget ${currency(Number(prefs.maxPrice))}`
    })
  });
  renderSavedSearches();
}

function resetFilters() {
  document.getElementById("zipInput").value = "94016";
  document.getElementById("radiusInput").value = "100";
  document.getElementById("conditionInput").value = "all";
  document.getElementById("inventoryFuelInput").value = "all";
  document.getElementById("maxPriceInput").value = "45000";
  document.getElementById("sourceInput").value = "all";
  document.getElementById("bodyStyleInput").value = "any";
  document.getElementById("fuelInput").value = "any";
  document.getElementById("maxMileageInput").value = "50000";
  document.getElementById("ageInput").value = "2019";
  document.getElementById("fitBiasInput").value = "58";
}

function bindTabs() {
  document.querySelectorAll(".nav button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav button").forEach((node) => node.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });
}

function bindControls() {
  document.getElementById("refreshButton").addEventListener("click", runSearch);
  document.getElementById("saveSearchButton").addEventListener("click", saveSearch);
  document.getElementById("resetButton").addEventListener("click", async () => {
    resetFilters();
    await runSearch();
  });

  ["radiusInput", "conditionInput", "inventoryFuelInput", "maxPriceInput", "sourceInput", "bodyStyleInput", "fuelInput", "maxMileageInput", "ageInput", "fitBiasInput"]
    .forEach((id) => {
      document.getElementById(id).addEventListener("change", runSearch);
      document.getElementById(id).addEventListener("input", (event) => {
        if (event.target.id === "fitBiasInput") {
          const value = Number(event.target.value);
          document.getElementById("fitBiasLabel").textContent = value <= 33 ? "Deal-first" : value >= 67 ? "Preference-first" : "Balanced";
        }
      });
    });

  document.getElementById("zipInput").addEventListener("change", runSearch);
}

async function bootstrap() {
  bindTabs();
  bindControls();
  await Promise.all([loadSavedSearches(), loadWatchlist(), runSearch()]);
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="app"><section class="panel main"><div class="card empty">MotorScout failed to load: ${error.message}</div></section></main>`;
});
