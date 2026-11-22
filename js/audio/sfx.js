(function (GW) {
  'use strict';

  var engine = GW.audio.engine;
  var lastKeyTick = -Infinity;
  var trace = 0;
  var tickClock = 0;
  var alarmClock = 0;
  var alarmPulse = 0;
  var pentatonic = [440, 523.25, 587.33, 659.25, 783.99];

  function makeVoice(options, priority) {
    options = options || {};
    var voice = engine.createVoice(priority);
    if (!voice) {
      return null;
    }
    voice.pitchScale = (0.94 + Math.random() * 0.12) * (Number(options.pitchScale) || 1);
    voice.gainScale = (0.9 + Math.random() * 0.2) * (Number(options.gainScale) || 1);
    voice.startedAt = voice.context ? voice.context.currentTime : engine.getContext().currentTime;
    return voice;
  }

  function contextOf(voice) {
    return engine.getContext();
  }

  function filter(voice, type, frequency, q) {
    var node = contextOf(voice).createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q || 0.0001;
    engine.addNode(voice, node);
    return node;
  }

  function tone(voice, frequency, duration, options) {
    options = options || {};
    var context = contextOf(voice);
    var oscillator = context.createOscillator();
    var level = context.createGain();
    var start = voice.startedAt + (Number(options.delay) || 0);
    var end = start + duration;

    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency * voice.pitchScale, start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        options.endFrequency * voice.pitchScale,
        end
      );
    }
    if (options.detuneEnd !== undefined) {
      oscillator.detune.setValueAtTime(0, start);
      oscillator.detune.linearRampToValueAtTime(options.detuneEnd, end);
    }

    level.gain.value = Number(options.level) || 1;
    engine.addNode(voice, level);
    oscillator.connect(level);
    if (options.filter) {
      var toneFilter = filter(
        voice,
        options.filter.type || 'lowpass',
        options.filter.frequency,
        options.filter.q
      );
      if (options.filter.endFrequency) {
        toneFilter.frequency.setValueAtTime(options.filter.frequency, start);
        toneFilter.frequency.exponentialRampToValueAtTime(options.filter.endFrequency, end);
      }
      level.connect(toneFilter);
      toneFilter.connect(voice.output);
    } else {
      level.connect(voice.output);
    }
    engine.addSource(voice, oscillator);
    oscillator.start(start);
    oscillator.stop(end);
    return oscillator;
  }

  function noise(voice, duration, options) {
    options = options || {};
    var context = contextOf(voice);
    var buffer = GW.audio.noise.getBuffer(options.color || 'white');
    if (!buffer) {
      return null;
    }
    var source = context.createBufferSource();
    var level = context.createGain();
    var start = voice.startedAt + (Number(options.delay) || 0);
    var end = start + duration;
    source.buffer = buffer;
    level.gain.value = Number(options.level) || 1;
    engine.addNode(voice, level);
    source.connect(level);

    if (options.filter) {
      var noiseFilter = filter(
        voice,
        options.filter.type || 'lowpass',
        options.filter.frequency,
        options.filter.q
      );
      if (options.filter.endFrequency) {
        noiseFilter.frequency.setValueAtTime(options.filter.frequency, start);
        noiseFilter.frequency.exponentialRampToValueAtTime(options.filter.endFrequency, end);
      }
      if (options.waveShaper) {
        level.connect(options.waveShaper);
        options.waveShaper.connect(noiseFilter);
      } else {
        level.connect(noiseFilter);
      }
      noiseFilter.connect(voice.output);
    } else if (options.waveShaper) {
      level.connect(options.waveShaper);
      options.waveShaper.connect(voice.output);
    } else {
      level.connect(voice.output);
    }

    engine.addSource(voice, source);
    source.start(start);
    source.stop(end);
    return source;
  }

  function envelope(voice, peak, duration, attack, release) {
    var param = voice.output.gain;
    var start = voice.startedAt;
    var end = start + duration;
    var rise = Math.min(attack || 0.005, duration / 2);
    var fall = Math.min(release || 0.04, duration / 2);
    var level = Math.max(0.0001, peak * voice.gainScale);
    param.setValueAtTime(0.0001, start);
    param.linearRampToValueAtTime(level, start + rise);
    param.setValueAtTime(level, Math.max(start + rise, end - fall));
    param.exponentialRampToValueAtTime(0.0001, end);
  }

  function voiceFor(options, peak, duration, priority, attack, release) {
    var voice = makeVoice(options, priority);
    if (!voice) {
      return null;
    }
    envelope(voice, peak, duration, attack, release);
    return voice;
  }

  function finish(voice) {
    engine.finishVoice(voice);
  }

  function keyTick(options) {
    var context = engine.getContext();
    if (!context || context.currentTime - lastKeyTick < 1 / 25) {
      return false;
    }
    lastKeyTick = context.currentTime;
    var voice = voiceFor(options, 0.15, 0.014, 0, 0.001, 0.008);
    if (!voice) {
      return false;
    }
    noise(voice, 0.008, {filter: {type: 'bandpass', frequency: 2400, q: 4}});
    tone(voice, 1200, 0.012, {type: 'triangle', level: 0.45});
    finish(voice);
    return true;
  }

  function keyEnter(options) {
    var voice = voiceFor(options, 0.3, 0.11, 1, 0.002, 0.07);
    if (!voice) {
      return false;
    }
    tone(voice, 140, 0.09, {endFrequency: 70, filter: {type: 'lowpass', frequency: 800}});
    noise(voice, 0.02, {filter: {type: 'lowpass', frequency: 800}, level: 0.25});
    finish(voice);
    return true;
  }

  function keyBackspace(options) {
    options = Object.assign({}, options, {pitchScale: 0.8, gainScale: 0.65});
    return keyTick(options);
  }

  function okPing(options) {
    var voice = voiceFor(options, 0.25, 0.58, 2, 0.003, 0.24);
    if (!voice) {
      return false;
    }
    tone(voice, 880, 0.26, {level: 0.75});
    tone(voice, 1318, 0.26, {delay: 0.08, level: 0.75});
    tone(voice, 880, 0.18, {delay: 0.12, level: 0.2});
    tone(voice, 1318, 0.18, {delay: 0.2, level: 0.2});
    finish(voice);
    return true;
  }

  function errorBuzz(options) {
    var voice = voiceFor(options, 0.3, 0.19, 3, 0.004, 0.12);
    if (!voice) {
      return false;
    }
    tone(voice, 110, 0.18, {
      type: 'sawtooth',
      filter: {type: 'lowpass', frequency: 700}
    });
    tone(voice, 117, 0.18, {
      type: 'sawtooth',
      filter: {type: 'lowpass', frequency: 700},
      level: 0.8
    });
    finish(voice);
    return true;
  }

  function traceTick(options) {
    var voice = voiceFor(options, 0.1, 0.004, 1, 0.0005, 0.002);
    if (!voice) {
      return false;
    }
    noise(voice, 0.003, {filter: {type: 'highpass', frequency: 3000}});
    finish(voice);
    return true;
  }

  function traceAlarm(options) {
    alarmPulse += 1;
    var frequency = options && options.frequency ?
      options.frequency : (alarmPulse % 2 ? 440 : 660);
    var voice = voiceFor(options, 0.18, 0.1, 2, 0.002, 0.04);
    if (!voice) {
      return false;
    }
    tone(voice, frequency, 0.09, {
      type: 'square',
      filter: {type: 'lowpass', frequency: 1800}
    });
    finish(voice);
    return true;
  }

  function hintOpen(options) {
    var voice = voiceFor(options, 0.2, 0.22, 2, 0.01, 0.12);
    if (!voice) {
      return false;
    }
    tone(voice, 400, 0.2, {endFrequency: 700});
    finish(voice);
    return true;
  }

  function hintCost(options) {
    var voice = voiceFor(options, 0.15, 0.28, 3, 0.003, 0.18);
    if (!voice) {
      return false;
    }
    tone(voice, 110, 0.18, {
      type: 'sawtooth',
      filter: {type: 'lowpass', frequency: 700}
    });
    tone(voice, 117, 0.18, {
      type: 'sawtooth',
      filter: {type: 'lowpass', frequency: 700},
      level: 0.8
    });
    noise(voice, 0.003, {
      filter: {type: 'highpass', frequency: 3000},
      delay: 0.02,
      level: 0.5
    });
    noise(voice, 0.003, {
      filter: {type: 'highpass', frequency: 3000},
      delay: 0.1,
      level: 0.5
    });
    finish(voice);
    return true;
  }

  function toolUse(options) {
    var voice = voiceFor(options, 0.25, 0.52, 3, 0.02, 0.25);
    if (!voice) {
      return false;
    }
    noise(voice, 0.5, {filter: {type: 'lowpass', frequency: 300, endFrequency: 4000}});
    tone(voice, 330, 0.5, {level: 0.35});
    finish(voice);
    return true;
  }

  function nodeLight(options) {
    var voice = voiceFor(options, 0.18, 0.08, 2, 0.001, 0.05);
    if (!voice) {
      return false;
    }
    tone(voice, 1000, 0.06, {endFrequency: 1120});
    finish(voice);
    return true;
  }

  function dossierSlide(options) {
    var voice = voiceFor(options, 0.16, 0.27, 1, 0.04, 0.2);
    if (!voice) {
      return false;
    }
    noise(voice, 0.25, {
      filter: {type: 'bandpass', frequency: 2400, endFrequency: 800, q: 1.5}
    });
    finish(voice);
    return true;
  }

  function stampThunk(options) {
    var voice = voiceFor(options, 0.5, 0.22, 4, 0.002, 0.16);
    if (!voice) {
      return false;
    }
    tone(voice, 90, 0.2, {endFrequency: 40, filter: {type: 'lowpass', frequency: 500}});
    noise(voice, 0.03, {filter: {type: 'lowpass', frequency: 500}, level: 0.8});
    finish(voice);
    GW.events.emit('screenshake', {duration: 200, amplitude: 5});
    return true;
  }

  function decodeLoop(options) {
    var voice = voiceFor(options, 0.1, 0.38, 1, 0.002, 0.06);
    if (!voice) {
      return false;
    }
    for (var index = 0; index < 5; index += 1) {
      tone(voice, pentatonic[Math.floor(Math.random() * pentatonic.length)], 0.06, {
        type: 'triangle',
        delay: index * 0.06
      });
    }
    tone(voice, 880, 0.08, {delay: 0.3, level: 0.75});
    tone(voice, 1318, 0.08, {delay: 0.38, level: 0.75});
    finish(voice);
    return true;
  }

  function glitch(options) {
    var voice = voiceFor(options, 0.2, 0.17, 2, 0.002, 0.1);
    if (!voice) {
      return false;
    }
    var crusher = contextOf(voice).createWaveShaper();
    var curve = new Float32Array(256);
    for (var index = 0; index < curve.length; index += 1) {
      var sample = (index / (curve.length - 1)) * 2 - 1;
      curve[index] = Math.round((sample + 1) * 1.5) / 1.5 - 1;
    }
    crusher.curve = curve;
    engine.addNode(voice, crusher);
    noise(voice, 0.14, {
      waveShaper: crusher,
      filter: {type: 'bandpass', frequency: 800, endFrequency: 3600}
    });
    finish(voice);
    return true;
  }

  function jackIn(options) {
    var voice = voiceFor(options, 0.28, 1.02, 4, 0.02, 0.3);
    if (!voice) {
      return false;
    }
    tone(voice, 80, 0.9, {
      type: 'sawtooth',
      endFrequency: 900,
      filter: {type: 'lowpass', frequency: 180, endFrequency: 1800, q: 8}
    });
    noise(voice, 0.82, {filter: {type: 'lowpass', frequency: 300, endFrequency: 3000}, level: 0.35});
    tone(voice, 55, 0.16, {delay: 0.86, level: 0.8, endFrequency: 35});
    finish(voice);
    return true;
  }

  function levelComplete(options) {
    var voice = voiceFor(options, 0.2, 0.42, 4, 0.002, 0.18);
    if (!voice) {
      return false;
    }
    [440, 523.25, 659.25, 880].forEach(function (frequency, index) {
      tone(voice, frequency, 0.1, {type: 'square', delay: index * 0.07, level: 0.65});
    });
    tone(voice, 880, 0.14, {delay: 0.28, level: 0.55});
    tone(voice, 1318, 0.14, {delay: 0.36, level: 0.55});
    finish(voice);
    return true;
  }

  function lineCut(options) {
    var voice = voiceFor(options, 0.3, 0.74, 5, 0.005, 0.55);
    if (!voice) {
      return false;
    }
    tone(voice, 110, 0.7, {type: 'sawtooth', detuneEnd: -2400});
    noise(voice, 0.18, {delay: 0.02, level: 0.7});
    tone(voice, 65, 0.18, {delay: 0.55, endFrequency: 32, level: 0.85});
    finish(voice);
    return true;
  }

  function bootHum(options) {
    var voice = voiceFor(options, 0.1, 1.25, 0, 0.6, 0.4);
    if (!voice) {
      return false;
    }
    tone(voice, 55, 1.2, {
      type: 'sawtooth',
      filter: {type: 'lowpass', frequency: 200}
    });
    tone(voice, 110, 1.2, {
      type: 'sawtooth',
      filter: {type: 'lowpass', frequency: 200},
      level: 0.4
    });
    finish(voice);
    return true;
  }

  function uiSelect(options) {
    var voice = voiceFor(options, 0.12, 0.05, 0, 0.001, 0.03);
    if (!voice) {
      return false;
    }
    tone(voice, 600, 0.04);
    finish(voice);
    return true;
  }

  function uiBack(options) {
    var voice = voiceFor(options, 0.12, 0.05, 0, 0.001, 0.03);
    if (!voice) {
      return false;
    }
    tone(voice, 450, 0.04);
    finish(voice);
    return true;
  }

  function whistleEnding(options) {
    var voice = voiceFor(options, 0.18, 2.2, 4, 0.2, 1.8);
    if (!voice) {
      return false;
    }
    [440, 554.37, 659.25].forEach(function (frequency, index) {
      tone(voice, frequency, 1.8, {
        delay: index * 0.18,
        level: 0.55,
        filter: {type: 'lowpass', frequency: 900}
      });
      tone(voice, frequency, 1.2, {delay: index * 0.18 + 0.24, level: 0.12});
    });
    finish(voice);
    return true;
  }

  function ghostEnding(options) {
    var voice = voiceFor(options, 0.12, 6.1, 3, 1.2, 5.7);
    if (!voice) {
      return false;
    }
    tone(voice, 55, 6, {filter: {type: 'lowpass', frequency: 120}});
    finish(voice);
    return true;
  }

  var recipes = {
    key_tick: keyTick,
    key_enter: keyEnter,
    key_backspace: keyBackspace,
    ok_ping: okPing,
    error_buzz: errorBuzz,
    trace_tick: traceTick,
    trace_alarm: traceAlarm,
    hint_open: hintOpen,
    hint_cost: hintCost,
    tool_use: toolUse,
    node_light: nodeLight,
    dossier_slide: dossierSlide,
    stamp_thunk: stampThunk,
    decode_loop: decodeLoop,
    glitch: glitch,
    jack_in: jackIn,
    level_complete: levelComplete,
    line_cut: lineCut,
    boot_hum: bootHum,
    ui_select: uiSelect,
    ui_back: uiBack,
    whistle_ending: whistleEnding,
    ghost_ending: ghostEnding
  };

  function play(name, options) {
    if (!Object.prototype.hasOwnProperty.call(recipes, name)) {
      throw new RangeError('Unknown sound effect: ' + name);
    }
    if (name === 'key_tick') {
      var context = engine.getContext();
      if (!context || context.currentTime - lastKeyTick < 1 / 25) {
        return false;
      }
    }
    try {
      if ((options && options.stinger) ||
          ['jack_in', 'level_complete', 'line_cut', 'whistle_ending', 'ghost_ending'].indexOf(name) !== -1) {
        GW.audio.mixer.duck();
      }
      return recipes[name](options || {});
    } catch (error) {
      GW.events.emit('sfxerror', {name: name, error: error});
      return false;
    }
  }

  function setTrace(value) {
    trace = Math.max(0, Math.min(100, Number(value) || 0));
    if (trace < 10) {
      tickClock = 0;
    }
    if (trace <= 70) {
      alarmClock = 0;
    }
  }

  function update(delta) {
    if (trace > 10) {
      var tickRate = 0.5 + ((Math.min(trace, 95) - 10) / 85) * 13.5;
      tickClock += delta;
      while (tickClock >= 1 / tickRate) {
        tickClock -= 1 / tickRate;
        play('trace_tick');
      }
    }
    if (trace > 70) {
      var alarmRate = 1.2 + ((Math.min(trace, 95) - 70) / 25) * 2.8;
      alarmClock += delta;
      while (alarmClock >= 1 / alarmRate) {
        alarmClock -= 1 / alarmRate;
        play('trace_alarm');
      }
    }
  }

  GW.events.on('tracechange', function (event) { setTrace(event.value); });
  GW.events.on('levelcomplete', function (event) {
    play(event.success ? 'level_complete' : 'line_cut');
  });
  GW.loop.subscribe(update, null);

  // Public sound contract: synthesize a named recipe through the shared SFX bus.
  GW.audio.sfx = {play: play, names: function () { return Object.keys(recipes); }};
})(window.GW);
