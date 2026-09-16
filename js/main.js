/**
 * main.js
 * Wires up navigation, theme toggling, the cluster explorer, trend tabs,
 * KPI counters, and the predictor form. Runs after data.js, utils.js,
 * charts.js, and predictor.js have all loaded.
 */

(function () {
  const DATA = window.DASHBOARD_DATA;
  const { formatCurrency, formatNumber, cssVar, debounce } = window.DASHBOARD_UTILS;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    populateMetaBadges();
    renderClusterExplorer();
    setupThemeToggle();
    setupMobileNav();
    setupSectionNav();
    setupTrendTabs();
    setupPredictorForm();

    window.DASHBOARD_CHARTS_API.initAllCharts();
    runCounterAnimations();

    // Trigger the single page-load animation sequence, then remove the
    // class so it never re-fires (e.g. on a later DOM mutation).
    requestAnimationFrame(() => {
      document.body.classList.add("js-load");
      setTimeout(() => document.body.classList.remove("js-load"), 1200);
    });
  }

  /* ----------------------------------------------------------------- */
  function populateMetaBadges() {
    document.querySelectorAll("[data-model-version]").forEach((el) => (el.textContent = DATA.meta.modelVersion));
    document.querySelectorAll("[data-chosen-k]").forEach((el) => (el.textContent = DATA.meta.chosenK));
  }

  function runCounterAnimations() {
    document.querySelectorAll("[data-counter]").forEach((el) => {
      const target = Number(el.dataset.target);
      window.DASHBOARD_UTILS.animateCounter(el, target);
    });
  }

  /* ----------------------------------------------------------------- */
  /* Cluster explorer: builds the accordion cards from real cluster data */
  function renderClusterExplorer() {
    const container = document.querySelector("[data-cluster-explorer]");
    if (!container) return;

    container.innerHTML = DATA.clusters
      .map(
        (c) => `
      <div class="cluster-card" data-open="false" style="--cluster-color:${c.color}">
        <button class="cluster-card-header" data-cluster-toggle aria-expanded="false">
          <span class="cluster-card-title">
            <span class="name">${c.name}</span>
            <span class="share">${formatNumber(c.n)} clients &middot; ${(c.share * 100).toFixed(1)}% of base</span>
          </span>
          <svg class="cluster-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div class="cluster-card-body">
          <div class="cluster-card-body-inner">
            <div class="cluster-card-content">
              <div><dt>Demographic</dt><dd>${c.demographic}</dd></div>
              <div><dt>Financial</dt><dd>${c.financial}</dd></div>
              <div><dt>Behavioral</dt><dd>${c.behavioral}</dd></div>
              <div><dt>Property preference</dt><dd>${c.propertyPreference}</dd></div>
              <div class="full-width"><dt>Risk / investment profile</dt><dd>${c.riskProfile}</dd></div>
              <div class="full-width">
                <dt>Recommended actions</dt>
                <dd><ul>${c.actions.map((a) => `<li>${a}</li>`).join("")}</ul></dd>
              </div>
              <div class="full-width">
                <p class="limitation-note">${c.limitations}</p>
              </div>
            </div>
          </div>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll("[data-cluster-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".cluster-card");
        const isOpen = card.dataset.open === "true";
        card.dataset.open = String(!isOpen);
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  /* ----------------------------------------------------------------- */
  /* Theme toggle - persists choice in localStorage, falls back to the
     visitor's OS preference on first visit. */
  function setupThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    const root = document.documentElement;
    const stored = safeGet("parcl-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const initial = stored || (prefersLight ? "light" : "dark");
    applyTheme(initial);

    toggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      safeSet("parcl-theme", next);
    });

    function applyTheme(theme) {
      if (theme === "light") {
        root.setAttribute("data-theme", "light");
      } else {
        root.removeAttribute("data-theme");
      }
      toggle.setAttribute("aria-pressed", String(theme === "light"));
      // Charts are drawn to <canvas> so their colors don't update via CSS
      // alone - re-read the custom properties and push them into Chart.js.
      if (window.DASHBOARD_CHARTS_API) window.DASHBOARD_CHARTS_API.refreshChartTheme();
    }
  }

  // localStorage can throw in some privacy modes - fail quietly rather
  // than breaking the whole dashboard over a theme preference.
  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* ignore */
    }
  }

  /* ----------------------------------------------------------------- */
  /* Mobile off-canvas navigation */
  function setupMobileNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const scrim = document.querySelector("[data-nav-scrim]");
    if (!toggle) return;

    function close() {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    function open() {
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", () => {
      document.body.classList.contains("nav-open") ? close() : open();
    });
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    document.querySelectorAll("[data-nav-link]").forEach((link) => link.addEventListener("click", close));
  }

  /* ----------------------------------------------------------------- */
  /* Section-aware nav highlighting + topbar title, via IntersectionObserver */
  function setupSectionNav() {
    const sections = document.querySelectorAll(".section[id]");
    const navLinks = document.querySelectorAll("[data-nav-link]");
    const topbarTitle = document.querySelector("[data-topbar-title]");
    const linkBySection = new Map();
    navLinks.forEach((link) => linkBySection.set(link.getAttribute("href").slice(1), link));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((l) => l.classList.remove("is-active"));
          const activeLink = linkBySection.get(entry.target.id);
          if (activeLink) {
            activeLink.classList.add("is-active");
            if (topbarTitle) topbarTitle.textContent = activeLink.textContent.trim();
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  /* ----------------------------------------------------------------- */
  /* Trend tabs (transactions vs. revenue) */
  function setupTrendTabs() {
    const tabs = document.querySelectorAll("[data-trend-tab]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        window.DASHBOARD_CHARTS_API.setMonthlyMetric(tab.dataset.trendTab);
      });
    });
  }

  /* ----------------------------------------------------------------- */
  /* Predictor form */
  function setupPredictorForm() {
    const form = document.querySelector("[data-predictor-form]");
    const resultPanel = document.querySelector("[data-predictor-result]");
    if (!form) return;

    // Live-update each slider's paired <output> as it's dragged.
    const sliderIds = ["p-age", "p-satisfaction", "p-recency", "p-frequency", "p-spend", "p-pps", "p-engagement"];
    sliderIds.forEach((id) => {
      const input = document.getElementById(id);
      const output = document.getElementById(id + "-out");
      const format = id === "p-spend" ? (v) => formatNumber(Number(v)) : (v) => v;
      input.addEventListener("input", () => (output.textContent = format(input.value)));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const record = {
        age: Number(document.getElementById("p-age").value),
        satisfaction_score: Number(document.getElementById("p-satisfaction").value),
        recency_months: Number(document.getElementById("p-recency").value),
        frequency_transactions: Number(document.getElementById("p-frequency").value),
        monetary_total_spend: Number(document.getElementById("p-spend").value),
        monetary_avg_price_per_sqft: Number(document.getElementById("p-pps").value),
        engagement_score: Number(document.getElementById("p-engagement").value),
        country: document.getElementById("p-country").value,
        acquisition_purpose: document.getElementById("p-purpose").value,
      };

      const result = window.DASHBOARD_PREDICTOR.classify(record);
      renderPredictionResult(resultPanel, record, result);

      // Overlay this buyer's normalized shape onto the segmentation radar
      // chart so the "why" is visible, not just the label.
      const radarValues = window.DASHBOARD_CHARTS_API.RADAR_METRICS.map(({ key, invert }) => {
        const range = DATA.featureRanges[key];
        let n = window.DASHBOARD_UTILS.normalize(record[key] !== undefined ? record[key] : DATA.clusters[0].means[key], range);
        if (invert) n = 1 - n;
        return Math.round(n * 100);
      });
      window.DASHBOARD_CHARTS_API.setPredictorOverlay(radarValues, cssVar("--c-text"));
    });
  }

  function renderPredictionResult(panel, record, result) {
    const c = result.cluster;
    const confidencePct = Math.round(result.confidence * 100);

    panel.innerHTML = `
      <h3 style="margin-bottom:0;">Result</h3>
      <div class="result-summary" style="--result-color:${c.color}">
        <span class="result-dot"></span>
        <div>
          <div class="name">${c.name}</div>
          <div class="text-muted" style="font-size:var(--fs-small);">Cluster ${c.id} &middot; ${formatNumber(c.n)} similar clients in training data</div>
        </div>
      </div>
      <div>
        <label style="display:flex; justify-content:space-between; font-size:var(--fs-small); color:var(--c-text-muted); margin-bottom:6px;">
          <span>Separation from runner-up segment</span><span>${confidencePct}%</span>
        </label>
        <div class="confidence-bar-track"><div class="confidence-bar-fill" style="width:${confidencePct}%"></div></div>
      </div>
      <div>
        <p class="text-muted" style="font-size:var(--fs-small); margin-bottom:8px;">Recommended actions</p>
        <ul>${c.actions.map((a) => `<li>${a}</li>`).join("")}</ul>
      </div>
      <p class="text-muted" style="font-size:var(--fs-micro); margin-bottom:0;">
        Reflects statistical similarity to the trained cluster centroids, not a certainty about this buyer's actual
        intent or value. See <a href="#notices">Notices &amp; Limits</a>.
      </p>
    `;
    panel.classList.remove("is-revealed");
    // Force reflow so the reveal animation can re-trigger on repeated submits.
    void panel.offsetWidth;
    panel.classList.add("is-revealed");
  }

  /* ----------------------------------------------------------------- */
  window.addEventListener(
    "resize",
    debounce(() => {
      Object.values(window.DASHBOARD_CHARTS || {}).forEach((chart) => chart.resize());
    }, 200)
  );
})();
