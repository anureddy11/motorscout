const marketplaceSources = ["AutoTrader", "Cars.com", "CarGurus", "CARFAX", "TrueCar"];
const dealerSources = ["OEM Feed", "Dealer Direct", "Certified Network", "Regional Dealer"];
const bodyStyles = ["SUV", "Sedan", "Truck", "Coupe", "Wagon"];
const fuelTypes = ["Gas", "Hybrid", "EV"];
const seedModels = [
  ["Toyota", "RAV4"], ["Honda", "CR-V"], ["Mazda", "CX-5"], ["Kia", "Telluride"], ["Hyundai", "Ioniq 5"],
  ["Tesla", "Model 3"], ["Tesla", "Model Y"], ["Ford", "F-150"], ["Ford", "Mustang Mach-E"], ["BMW", "330i"],
  ["Audi", "Q5"], ["Lexus", "RX 350"], ["Subaru", "Outback"], ["Chevrolet", "Bolt EUV"], ["Volvo", "XC60"],
  ["Mercedes-Benz", "GLC 300"], ["Acura", "RDX"], ["Nissan", "Rogue"], ["Porsche", "Macan"], ["Genesis", "GV70"]
];

function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seeded(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function normalize(value, min, max) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function generateInventory(zip, radius) {
  const rows = [];
  const zipSeed = hashCode(zip);
  const dealerUniverse = Math.max(18, 12 + Math.round(radius / 7) + Math.round(seeded(zipSeed + 99) * 14));

  for (let i = 0; i < 320; i += 1) {
    const base = zipSeed + i * 91;
    const [make, model] = seedModels[i % seedModels.length];
    const year = 2016 + Math.floor(seeded(base + 2) * 11);
    const bodyStyle = bodyStyles[(i + Math.floor(seeded(base + 5) * 3)) % bodyStyles.length];
    const fuelType = fuelTypes[(i + Math.floor(seeded(base + 8) * 9)) % fuelTypes.length];
    const sourcePool = i % 3 === 0 ? dealerSources : marketplaceSources;
    const source = sourcePool[i % sourcePool.length];
    const condition = year >= 2025 || seeded(base + 11) > 0.73 ? "new" : "used";
    const distance = Math.max(4, Math.round(seeded(base + 13) * Math.max(radius + 80, 150)));
    const mileage = condition === "new" ? Math.round(seeded(base + 17) * 240) : Math.round((2026 - year) * 10800 + seeded(base + 19) * 26000);
    const trim = ["Base", "Premium", "Touring", "Limited", "Sport"][Math.floor(seeded(base + 23) * 5)];
    const fairPrice = Math.round(
      16000 +
      (bodyStyle === "SUV" ? 6000 : 0) +
      (bodyStyle === "Truck" ? 8500 : 0) +
      (fuelType === "EV" ? 5200 : fuelType === "Hybrid" ? 2400 : 0) +
      (2026 - year < 2 ? 17500 : 0) +
      seeded(base + 29) * 9000
    );
    const price = Math.max(13500, fairPrice + Math.round((seeded(base + 31) - 0.55) * 9000));
    const listAgeDays = 2 + Math.round(seeded(base + 37) * 95);
    const priceDrops = Math.round(seeded(base + 41) * 4);
    const dealerRating = Number((3.4 + seeded(base + 43) * 1.6).toFixed(1));
    const owners = condition === "new" ? 0 : 1 + Math.floor(seeded(base + 47) * 3);
    const accidentFree = seeded(base + 53) > 0.16;
    const cpo = condition === "used" && seeded(base + 59) > 0.62;
    const dealDeltaPct = ((fairPrice - price) / fairPrice) * 100;
    const historyDepth = Math.round(55 + seeded(base + 61) * 40);
    const completeness = Math.round(62 + seeded(base + 67) * 35);
    const feedFreshness = Math.round(58 + (1 - normalize(listAgeDays, 20, 95)) * 38);
    const qualityScore = Math.max(38, Math.round(
      completeness * 0.35 +
      historyDepth * 0.2 +
      feedFreshness * 0.22 +
      dealerRating * 11 -
      owners * 5 -
      (accidentFree ? 0 : 12) +
      (cpo ? 6 : 0)
    ));
    const dealScore = Math.max(12, Math.min(99, Math.round(
      58 +
      dealDeltaPct * 2 +
      normalize(listAgeDays, 15, 90) * 10 +
      priceDrops * 4 -
      normalize(distance, 25, Math.max(radius, 100)) * 9 +
      (accidentFree ? 4 : -8)
    )));
    const monthlyEstimate = Math.round(price / 62);

    rows.push({
      id: `car-${zip}-${i + 1}`,
      year,
      make,
      model,
      trim,
      bodyStyle,
      fuelType,
      condition,
      source,
      distance,
      mileage,
      fairPrice,
      price,
      listAgeDays,
      priceDrops,
      dealerRating,
      owners,
      accidentFree,
      cpo,
      dealDeltaPct,
      qualityScore,
      dealScore,
      monthlyEstimate,
      historyDepth,
      completeness,
      feedFreshness
    });
  }

  return {
    rows,
    dealerUniverse,
    sources: {
      marketplaces: marketplaceSources,
      dealers: dealerSources
    }
  };
}
