/**
 * charts.js
 * Initializes every Chart.js chart on the page from window.DASHBOARD_DATA.
 * Chart instances are kept in DASHBOARD_CHARTS so main.js can update their
 * color options when the theme toggle fires, and so predictor.js can push
 * a live point onto the radar chart.
 */

window.DASHBOARD_CHARTS = {};

(function () {
  const { cssVar, formatNumber, formatCurrency } = window.DASHBOARD_UTILS;
  const DATA = window.DASHBOARD_DATA;

  /** Shared Chart.js theme derived from the current CSS custom properties. */
  function chartTheme() {
    return {
      text: cssVar("--c-text-muted"),
      grid: cssVar("--c-border"),
      font: getComputedStyle(document.body).fontFamily,
      cluster: [cssVar("--c-cluster-0"), cssVar("--c-cluster-1"), cssVar("--c-cluster-2")],
      brand: cssVar("--c-brand"),
      accent: cssVar("--c-accent"),
      panel: cssVar("--c-panel"),
    };
  }

  Chart.defaults.color = chartTheme().text;
  Chart.defaults.borderColor = chartTheme().grid;
  Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;

  /* ---------------------------------------------------------------------
   * 1) Elbow + silhouette combo chart
   * ------------------------------------------------------------------- */
  function initElbowChart() {
    const ctx = document.getElementById("chart-elbow");
    const theme = chartTheme();
    const ks = DATA.kEvaluations.map((e) => `k=${e.k}`);
    const chosenIndex = DATA.kEvaluations.findIndex((e) => e.k === DATA.meta.chosenK);

    DASHBOARD_CHARTS.elbow = new Chart(ctx, {
      type: "line",
      data: {
        labels: ks,
        datasets: [
          {
            label: "Silhouette score",
            data: DATA.kEvaluations.map((e) => e.silhouette),
            borderColor: theme.accent,
            backgroundColor: theme.accent,
            pointRadius: DATA.kEvaluations.map((_, i) => (i === chosenIndex ? 6 : 3)),
            pointBackgroundColor: DATA.kEvaluations.map((_, i) => (i === chosenIndex ? theme.brand : theme.accent)),
            tension: 0.3,
            yAxisID: "y",
          },
          {
            label: "Inertia",
            data: DATA.kEvaluations.map((e) => e.inertia),
            borderColor: theme.grid,
            backgroundColor: theme.grid,
            borderDash: [4, 4],
            pointRadius: 2,
            tension: 0.3,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (item) =>
                item.dataset.label === "Inertia"
                  ? `Inertia: ${formatNumber(item.raw, 0)}`
                  : `Silhouette: ${item.raw.toFixed(3)}${item.dataIndex === chosenIndex ? "  (selected k)" : ""}`,
            },
          },
        },
        scales: {
          y: { position: "left", title: { display: true, text: "Silhouette score" }, grid: { color: theme.grid } },
          y1: { position: "right", title: { display: true, text: "Inertia" }, grid: { display: false } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /* ---------------------------------------------------------------------
   * 2) Cluster size doughnut
   * ------------------------------------------------------------------- */
  function initClusterSizeChart() {
    const ctx = document.getElementById("chart-cluster-sizes");
    const theme = chartTheme();

    DASHBOARD_CHARTS.clusterSizes = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: DATA.clusters.map((c) => c.name),
        datasets: [
          {
            data: DATA.clusters.map((c) => c.n),
            backgroundColor: theme.cluster,
            borderColor: theme.panel,
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => {
                const c = DATA.clusters[item.dataIndex];
                return ` ${c.name}: ${formatNumber(c.n)} clients (${(c.share * 100).toFixed(1)}%)`;
              },
            },
          },
        },
      },
    });

    const legendEl = document.querySelector("[data-cluster-legend]");
    if (legendEl) {
      legendEl.innerHTML = DATA.clusters
        .map(
          (c, i) =>
            `<span class="legend-item"><span class="legend-swatch" style="background:${theme.cluster[i]}"></span>${c.name} (${(c.share * 100).toFixed(1)}%)</span>`
        )
        .join("");
    }
  }

  /* ---------------------------------------------------------------------
   * 3) Cluster profile radar (normalized 0-100 per metric)
   * ------------------------------------------------------------------- */
  const RADAR_METRICS = [
    { key: "age", label: "Age" },
    { key: "satisfaction_score", label: "Satisfaction" },
    { key: "recency_months", label: "Recency", invert: true }, // lower months = more recent = "better"
    { key: "frequency_transactions", label: "Frequency" },
    { key: "monetary_total_spend", label: "Total spend" },
    { key: "monetary_avg_price_per_sqft", label: "Price/sqft" },
    { key: "engagement_score", label: "Engagement" },
  ];

  function normalizedRadarValues(cluster) {
    return RADAR_METRICS.map(({ key, invert }) => {
      const range = DATA.featureRanges[key];
      let n = window.DASHBOARD_UTILS.normalize(cluster.means[key], range);
      if (invert) n = 1 - n;
      return Math.round(n * 100);
    });
  }

  function initRadarChart() {
    const ctx = document.getElementById("chart-radar");
    const theme = chartTheme();

    DASHBOARD_CHARTS.radar = new Chart(ctx, {
      type: "radar",
      data: {
        labels: RADAR_METRICS.map((m) => m.label),
        datasets: DATA.clusters.map((c, i) => ({
          label: c.name,
          data: normalizedRadarValues(c),
          borderColor: theme.cluster[i],
          backgroundColor: theme.cluster[i] + "22",
          pointBackgroundColor: theme.cluster[i],
          borderWidth: 2,
          pointRadius: 3,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (item) => {
                const cluster = DATA.clusters[item.datasetIndex];
                const metric = RADAR_METRICS[item.dataIndex];
                const raw = cluster.means[metric.key];
                const display = metric.key.includes("spend")
                  ? formatCurrency(raw)
                  : metric.key.includes("price")
                  ? `$${raw.toFixed(0)}`
                  : raw.toFixed(1);
                return ` ${cluster.name} - ${metric.label}: ${display}`;
              },
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { color: theme.grid },
            angleLines: { color: theme.grid },
            pointLabels: { font: { size: 11 } },
          },
        },
      },
    });
  }

  /* ---------------------------------------------------------------------
   * 4) Monthly transactions / revenue line chart (tab-switchable)
   * ------------------------------------------------------------------- */
  function initMonthlyChart() {
    const ctx = document.getElementById("chart-monthly");
    const theme = chartTheme();

    DASHBOARD_CHARTS.monthly = new Chart(ctx, {
      type: "line",
      data: {
        labels: DATA.monthlyTransactions.map((m) => m.month),
        datasets: [
          {
            label: "Transactions",
            data: DATA.monthlyTransactions.map((m) => m.transactions),
            borderColor: theme.brand,
            backgroundColor: theme.brand + "22",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (item) => ` ${formatNumber(item.raw)} transactions`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: theme.grid } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        },
      },
    });
  }

  /** Switches the monthly chart between transaction count and revenue. */
  function setMonthlyMetric(metric) {
    const chart = DASHBOARD_CHARTS.monthly;
    const theme = chartTheme();
    const isRevenue = metric === "revenue";
    chart.data.datasets[0].label = isRevenue ? "Revenue" : "Transactions";
    chart.data.datasets[0].data = DATA.monthlyTransactions.map((m) => (isRevenue ? m.revenue : m.transactions));
    chart.data.datasets[0].borderColor = isRevenue ? theme.accent : theme.brand;
    chart.data.datasets[0].backgroundColor = (isRevenue ? theme.accent : theme.brand) + "22";
    chart.options.plugins.tooltip.callbacks.label = (item) =>
      isRevenue ? ` ${formatCurrency(item.raw)}` : ` ${formatNumber(item.raw)} transactions`;
    chart.update();

    const caption = document.querySelector("[data-monthly-caption]");
    if (caption) {
      caption.innerHTML = isRevenue
        ? "Monthly sold-transaction revenue, Jan 2024-Dec 2025 (sum of sale_price). Same data-cutoff caveat applies to the 2025 decline - see <a href=\"#notices\">Notices</a>."
        : "Monthly sold-transaction count, Jan 2024-Dec 2025. The later months trend lower partly because more recent listings hadn't sold as of the model's reference date (Jan 2026) - treat the 2025 dip as partially a data-cutoff effect, not necessarily a demand decline. See <a href=\"#notices\">Notices</a>.";
    }
  }

  /* ---------------------------------------------------------------------
   * 5) Country x cluster stacked horizontal bar
   * ------------------------------------------------------------------- */
  function initCountryChart() {
    const ctx = document.getElementById("chart-country");
    const theme = chartTheme();
    const countries = Object.keys(DATA.clusterByCountry).sort(
      (a, b) => DATA.countryCounts[b] - DATA.countryCounts[a]
    );

    DASHBOARD_CHARTS.country = new Chart(ctx, {
      type: "bar",
      data: {
        labels: countries,
        datasets: DATA.clusters.map((c, i) => ({
          label: c.name,
          data: countries.map((country) => DATA.clusterByCountry[country][i]),
          backgroundColor: theme.cluster[i],
        })),
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { stacked: true, grid: { color: theme.grid } },
          y: { stacked: true, grid: { display: false } },
        },
      },
    });
  }

  /* ---------------------------------------------------------------------
   * 6) Satisfaction distribution bar
   * ------------------------------------------------------------------- */
  function initSatisfactionChart() {
    const ctx = document.getElementById("chart-satisfaction");
    const theme = chartTheme();
    const scores = Object.keys(DATA.satisfactionDistribution);

    DASHBOARD_CHARTS.satisfaction = new Chart(ctx, {
      type: "bar",
      data: {
        labels: scores.map((s) => `${s} star${s === "1" ? "" : "s"}`),
        datasets: [
          {
            data: scores.map((s) => DATA.satisfactionDistribution[s]),
            backgroundColor: [theme.cluster[1], theme.cluster[1], theme.grid, theme.cluster[2], theme.cluster[2]],
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: (item) => ` ${formatNumber(item.raw)} clients` } } },
        scales: {
          y: { beginAtZero: true, grid: { color: theme.grid } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /** Re-applies current CSS theme colors to every chart (called on theme toggle). */
  function refreshChartTheme() {
    const theme = chartTheme();
    Chart.defaults.color = theme.text;
    Chart.defaults.borderColor = theme.grid;

    if (DASHBOARD_CHARTS.elbow) {
      DASHBOARD_CHARTS.elbow.data.datasets[1].borderColor = theme.grid;
      DASHBOARD_CHARTS.elbow.data.datasets[1].backgroundColor = theme.grid;
      DASHBOARD_CHARTS.elbow.update();
    }
    if (DASHBOARD_CHARTS.clusterSizes) {
      DASHBOARD_CHARTS.clusterSizes.data.datasets[0].borderColor = theme.panel;
      DASHBOARD_CHARTS.clusterSizes.update();
    }
    Object.values(DASHBOARD_CHARTS).forEach((chart) => chart.update());
  }

  function initAllCharts() {
    initElbowChart();
    initClusterSizeChart();
    initRadarChart();
    initMonthlyChart();
    initCountryChart();
    initSatisfactionChart();
  }

  /**
   * Adds or updates a fourth "This buyer" dataset on the radar chart so a
   * predicted buyer can be visually compared against the three real
   * cluster shapes. Called by predictor.js after a classification.
   */
  function setPredictorOverlay(normalizedValues, color) {
    const chart = DASHBOARD_CHARTS.radar;
    if (!chart) return;
    const overlay = {
      label: "This buyer",
      data: normalizedValues,
      borderColor: color,
      backgroundColor: color + "33",
      borderWidth: 2.5,
      borderDash: [5, 3],
      pointBackgroundColor: color,
      pointRadius: 4,
    };
    if (chart.data.datasets.length === 4) {
      chart.data.datasets[3] = overlay;
    } else {
      chart.data.datasets.push(overlay);
    }
    chart.update();
  }

  window.DASHBOARD_CHARTS_API = {
    initAllCharts,
    setMonthlyMetric,
    refreshChartTheme,
    normalizedRadarValues,
    setPredictorOverlay,
    RADAR_METRICS,
  };
})();
