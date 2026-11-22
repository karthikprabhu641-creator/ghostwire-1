(function (GW) {
  'use strict';

  var layer = null;
  var canvas = null;
  var context = null;
  var active = false;
  var hidden = false;
  var elapsed = 0;
  var lineDuration = 0;
  var staticDuration = 0;
  var ratio = 1;
  var noiseColors = [];
  var inkColor = '';
  var paperColor = '';
  var noiseClock = 0;
  var noiseDirty = true;
  var noiseInterval = 0.4;

  function clear() {
    active = false;
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
    layer = null;
    canvas = null;
    context = null;
  }

  function createLayer(reduced) {
    layer = document.createElement('div');
    layer.className = 'line-cut-screen';
    if (reduced) {
      var copy = document.createElement('div');
      copy.className = 'line-cut-copy';
      copy.setAttribute('role', 'alert');
      copy.setAttribute('aria-live', 'assertive');
      copy.textContent = GW.text.effects.lineCut;
      layer.appendChild(copy);
    } else {
      layer.style.background = 'transparent';
      canvas = document.createElement('canvas');
      canvas.className = 'fx-canvas line-cut-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      context = canvas.getContext('2d');
      if (!context) {
        canvas = null;
        createLayer(true);
        return;
      }
      layer.appendChild(canvas);
      var message = document.createElement('div');
      message.className = 'line-cut-copy';
      message.setAttribute('role', 'alert');
      message.setAttribute('aria-live', 'assertive');
      message.textContent = GW.text.effects.lineCut;
      layer.appendChild(message);
      inkColor = GW.fx.color('--ink');
      paperColor = GW.fx.color('--paper');
      noiseColors = [paperColor, GW.fx.color('--alarm')];
    }
    document.body.appendChild(layer);
  }

  function play() {
    clear();
    if (GW.rain) {
      GW.rain.stop();
    }
    var reduced = GW.fx.reducedMotion();
    createLayer(reduced);
    reduced = reduced || !canvas;
    active = true;
    elapsed = 0;
    noiseClock = 0;
    noiseDirty = true;
    hidden = false;
    lineDuration = GW.fx.time('--duration-line-cut', 0.35);
    staticDuration = GW.fx.time('--duration-static', 1.5);
    noiseInterval = GW.fx.time('--duration-rain-glyph', 0.4);
    if (!reduced) {
      setResolution();
      resize();
    }
  }

  function setResolution() {
    var quality = GW.quality.get();
    var scale = quality === 'LOW' ? 0.5 : quality === 'MED' ? 0.75 : 1;
    ratio = Math.min(window.devicePixelRatio || 1, 2) * scale;
  }

  function resize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var pixelWidth = Math.max(1, Math.ceil(width * ratio));
    var pixelHeight = Math.max(1, Math.ceil(height * ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return {width: width, height: height};
  }

  function update(delta) {
    if (!active || hidden) {
      return;
    }
    elapsed += delta;
    if (elapsed >= lineDuration) {
      noiseClock += delta;
      if (noiseClock >= noiseInterval) {
        noiseClock %= noiseInterval;
        noiseDirty = true;
      }
    }
    if (elapsed >= lineDuration + staticDuration) {
      clear();
    }
  }

  function render() {
    if (!active || !canvas) {
      return;
    }
    var size = resize();
    var width = size.width;
    var height = size.height;
    if (elapsed < lineDuration) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = inkColor;
      var progress = Math.min(1, elapsed / lineDuration);
      context.globalAlpha = Math.min(1, progress / 0.85);
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
      context.fillStyle = paperColor;
      if (progress < 0.85) {
        var lineWidth = width * (1 - progress / 0.85);
        context.globalAlpha = Math.max(0.25, 1 - progress * 0.7);
        context.fillRect((width - lineWidth) / 2, height / 2, lineWidth, 2);
      } else {
        context.globalAlpha = 1 - ((progress - 0.85) / 0.15) * 0.5;
        context.fillRect(width / 2 - 1, height / 2 - 1, 2, 2);
      }
      context.globalAlpha = 1;
      return;
    }
    if (!noiseDirty) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = inkColor;
    context.fillRect(0, 0, width, height);
    for (var pixel = 0; pixel < 500; pixel += 1) {
      context.fillStyle = noiseColors[Math.floor(Math.random() * noiseColors.length)];
      context.globalAlpha = Math.random() * 0.75;
      context.fillRect(
        Math.random() * width,
        Math.random() * height,
        1 + Math.random() * 3,
        1 + Math.random() * 2
      );
    }
    context.globalAlpha = 1;
    noiseDirty = false;
  }

  GW.loop.subscribe(update, render);
  GW.events.on('tracefail', play);
  GW.events.on('levelstart', clear);
  GW.events.on('hidden', function () { hidden = true; });
  GW.events.on('visible', function () { hidden = false; });
  GW.events.on('qualitychange', function () {
    if (active && canvas) {
      setResolution();
      resize();
      noiseDirty = true;
    }
  });
  GW.events.on('motionchange', function (event) {
    if (!event || !event.reduced || !active || !canvas) {
      return;
    }
    clear();
    createLayer(true);
    active = true;
    elapsed = 0;
    lineDuration = 0;
    staticDuration = GW.fx.time('--duration-static', 1.5);
  });
  // Public fail contract: line collapse, static, then an accessible trace notice.
  GW.static = {play: play, stop: clear};
})(window.GW);