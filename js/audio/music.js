(function (GW) {
  'use strict';

  var engine = GW.audio.engine;
  var scene = null;
  var desiredScene = null;
  var schedulerId = 0;
  var playing = false;
  var hidden = false;
  var step = 0;
  var bar = 0;
  var nextNoteTime = 0;
  var traceLevel = 0;
  var requestedIntensity = 0;
  var spikeLevel = 0;
  var spikeTime = 0;
  var bossPhase = 0;
  var tensionTempo = false;
  var currentTempo = 76;
  var tempoRamp = null;
  var random = Math.random;
  var queuedStingers = [];
  var lastFailTime = -1;

  function clamp(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function normalizeScene(sceneId) {
    var value = String(sceneId || 'menu').toUpperCase();
    if (value === 'MENU' || value === 'RESULT' || /^L[0-6]$/.test(value)) {
      return value;
    }
    return value.indexOf('L0') === 0 ? 'L0' : 'MENU';
  }

  function getConfig(sceneId) {
    var id = normalizeScene(sceneId);
    var key = id === 'MENU' ? 'menu' : id === 'RESULT' ? 'result' : id;
    var data = GW.musicData;
    return {
      id: key,
      bpm: data.tempos[key] || data.tempos.menu,
      progression: data.progressions[key] || data.progressions.menu,
      cap: key === 'L0' ? 0.3 : key === 'menu' || key === 'result' ? 0.15 : 1,
      floor: key === 'L6' ? 0.4 : 0,
      drums: key !== 'menu' && key !== 'L0' && key !== 'result',
      padOnly: key === 'result'
    };
  }

  function seedRandom() {
    var run = GW.store.get('activeRun', null);
    var seed = run && run.seed ? Number(run.seed) : Date.now();
    random = GW.rng ? GW.rng.mulberry32(seed >>> 0) : Math.random;
  }

  function setScheduler() {
    if (!schedulerId && playing && !hidden && engine.isReady()) {
      schedulerId = window.setInterval(scheduleAhead, 25);
    }
  }

  function stopScheduler() {
    if (schedulerId) {
      window.clearInterval(schedulerId);
      schedulerId = 0;
    }
  }

  function activate(sceneId) {
    if (!playing || hidden || !engine.isReady()) {
      return false;
    }
    var config = getConfig(sceneId);
    if (scene && scene.config.id === config.id && !scene.stopping) {
      return true;
    }
    if (scene) {
      GW.musicVoices.fade(scene, 1500);
    }
    try {
      scene = GW.musicVoices.create(config);
      step = 0;
      bar = 0;
      nextNoteTime = engine.getContext().currentTime + 0.08;
      currentTempo = config.bpm;
      tempoRamp = null;
      tensionTempo = false;
      seedRandom();
      updateLayers();
      var now = engine.getContext().currentTime;
      var gain = scene.output.gain;
      gain.setValueAtTime(0.0001, now);
      gain.linearRampToValueAtTime(0.22, now + 1.5);
      setScheduler();
      return true;
    } catch (error) {
      scene = null;
      stopScheduler();
      GW.events.emit('musicrendererror', error);
      return false;
    }
  }

  function start(sceneId) {
    desiredScene = normalizeScene(sceneId);
    playing = true;
    if (!engine.isReady() || hidden) {
      return false;
    }
    return activate(desiredScene);
  }

  function stop(fadeMs) {
    playing = false;
    stopScheduler();
    if (scene) {
      GW.musicVoices.fade(scene, fadeMs === undefined ? 1500 : fadeMs);
      scene = null;
    }
    desiredScene = null;
  }

  function tempoAt(time) {
    if (!tempoRamp) {
      return currentTempo;
    }
    if (time >= tempoRamp.end) {
      currentTempo = tempoRamp.to;
      tempoRamp = null;
      return currentTempo;
    }
    var progress = Math.max(0, (time - tempoRamp.start) / (tempoRamp.end - tempoRamp.start));
    return tempoRamp.from + (tempoRamp.to - tempoRamp.from) * progress;
  }

  function setTempo(bpm, rampMs) {
    var target = Number(bpm);
    if (!Number.isFinite(target) || target <= 0) {
      throw new RangeError('Tempo must be a positive number.');
    }
    var ctx = engine.getContext();
    var now = ctx ? ctx.currentTime : 0;
    var from = tempoAt(now);
    var duration = Math.max(0, Number(rampMs) || 0) / 1000;
    tempoRamp = duration ? {from: from, to: target, start: now, end: now + duration} : null;
    if (!duration) {
      currentTempo = target;
    }
    if (scene && !tensionTempo) {
      scene.config.bpm = target;
    }
  }

  function effectiveIntensity() {
    return clamp(Math.max(traceLevel, requestedIntensity) + spikeLevel);
  }

  function updateLayers() {
    if (!scene || scene.stopping) {
      return;
    }
    var value = effectiveIntensity();
    value = Math.max(scene.config.floor, Math.min(scene.config.cap, value));
    if (scene.config.id === 'L0') {
      value = Math.max(value, 0.2);
    }
    var tension = scene.config.id === 'L6' &&
      (value > 0.75 || traceLevel > 0.6 || bossPhase >= 3);
    GW.musicVoices.update(scene, value, tension);
    if (scene.config.id === 'L6' && tension !== tensionTempo) {
      tensionTempo = tension;
      setTempo(scene.config.bpm + (tension ? 8 : 0), 2000);
    }
  }

  function scheduleAhead() {
    if (!playing || hidden || !scene || !engine.isReady()) {
      return;
    }
    var ctx = engine.getContext();
    var limit = ctx.currentTime + 0.1;
    var scheduled = 0;
    try {
      while (nextNoteTime < limit && scheduled < 32) {
        var stepDuration = 60 / tempoAt(nextNoteTime) / 4;
        var progression = scene.config.progression;
        var chordName = progression[bar % progression.length];
        GW.musicVoices.step(scene, {
          time: nextNoteTime,
          step: step,
          bar: bar,
          chord: GW.musicData.chords[chordName],
          stepDuration: stepDuration,
          intensity: scene.intensity,
          tension: scene.tension,
          random: random
        });
        nextNoteTime += stepDuration;
        step += 1;
        if (step === 16) {
          step = 0;
          bar += 1;
        }
        scheduled += 1;
      }
    } catch (error) {
      stopScheduler();
      GW.events.emit('musicrendererror', error);
    }
  }

  function setIntensity(value) {
    requestedIntensity = clamp(value);
    updateLayers();
  }

  function addSpike(value, duration) {
    spikeLevel = Math.max(spikeLevel, clamp(value));
    spikeTime = Math.max(spikeTime, Number(duration) || 1);
    updateLayers();
  }

  function update(delta) {
    if (spikeTime > 0) {
      spikeTime = Math.max(0, spikeTime - delta);
      if (!spikeTime) {
        spikeLevel = 0;
        updateLayers();
      }
    }
  }

  function stinger(name) {
    var names = ['level_start', 'level_complete', 'fail', 'choice', 'ending_a', 'ending_b'];
    if (names.indexOf(name) === -1) {
      throw new RangeError('Unknown music stinger: ' + name);
    }
    if (!engine.isReady()) {
      if (engine.getStatus() !== 'unavailable') {
        queuedStingers.push(name);
      }
      return false;
    }
    var ctx = engine.getContext();
    if (name === 'fail' && ctx.currentTime - lastFailTime < 0.5) {
      return false;
    }
    try {
      engine.duckMusic();
      if (name === 'fail') {
        lastFailTime = ctx.currentTime;
        stop(120);
        if (GW.audio.sfx) {
          GW.audio.sfx.play('line_cut', {stinger: true});
        }
      } else {
        GW.musicStingers.play(name, currentTempo, scene);
        if (name === 'ending_a') {
          stop(6000);
        } else if (name === 'ending_b') {
          stop(1500);
        }
      }
      return true;
    } catch (error) {
      GW.events.emit('musicstingererror', {name: name, error: error});
      return false;
    }
  }

  function resume() {
    if (!playing || !desiredScene || hidden || !engine.isReady()) {
      return;
    }
    if (!scene) {
      activate(desiredScene);
    } else {
      nextNoteTime = engine.getContext().currentTime + 0.05;
      setScheduler();
    }
    queuedStingers.splice(0).forEach(function (name) { stinger(name); });
  }

  GW.loop.subscribe(update, null);
  GW.events.on('tracechange', function (event) {
    traceLevel = clamp(Number(event.value) / 100);
    updateLayers();
  });
  GW.events.on('bossphase', function (event) {
    bossPhase = Math.max(0, Number(event && event.phase) || 0);
    updateLayers();
  });
  GW.events.on('levelstart', function (event) {
    start(event.id);
    addSpike(0.12, 1.2);
    stinger('level_start');
  });
  GW.events.on('levelcomplete', function (event) {
    if (event.success) {
      addSpike(0.2, 2);
      stinger('level_complete');
      start('result');
    } else {
      stinger('fail');
    }
  });
  GW.events.on('storychoice', function () { stinger('choice'); });
  GW.events.on('storyending', function (event) {
    stinger(event.ending === 'ghost' ? 'ending_a' : 'ending_b');
  });
  GW.events.on('hidden', function () {
    hidden = true;
    stopScheduler();
  });
  GW.events.on('visible', function () {
    hidden = false;
    resume();
  });
  GW.events.on('audioready', resume);

  // Public music contract: scene lifecycle, intensity, stingers, and tempo control.
  GW.music = {
    start: start,
    stop: stop,
    setIntensity: setIntensity,
    stinger: stinger,
    setTempo: setTempo,
    getIntensity: function () { return scene ? scene.intensity : 0; },
    getScene: function () { return scene ? scene.config.id : desiredScene; }
  };
})(window.GW);
