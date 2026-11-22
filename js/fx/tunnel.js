(function (GW) {
  'use strict';

  var active = false;
  var elapsed = 0;
  var duration = 0;
  var flashDuration = 0;
  var canvas = null;
  var context = null;
  var iceColor = '';
  var amberColor = '';
  var paperColor = '';
  var fallbackLayer = null;
  var keyHandler = null;
  var clickHandler = null;

  function removeCanvas() {
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
    canvas = null;
    context = null;
    if (fallbackLayer && fallbackLayer.parentNode) {
      fallbackLayer.parentNode.removeChild(fallbackLayer);
    }
    fallbackLayer = null;
  }

  function cleanListeners() {
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('click', clickHandler);
    }
    keyHandler = null;
    clickHandler = null;
  }

  function finish() {
    active = false;
    removeCanvas();
    cleanListeners();
  }

  function fallback() {
    var fade = document.createElement('div');
    fade.className = 'tunnel-fade';
    fade.addEventListener('animationend', finish, {once: true});
    fallbackLayer = fade;
    document.body.appendChild(fade);
    keyHandler = finish;
    clickHandler = finish;
    document.addEventListener('keydown', keyHandler, {once: true});
    document.addEventListener('click', clickHandler, {once: true});
  }

  function play() {
    finish();
    if (GW.audio && GW.audio.sfx) {
      GW.audio.sfx.play('jack_in');
    }
    if (GW.fx.reducedMotion() || GW.quality.get() === 'LOW') {
      fallback();
      return false;
    }
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas jack-in-canvas';
    context = canvas.getContext('2d');
    if (!context) {
      canvas = null;
      fallback();
      return false;
    }
    iceColor = GW.fx.color('--ice');
    amberColor = GW.fx.color('--amber');
    paperColor = GW.fx.color('--paper');
    document.body.appendChild(canvas);
    active = true;
    elapsed = 0;
    duration = GW.fx.time('--duration-tunnel', 0.9);
    flashDuration = GW.fx.time('--duration-tunnel-flash', 0.06);
    keyHandler = finish;
    clickHandler = finish;
    document.addEventListener('keydown', keyHandler, {once: true});
    document.addEventListener('click', clickHandler, {once: true});
    return true;
  }

  function resize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var ratio = Math.min(window.devicePixelRatio || 1, 2) *
      (GW.quality.get() === 'MED' ? 0.5 : 1);
    if (canvas.width !== Math.ceil(width * ratio) ||
        canvas.height !== Math.ceil(height * ratio)) {
      canvas.width = Math.ceil(width * ratio);
      canvas.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return {width: width, height: height};
  }

  function update(delta) {
    if (!active) {
      return;
    }
    elapsed += delta;
    if (elapsed >= duration) {
      finish();
    }
  }

  function render() {
    if (!active) {
      return;
    }
    var size = resize();
    var width = size.width;
    var height = size.height;
    context.clearRect(0, 0, width, height);
    if (elapsed >= duration - flashDuration) {
      context.fillStyle = paperColor;
      context.fillRect(0, 0, width, height);
      return;
    }
    var progress = Math.max(0, elapsed / (duration - flashDuration));
    var horizonX = width / 2;
    var horizonY = height * 0.44;
    context.lineWidth = 1;
    context.strokeStyle = iceColor;
    context.globalAlpha = 0.25 + progress * 0.45;
    for (var ray = -5; ray <= 5; ray += 1) {
      context.beginPath();
      context.moveTo(horizonX, horizonY);
      context.lineTo(horizonX + ray * width * 0.12, height);
      context.stroke();
    }
    context.strokeStyle = amberColor;
    for (var line = 0; line < 10; line += 1) {
      var depth = (line / 10 + progress * 1.4) % 1;
      var perspective = depth * depth;
      var y = horizonY + (height - horizonY) * perspective;
      var halfWidth = width * 0.6 * perspective;
      context.beginPath();
      context.moveTo(horizonX - halfWidth, y);
      context.lineTo(horizonX + halfWidth, y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  GW.loop.subscribe(update, render);
  GW.events.on('levelstart', play);
  GW.events.on('hidden', finish);
  GW.events.on('motionchange', function (event) {
    if (event && event.reduced && active) {
      finish();
      fallback();
    }
  });
  GW.events.on('qualitychange', function (tier) {
    if (tier === 'LOW' && active) {
      finish();
      fallback();
    }
  });
  // Public tunnel contract: skippable canvas jack-in with a reduced-motion fade.
  GW.tunnel = {play: play, skip: finish};
})(window.GW);