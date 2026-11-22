(function (GW) {
  'use strict';

  var tier = 'HIGH';
  var mode = 'AUTO';
  var autoTier = 'HIGH';
  var inLevel = false;
  var monitorElapsed = 0;
  var frameTotal = 0;
  var frameCount = 0;

  function publish(next) {
    if (tier !== next) {
      tier = next;
      GW.events.emit('qualitychange', tier);
    }
  }

  function resetWindow() {
    monitorElapsed = 0;
    frameTotal = 0;
    frameCount = 0;
  }

  function update(delta) {
    if (mode !== 'AUTO' || !Number.isFinite(delta) || delta <= 0) {
      return;
    }
    monitorElapsed += delta;
    frameTotal += delta;
    frameCount += 1;
    if (monitorElapsed < 2) {
      return;
    }

    var averageFrame = frameTotal / frameCount;
    resetWindow();
    if (averageFrame > 0.024 && autoTier !== 'LOW') {
      autoTier = autoTier === 'HIGH' ? 'MED' : 'LOW';
      publish(autoTier);
    } else if (averageFrame < 0.018 && !inLevel && autoTier !== 'HIGH') {
      autoTier = autoTier === 'LOW' ? 'MED' : 'HIGH';
      publish(autoTier);
    }
  }

  function setMode(value) {
    var nextMode = String(value || '').toUpperCase();
    if (['AUTO', 'HIGH', 'MED', 'LOW'].indexOf(nextMode) === -1) {
      throw new RangeError('Unknown quality tier: ' + value);
    }
    mode = nextMode;
    resetWindow();
    if (mode === 'AUTO') {
      autoTier = tier;
    } else {
      autoTier = mode;
      publish(mode);
    }
    return tier;
  }

  GW.events.on('levelstart', function () { inLevel = true; });
  GW.events.on('levelcomplete', function () { inLevel = false; });
  // Public quality contract: manual tiers and two-second automatic frame monitoring.
  GW.quality = {
    get: function () { return tier; },
    getMode: function () { return mode; },
    setMode: setMode,
    update: update
  };
  GW.loop.subscribe(update, null);
})(window.GW);
