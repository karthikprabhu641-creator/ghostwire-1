(function (GW) {
  'use strict';

  var canvas = null;
  var context = null;
  var layers = [];
  var active = false;
  var hidden = false;
  var trace = 0;
  var width = 0;
  var height = 0;
  var ratio = 1;
  var glyphs = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/';
  var glyphInterval = 0.4;
  var specs = [
    {size: 11, speed: 20, color: '--amber-dim', density: 0.35, alpha: 0.35},
    {size: 14, speed: 38, color: '--ice', density: 0.24, alpha: 0.58},
    {size: 18, speed: 62, color: '--amber', density: 0.14, alpha: 0.82}
  ];

  function makeCanvas() {
    if (canvas) {
      return;
    }
    canvas = document.createElement('canvas');
    canvas.className = 'code-rain-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    context = canvas.getContext('2d');
    if (!context) {
      canvas = null;
      return;
    }
    document.body.appendChild(canvas);
  }

  function enabled() {
    return active && !hidden && !GW.fx.reducedMotion() && GW.quality.get() !== 'LOW';
  }

  function createAtlas(spec) {
    var atlasCanvas = document.createElement('canvas');
    var cellWidth = spec.size + 2;
    var cellHeight = Math.ceil(spec.size * 1.3);
    atlasCanvas.width = cellWidth * glyphs.length;
    atlasCanvas.height = cellHeight;
    var atlasContext = atlasCanvas.getContext('2d');
    if (!atlasContext) {
      return null;
    }
    atlasContext.font = spec.size + 'px monospace';
    atlasContext.textBaseline = 'top';
    atlasContext.fillStyle = GW.fx.color(spec.color);
    for (var index = 0; index < glyphs.length; index += 1) {
      atlasContext.fillText(glyphs[index], index * cellWidth, 0);
    }
    return {canvas: atlasCanvas, cellWidth: cellWidth, cellHeight: cellHeight};
  }

  function createDrops() {
    var quality = GW.quality.get();
    var selectedSpecs = quality === 'LOW' ? [] :
      quality === 'MED' ? [specs[1]] : specs;
    layers = selectedSpecs.map(function (spec) {
      var count = Math.ceil((width / spec.size) * spec.density);
      var drops = [];
      for (var index = 0; index < count; index += 1) {
        drops.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: spec.speed * (0.75 + Math.random() * 0.5),
          glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
          glyphClock: Math.random()
        });
      }
      return {spec: spec, drops: drops, atlas: createAtlas(spec)};
    });
  }

  function resize() {
    var nextWidth = window.innerWidth;
    var nextHeight = window.innerHeight;
    var nextRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (GW.quality.get() === 'MED') {
      nextRatio = Math.min(nextRatio, 1);
    }
    if (width === nextWidth && height === nextHeight && ratio === nextRatio) {
      return;
    }
    width = nextWidth;
    height = nextHeight;
    ratio = nextRatio;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    createDrops();
  }

  function start() {
    active = true;
    glyphInterval = GW.fx.time('--duration-rain-glyph', 0.4);
    makeCanvas();
    if (!canvas) {
      active = false;
      return;
    }
    resize();
    render();
  }

  function stop() {
    active = false;
    if (canvas) {
      canvas.style.display = 'none';
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function update(delta) {
    if (!enabled()) {
      return;
    }
    resize();
    var speedScale = 1 + (trace / 100) * 0.25;
    layers.forEach(function (layer) {
      layer.drops.forEach(function (drop) {
        drop.y += drop.speed * speedScale * delta;
        drop.glyphClock += delta;
        if (drop.glyphClock >= glyphInterval) {
          drop.glyphClock %= glyphInterval;
          drop.glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        if (drop.y > height + layer.spec.size) {
          drop.y = -layer.spec.size * Math.random();
          drop.x = Math.random() * width;
        }
      });
    });
  }

  function render() {
    if (!canvas) {
      return;
    }
    if (!enabled()) {
      if (canvas.style.display !== 'none') {
        canvas.style.display = 'none';
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    canvas.style.display = 'block';
    context.clearRect(0, 0, canvas.width, canvas.height);
    layers.forEach(function (layer) {
      context.globalAlpha = layer.spec.alpha;
      layer.drops.forEach(function (drop) {
        var glyphIndex = glyphs.indexOf(drop.glyph);
        if (layer.atlas && glyphIndex !== -1) {
          context.drawImage(
            layer.atlas.canvas,
            glyphIndex * layer.atlas.cellWidth,
            0,
            layer.atlas.cellWidth,
            layer.atlas.cellHeight,
            drop.x,
            drop.y,
            layer.atlas.cellWidth,
            layer.atlas.cellHeight
          );
        } else {
          context.font = layer.spec.size + 'px monospace';
          context.fillStyle = GW.fx.color(layer.spec.color);
          context.fillText(drop.glyph, drop.x, drop.y);
        }
      });
    });
    context.globalAlpha = 1;
  }

  GW.loop.subscribe(update, render);
  GW.events.on('levelstart', start);
  GW.events.on('levelcomplete', function (event) {
    if (!event || !event.success) {
      stop();
    }
  });
  GW.events.on('tracechange', function (event) {
    trace = Math.max(0, Math.min(100, Number(event.value) || 0));
  });
  GW.events.on('hidden', function () { hidden = true; });
  GW.events.on('visible', function () { hidden = false; });
  GW.events.on('qualitychange', function () {
    if (width) {
      createDrops();
    }
    render();
  });
  GW.events.on('motionchange', render);
  // Public rain contract: three quality-aware depth layers, paused while hidden.
  GW.rain = {start: start, stop: stop};
})(window.GW);