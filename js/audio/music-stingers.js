(function (GW) {
  'use strict';

  var engine = GW.audio.engine;

  function tone(frequency, start, duration, level, type, endHz) {
    var context = engine.getContext();
    var output = context.createGain();
    var oscillator = context.createOscillator();
    var end = start + duration;
    var attack = Math.min(0.25, duration / 3);
    output.gain.setValueAtTime(0.0001, start);
    output.gain.linearRampToValueAtTime(level, start + attack);
    output.gain.setValueAtTime(level, Math.max(start + attack, end - duration * 0.4));
    output.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endHz) {
      oscillator.frequency.exponentialRampToValueAtTime(endHz, end);
    }
    oscillator.connect(output);
    output.connect(engine.getBus('music'));
    oscillator.addEventListener('ended', function () {
      try {
        oscillator.disconnect();
        output.disconnect();
      } catch (error) {
        GW.events.emit('musicdisconnecterror', error);
      }
    }, {once: true});
    oscillator.start(start);
    oscillator.stop(end);
  }

  function play(name, bpm, scene) {
    var context = engine.getContext();
    var now = context.currentTime + 0.03;
    var beat = 60 / bpm;
    if (name === 'level_start') {
      tone(90, now, 0.9, 0.08, 'sawtooth', 440);
    } else if (name === 'level_complete') {
      [220, 261.63, 329.63].forEach(function (hz) {
        tone(hz, now, beat * 8, 0.035);
      });
      [220, 277.18, 329.63].forEach(function (hz) {
        tone(hz, now + beat * 4, beat * 4, 0.045);
      });
    } else if (name === 'choice') {
      if (scene) {
        GW.musicVoices.update(scene, scene.intensity, scene.tension, true);
      }
    } else if (name === 'ending_a') {
      tone(55, now, 6, 0.045);
    } else if (name === 'ending_b') {
      var major = [440, 554.37, 659.25, 880, 1108.73];
      var start = now + 1.4;
      major.forEach(function (hz, index) {
        tone(hz, start + index * 0.12, 6.4, 0.035);
      });
      for (var index = 0; index < 32; index += 1) {
        tone(major[index % major.length], start + index * 0.22, 0.2, 0.018, 'triangle');
      }
    }
  }

  // Public one-shot contract: synthesize section-7 musical stingers.
  GW.musicStingers = {play: play};
})(window.GW);
