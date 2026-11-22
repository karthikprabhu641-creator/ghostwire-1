(function (GW) {
  'use strict';

  function reducedMotion() {
    var systemReduced = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return systemReduced || document.documentElement.classList.contains('reduce-motion');
  }

  function time(name, fallback) {
    if (typeof window.getComputedStyle !== 'function') {
      return fallback;
    }
    var value = window.getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    var amount = parseFloat(value);
    if (!Number.isFinite(amount)) {
      return fallback;
    }
    return value.indexOf('ms') !== -1 ? amount / 1000 : amount;
  }

  function color(name) {
    return window.getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  }

  function length(name, fallback) {
    var value = window.getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    var amount = parseFloat(value);
    return Number.isFinite(amount) ? amount : fallback;
  }

  // Shared motion and token access for the canvas and CSS effect modules.
  GW.fx = {
    reducedMotion: reducedMotion,
    time: time,
    color: color,
    length: length
  };
})(window.GW);