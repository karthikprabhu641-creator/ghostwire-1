(function (GW) {
  'use strict';

  var trace = 12;
  var elapsed = 0;
  var initialized = false;
  var arc;
  var needle;
  var number;
  var gauge;

  function init() {
    if (initialized) {
      return;
    }
    initialized = true;
    arc = document.getElementById('trace-arc');
    needle = document.getElementById('trace-needle');
    number = document.querySelector('.gauge-number');
    gauge = document.querySelector('.trace-gauge');
    GW.events.on('tracechange', function (event) {
      setTrace(Math.round(event.value));
    });
    GW.loop.subscribe(update, render);
  }

  function setTrace(value) {
    trace = Math.max(0, Math.min(100, value));
    render();
  }

  function update(delta) {
    elapsed += delta;
  }

  function render() {
    if (!arc) {
      return;
    }
    var angle = -80 + (trace * 1.6);
    arc.style.strokeDasharray = trace + ' 100';
    needle.style.transform = 'rotate(' + angle + 'deg)';
    number.textContent = String(trace);
    gauge.setAttribute('aria-label', 'Trace ' + trace + ' percent');

    var time = document.getElementById('hud-time');
    if (time) {
      var seconds = Math.floor(elapsed);
      var minutes = Math.floor(seconds / 60);
      time.textContent =
        String(minutes).padStart(2, '0') + ':' +
        String(seconds % 60).padStart(2, '0');
    }
  }

  GW.hud = {
    init: init,
    setTrace: setTrace,
    getTrace: function () { return trace; }
  };
})(window.GW);
