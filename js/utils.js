/**
 * utils.js
 * Small, dependency-free helper functions shared across charts.js,
 * predictor.js, and main.js. No DOM side effects live here.
 */

window.DASHBOARD_UTILS = (function () {
  /** Read a CSS custom property's current value from :root (theme-aware). */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /** Clamp a number between [min, max]. */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** Normalize a value to 0-1 given a {min,max} range. Clamped both ends. */
  function normalize(value, range) {
    if (range.max === range.min) return 0.5;
    return clamp((value - range.min) / (range.max - range.min), 0, 1);
  }

  /** Format a number with thousands separators, no decimals by default. */
  function formatNumber(value, decimals = 0) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /** Format a number as compact USD, e.g. $1.2M. */
  function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: value >= 1000 ? "compact" : "standard",
      maximumFractionDigits: 1,
    }).format(value);
  }

  /** Ease-out cubic - used for the KPI counter animation. */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Animate a number counting up inside `el`, from 0 to `target`, over
   * `duration` ms. Respects prefers-reduced-motion by jumping straight to
   * the target value.
   */
  function animateCounter(el, target, duration = 900) {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.textContent = formatNumber(target);
      return;
    }
    const start = performance.now();
    function tick(now) {
      const progress = clamp((now - start) / duration, 0, 1);
      const value = Math.round(target * easeOutCubic(progress));
      el.textContent = formatNumber(value);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /** Debounce a function call (used for the resize handler). */
  function debounce(fn, wait = 150) {
    let timeout;
    return function debounced(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  return { cssVar, clamp, normalize, formatNumber, formatCurrency, animateCounter, debounce };
})();
