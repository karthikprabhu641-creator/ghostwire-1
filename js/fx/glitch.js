(function (GW) {
  'use strict';

  var effects = [];

  function remove(effect) {
    if (effect.canvas.parentNode) {
      effect.canvas.parentNode.removeChild(effect.canvas);
    }
    effects = effects.filter(function (entry) { return entry !== effect; });
  }

  function createEffect(target) {
    var rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height || !target.textContent) {
      return null;
    }
    var style = window.getComputedStyle(target);
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var canvas = document.createElement('canvas');
    var source = document.createElement('canvas');
    var width = rect.width;
    var height = rect.height;
    canvas.className = 'fx-canvas glitch-canvas';
    canvas.style.left = rect.left + 'px';
    canvas.style.top = rect.top + 'px';
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = source.width = Math.ceil(width * ratio);
    canvas.height = source.height = Math.ceil(height * ratio);
    var sourceContext = source.getContext('2d');
    var context = canvas.getContext('2d');
    if (!sourceContext || !context) {
      return null;
    }
    sourceContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    sourceContext.font = style.font;
    sourceContext.textBaseline = 'top';
    sourceContext.fillStyle = style.color;
    var lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    target.textContent.split('\n').forEach(function (line, index) {
      sourceContext.fillText(line, 0, index * lineHeight, width);
    });
    var slices = [];
    var simple = GW.quality.get() === 'MED';
    for (var y = 0; y < height; ) {
      var sliceHeight = Math.min(
        simple ? 8 + Math.random() * 12 : 4 + Math.random() * 12,
        height - y
      );
      var maximumOffset = GW.fx.length('--glitch-offset', 8) * (simple ? 0.5 : 1);
      slices.push({
        y: y,
        height: sliceHeight,
        offset: (Math.random() * maximumOffset * 2) - maximumOffset
      });
      y += sliceHeight + (simple ? 12 + Math.random() * 8 : Math.random() * 8);
    }
    document.body.appendChild(canvas);
    return {
      target: target,
      canvas: canvas,
      context: context,
      source: source,
      width: width,
      height: height,
      slices: slices,
      ratio: ratio,
      elapsed: 0,
      duration: GW.fx.time('--duration-glitch-min', 0.08) +
        Math.random() * (
          GW.fx.time('--duration-glitch-max', 0.16) -
          GW.fx.time('--duration-glitch-min', 0.08)
        )
    };
  }

  function play(target) {
    if (GW.fx.reducedMotion() || GW.quality.get() === 'LOW') {
      return false;
    }
    target = target || document.getElementById('hud-level');
    if (!target) {
      return false;
    }
    var effect = createEffect(target);
    if (!effect) {
      return false;
    }
    effects.push(effect);
    GW.audio.sfx.play('glitch');
    return true;
  }

  function update(delta) {
    effects.slice().forEach(function (effect) {
      effect.elapsed += delta;
      if (GW.fx.reducedMotion() || GW.quality.get() === 'LOW' ||
          effect.elapsed >= effect.duration || !effect.target.isConnected) {
        remove(effect);
      }
    });
  }

  function render() {
    effects.forEach(function (effect) {
      var rect = effect.target.getBoundingClientRect();
      var context = effect.context;
      effect.canvas.style.left = rect.left + 'px';
      effect.canvas.style.top = rect.top + 'px';
      context.clearRect(0, 0, effect.canvas.width, effect.canvas.height);
      context.setTransform(effect.ratio, 0, 0, effect.ratio, 0, 0);
      effect.slices.forEach(function (slice) {
        var sourceY = Math.floor(slice.y * effect.ratio);
        var sourceHeight = Math.max(1, Math.ceil(slice.height * effect.ratio));
        context.drawImage(
          effect.source,
          0,
          sourceY,
          effect.source.width,
          sourceHeight,
          slice.offset,
          slice.y,
          effect.width,
          slice.height
        );
      });
    });
  }

  GW.loop.subscribe(update, render);
  GW.events.on('inputerror', function (event) { play(event && event.target); });
  GW.events.on('levelcomplete', function (event) {
    if (event && event.success) {
      play(document.getElementById('hud-level'));
    }
  });
  GW.events.on('storyending', function () {
    play(document.getElementById('hud-level'));
  });
  GW.events.on('qualitychange', function (tier) {
    if (tier === 'LOW') {
      effects.slice().forEach(remove);
    }
  });
  // Public glitch contract: play a brief, canvas-rendered slice displacement.
  GW.glitch = {play: play};
})(window.GW);