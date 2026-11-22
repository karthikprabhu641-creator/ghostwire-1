(function (GW) {
  'use strict';

  var tasks = [];
  var glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789/<>#';

  function randomGlyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)];
  }

  function removeTarget(target) {
    tasks = tasks.filter(function (task) { return task.target !== target; });
  }

  function scramble(target, text, duration) {
    if (!target || typeof text !== 'string') {
      return false;
    }
    removeTarget(target);
    if (GW.audio && GW.audio.sfx) {
      GW.audio.sfx.play('decode_loop');
    }
    if (GW.fx.reducedMotion()) {
      target.textContent = text;
      return false;
    }
    duration = Number(duration) || (
      GW.fx.time('--duration-decode-min', 0.7) +
      Math.random() * (
        GW.fx.time('--duration-decode-max', 1.2) -
        GW.fx.time('--duration-decode-min', 0.7)
      )
    );
    tasks.push({
      target: target,
      text: text,
      duration: duration,
      elapsed: 0,
      glyphClock: 0,
      changeInterval: GW.fx.time('--duration-decode-cycle', 0.36),
      resolved: 0,
      scrambled: text.split('').map(function (character) {
        return /\s/.test(character) ? character : randomGlyph();
      })
    });
    return true;
  }

  function update(delta) {
    tasks.slice().forEach(function (task) {
      task.elapsed = Math.min(task.duration, task.elapsed + delta);
      task.resolved = Math.floor((task.elapsed / task.duration) * task.text.length);
      task.glyphClock += delta;
      if (task.glyphClock >= task.changeInterval) {
        task.glyphClock %= task.changeInterval;
        for (var index = task.resolved; index < task.text.length; index += 1) {
          if (!/\s/.test(task.text[index])) {
            task.scrambled[index] = randomGlyph();
          }
        }
      }
      if (task.target.isConnected === false) {
        removeTarget(task.target);
        return;
      }
      if (task.elapsed >= task.duration) {
        task.target.textContent = task.text;
        removeTarget(task.target);
        GW.events.emit('decodecomplete', {target: task.target, text: task.text});
      } else {
        task.target.textContent = task.scrambled.map(function (character, index) {
          return index < task.resolved ? task.text[index] : character;
        }).join('');
      }
    });
  }

  GW.events.on('motionchange', function (event) {
    if (!event || !event.reduced) {
      return;
    }
    tasks.slice().forEach(function (task) {
      task.target.textContent = task.text;
      removeTarget(task.target);
    });
  });
  GW.loop.subscribe(update, null);
  // Public decode contract: resolve text left-to-right without HTML insertion.
  GW.decode = {scramble: scramble};
})(window.GW);