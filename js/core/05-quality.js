(function (GW) {
  'use strict';

  var tier = 'HIGH';
  var slowFrames = 0;

  function update(delta) {
    if (tier !== 'LOW' && delta > 0.024) {
      slowFrames += 1;
      if (slowFrames >= 120) {
        tier = tier === 'HIGH' ? 'MED' : 'LOW';
        slowFrames = 0;
        GW.events.emit('qualitychange', tier);
      }
    } else {
      slowFrames = Math.max(0, slowFrames - 1);
    }
  }

  GW.quality = {
    get: function () { return tier; },
    update: update
  };
})(window.GW);
