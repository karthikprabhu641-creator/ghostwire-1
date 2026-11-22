(function (GW) {
  'use strict';

  var listeners = Object.create(null);

  function on(name, callback) {
    if (!listeners[name]) {
      listeners[name] = [];
    }
    listeners[name].push(callback);
  }

  function off(name, callback) {
    if (!listeners[name]) {
      return;
    }
    listeners[name] = listeners[name].filter(function (entry) {
      return entry !== callback;
    });
  }

  function emit(name, payload) {
    (listeners[name] || []).slice().forEach(function (callback) {
      callback(payload);
    });
  }

  GW.events = {on: on, off: off, emit: emit};
})(window.GW);
