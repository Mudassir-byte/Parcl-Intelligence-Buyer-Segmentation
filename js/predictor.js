/**
 * predictor.js
 * Client-side nearest-centroid classifier. Uses the REAL per-cluster means
 * computed by the trained K-Means model (window.DASHBOARD_DATA.clusters)
 * and the real training-population min/max (window.DASHBOARD_DATA.featureRanges)
 * to normalize a new buyer's inputs the same way the Python pipeline's
 * StandardScaler conceptually does (here: min-max to [0,1] for a simple,
 * dependency-free in-browser distance calculation - not a re-implementation
 * of scikit-learn's exact StandardScaler, which is documented as a known
 * simplification in reports/limitations_and_ethics.md's front-end note).
 */

window.DASHBOARD_PREDICTOR = (function () {
  const { normalize, formatCurrency, formatNumber } = window.DASHBOARD_UTILS;
  const DATA = window.DASHBOARD_DATA;

  const NUMERIC_KEYS = [
    "age",
    "satisfaction_score",
    "recency_months",
    "frequency_transactions",
    "monetary_total_spend",
    "monetary_avg_price_per_sqft",
    "engagement_score",
  ];

  /** Normalizes a raw buyer record's numeric fields into a 0-1 vector. */
  function toVector(record) {
    return NUMERIC_KEYS.map((key) => normalize(record[key], DATA.featureRanges[key]));
  }

  /** Euclidean distance between two equal-length vectors. */
  function distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  /**
   * Classifies a buyer record against the three real cluster centroids.
   * Returns the assigned cluster, distances to all three, and a rough
   * confidence score (not a calibrated probability - just a legible
   * "how much closer is the winner than the runner-up" signal).
   */
  function classify(record) {
    const vector = toVector(record);
    const distances = DATA.clusters.map((c) => distance(vector, toVector(c.means)));
    const minIndex = distances.indexOf(Math.min(...distances));
    const sorted = [...distances].sort((a, b) => a - b);
    const [best, secondBest] = sorted;
    // Confidence: 0 when tied with the runner-up, approaching 1 the further
    // apart they are relative to the runner-up's own distance.
    const confidence = secondBest > 0 ? Math.max(0, Math.min(1, 1 - best / secondBest)) : 1;

    return {
      cluster: DATA.clusters[minIndex],
      clusterIndex: minIndex,
      distances,
      confidence,
      vectorNormalizedPct: vector.map((v) => Math.round(v * 100)),
    };
  }

  return { classify, toVector, NUMERIC_KEYS };
})();
