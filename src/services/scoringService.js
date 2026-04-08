function normalize(value, min, max) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function scoreMatch(car, prefs) {
  let score = 56;
  if (prefs.bodyStyle !== "any") score += car.bodyStyle === prefs.bodyStyle ? 18 : -12;
  if (prefs.preferredFuel !== "any") score += car.fuelType === prefs.preferredFuel ? 16 : -10;
  score += car.price <= prefs.maxPrice ? 12 : -Math.min(28, (car.price - prefs.maxPrice) / 1200);
  score += car.year >= prefs.yearFloor ? 10 : -Math.min(22, (prefs.yearFloor - car.year) * 4);
  score += car.condition === "new" || car.mileage <= prefs.maxMileage ? 10 : -Math.min(24, (car.mileage - prefs.maxMileage) / 6000);
  score += car.accidentFree ? 6 : -12;
  score += car.cpo ? 6 : 0;
  score += normalize(car.dealerRating, 3.4, 5) * 8;
  score -= normalize(car.distance, 30, Math.max(prefs.radius, 120)) * 10;
  return Math.max(0, Math.min(99, Math.round(score)));
}

export function applySearch(rawRows, prefs, sourceSets) {
  const allowSource = prefs.sourceMode === "all"
    ? () => true
    : prefs.sourceMode === "marketplaces"
      ? (source) => sourceSets.marketplaces.includes(source)
      : (source) => sourceSets.dealers.includes(source);

  return rawRows
    .filter((car) => car.distance <= prefs.radius)
    .filter((car) => prefs.condition === "all" ? true : car.condition === prefs.condition)
    .filter((car) => prefs.inventoryFuel === "all" ? true : car.fuelType === prefs.inventoryFuel)
    .filter((car) => allowSource(car.source))
    .map((car) => {
      const matchScore = scoreMatch(car, prefs);
      const fitWeight = prefs.fitBias / 100;
      const totalScore = Math.round(
        car.dealScore * (1 - fitWeight) * 0.72 +
        matchScore * fitWeight * 0.72 +
        car.qualityScore * 0.28
      );
      return { ...car, matchScore, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore || b.dealScore - a.dealScore || a.price - b.price);
}

export function computeCoverage(rawRows, dealerUniverse, prefs, sourceSets) {
  const inRadius = rawRows.filter((car) => car.distance <= prefs.radius);
  const uniqueSources = new Set(inRadius.map((car) => car.source)).size;
  const dealerRows = inRadius.filter((car) => sourceSets.dealers.includes(car.source));
  const dealerCoverage = Math.min(1, dealerRows.length / Math.max(1, dealerUniverse * 3.3));
  const sourceCoverage = uniqueSources / (sourceSets.marketplaces.length + sourceSets.dealers.length);
  const staleListings = inRadius.filter((car) => car.listAgeDays >= 60).length;
  const weakRows = inRadius.filter((car) => car.qualityScore < 65).length;
  const duplicateKeys = new Set(inRadius.map((car) => `${car.year}-${car.make}-${car.model}-${car.trim}-${car.price}`)).size;
  const overlap = inRadius.length ? Math.max(0, 1 - duplicateKeys / inRadius.length) : 0;
  const freshness = 1 - Math.min(1, staleListings / Math.max(1, inRadius.length));
  const quality = 1 - Math.min(1, weakRows / Math.max(1, inRadius.length));
  const score = Math.round(
    sourceCoverage * 28 +
    dealerCoverage * 24 +
    freshness * 18 +
    quality * 16 +
    overlap * 7 +
    Math.min(1, inRadius.length / 120) * 6
  );

  return {
    score: Math.max(0, Math.min(99, score)),
    inRadiusCount: inRadius.length,
    uniqueSources,
    dealerCoverage,
    sourceCoverage,
    staleListings,
    weakRows,
    overlap
  };
}

export function computeStats(rows, watchlist) {
  if (!rows.length) {
    return null;
  }
  const underMarket = rows.filter((car) => car.dealDeltaPct > 0).length;
  return {
    medianPrice: median(rows.map((car) => car.price)),
    underMarketRate: Math.round((underMarket / rows.length) * 100),
    medianAgeDays: Math.round(median(rows.map((car) => car.listAgeDays))),
    evShare: Math.round((rows.filter((car) => car.fuelType === "EV").length / rows.length) * 100),
    watchlistStrength: watchlist.length ? Math.round(median(watchlist.map((car) => car.totalScore || 0))) : 0
  };
}

export function computeSourceHealth(rows, sources) {
  const allSources = [...sources.marketplaces, ...sources.dealers];
  return allSources.map((source) => {
    const sourceRows = rows.filter((car) => car.source === source);
    return {
      source,
      total: sourceRows.length,
      medianAgeDays: Math.round(median(sourceRows.map((car) => car.listAgeDays))),
      medianDeltaPct: Math.round(median(sourceRows.map((car) => car.dealDeltaPct))),
      medianQuality: Math.round(median(sourceRows.map((car) => car.qualityScore)))
    };
  });
}
