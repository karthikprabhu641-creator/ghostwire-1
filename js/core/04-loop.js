(function (GW) {
  'use strict';

  var subscribers = [];
  var previous = 0;
  var frameId = 0;

  function subscribe(update, render) {
    subscribers.push({update: update, render: render});
  }

  function frame(time) {
    var dt = previous ? Math.min((time - previous) / 1000, 0.1) : 0;
    previous = time;

    subscribers.forEach(function (subscriber) {
      if (subscriber.update) {
        subscriber.update(dt);
      }
      if (subscriber.render) {
        subscriber.render();
      }
    });

    frameId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (!frameId) {
      frameId = window.requestAnimationFrame(frame);
    }
  }

  GW.loop = {subscribe: subscribe, start: start};
})(window.GW);
