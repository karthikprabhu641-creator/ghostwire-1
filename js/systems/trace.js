(function (GW) {
  'use strict';

  var value = 0;
  var active = false;
  var pageHidden = false;
  var failed = false;
  var driftPerSecond = 0.35;

  function publish(reason) {
    GW.events.emit('tracechange', {value: value, reason: reason || 'update'});
    if (value >= 100 && !failed) {
      failed = true;
      active = false;
      GW.events.emit('tracefail', {value: value});
    }
  }

  function set(next, reason) {
    value = Math.max(0, Math.min(100, Number(next) || 0));
    publish(reason);
    return value;
  }

  function add(amount, reason) {
    return set(value + Math.max(0, Number(amount) || 0), reason || 'increase');
  }

  function reduce(amount, reason) {
    return set(value - Math.max(0, Number(amount) || 0), reason || 'reduce');
  }

  function reset() {
    value = 0;
    failed = false;
    publish('reset');
    return value;
  }

  function start(difficulty) {
    var rates = {Rookie: 0.15, Operator: 0.35, Ghost: 0.65};
    driftPerSecond = rates[difficulty] || rates.Operator;
    active = true;
  }

  function stop() {
    active = false;
  }

  function update(delta) {
    if (active && !pageHidden && !failed && delta > 0) {
      add(driftPerSecond * delta, 'drift');
    }
  }

  function useTool(tool) {
    var reductions = {SPOOFER: 18};
    var name = String(tool || '').toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(reductions, name)) {
      return false;
    }
    reduce(reductions[name], 'tool:' + name.toLowerCase());
    GW.events.emit('trace-tool', {name: name, value: value});
    return true;
  }

  GW.events.on('hidden', function () { pageHidden = true; });
  GW.events.on('visible', function () { pageHidden = false; });
  GW.loop.subscribe(update, null);
  // Public trace contract: add, reduce, get, and reset, with level drift and fail events.
  GW.trace = {
    add: add,
    reduce: reduce,
    get: function () { return value; },
    reset: reset,
    start: start,
    stop: stop,
    useTool: useTool,
    set: set
  };
})(window.GW);
