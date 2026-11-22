(function (GW) {
  'use strict';

  var engine = GW.audio.engine;

  function ctx() {
    return engine.getContext();
  }

  function midi(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  function addNode(scene, node) {
    scene.nodes.push(node);
    return node;
  }

  function disconnect(node) {
    try {
      node.disconnect();
    } catch (error) {
      GW.events.emit('musicdisconnecterror', error);
    }
  }

  function cleanup(scene) {
    scene.nodes.forEach(disconnect);
    scene.nodes = [];
    scene.sources = [];
  }

  function addSource(scene, source, temporary) {
    scene.sources.push(source);
    scene.pending += 1;
    addNode(scene, source);
    (temporary || []).forEach(function (node) { addNode(scene, node); });
    source.addEventListener('ended', function () {
      scene.pending -= 1;
      scene.sources = scene.sources.filter(function (entry) { return entry !== source; });
      (temporary || []).forEach(disconnect);
      scene.nodes = scene.nodes.filter(function (node) {
        return node !== source && (temporary || []).indexOf(node) === -1;
      });
      if (scene.stopping && scene.pending <= 0) {
        cleanup(scene);
      }
    }, {once: true});
  }

  function gain(scene, value, destination) {
    var node = addNode(scene, ctx().createGain());
    node.gain.value = value;
    node.connect(destination || scene.output);
    return node;
  }

  function persistentOsc(scene, type, hz, destination) {
    var oscillator = ctx().createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = hz;
    oscillator.connect(destination);
    addSource(scene, oscillator);
    oscillator.start();
    return oscillator;
  }

  function note(scene, destination, type, hz, start, end, options) {
    options = options || {};
    var oscillator = ctx().createOscillator();
    var envelope = ctx().createGain();
    var nodes = [envelope];
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(hz, start);
    if (options.endHz) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endHz, end);
    }
    if (options.detune !== undefined) {
      oscillator.detune.value = options.detune;
    }
    var peak = options.peak || 0.04;
    var attack = options.attack || 0.02;
    var release = options.release === undefined ? 0.08 : options.release;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(peak, start + attack);
    if (release > 0) {
      envelope.gain.setValueAtTime(peak, Math.max(start + attack, end - release));
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    }
    if (options.filter) {
      var filter = ctx().createBiquadFilter();
      filter.type = options.filter.type || 'lowpass';
      filter.frequency.value = options.filter.hz;
      if (options.filter.endHz) {
        filter.frequency.setValueAtTime(options.filter.hz, start);
        filter.frequency.exponentialRampToValueAtTime(options.filter.endHz, end);
      }
      envelope.connect(filter);
      filter.connect(destination);
      nodes.push(filter);
    } else {
      envelope.connect(destination);
    }
    addSource(scene, oscillator, nodes);
    oscillator.start(start);
    oscillator.stop(end);
  }

  function createDrone(scene) {
    var filter = addNode(scene, ctx().createBiquadFilter());
    var layer = gain(scene, 0.25, filter);
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.connect(scene.output);
    persistentOsc(scene, 'sawtooth', 55, layer);
    persistentOsc(scene, 'sine', 55, layer);

    var lfo = ctx().createOscillator();
    var modulation = addNode(scene, ctx().createGain());
    modulation.gain.value = 32;
    lfo.frequency.value = 0.08;
    lfo.connect(modulation);
    modulation.connect(filter.frequency);
    addSource(scene, lfo);
    lfo.start();
    scene.layerGains.drone = layer;
  }

  function createPad(scene) {
    var filter = addNode(scene, ctx().createBiquadFilter());
    var layer = gain(scene, 0.6);
    var delayA = addNode(scene, ctx().createDelay(0.1));
    var delayB = addNode(scene, ctx().createDelay(0.1));
    var returnA = gain(scene, 0.22);
    var returnB = gain(scene, 0.22);
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    delayA.delayTime.value = 0.016;
    delayB.delayTime.value = 0.024;
    filter.connect(layer);
    layer.connect(scene.output);
    layer.connect(delayA);
    layer.connect(delayB);

    var panA = ctx().createStereoPanner ? addNode(scene, ctx().createStereoPanner()) : null;
    var panB = ctx().createStereoPanner ? addNode(scene, ctx().createStereoPanner()) : null;
    if (panA && panB) {
      panA.pan.value = -0.55;
      panB.pan.value = 0.55;
      delayA.connect(panA);
      delayB.connect(panB);
      panA.connect(returnA);
      panB.connect(returnB);
    } else {
      delayA.connect(returnA);
      delayB.connect(returnB);
    }
    returnA.connect(scene.output);
    returnB.connect(scene.output);

    var lfo = ctx().createOscillator();
    var modulation = addNode(scene, ctx().createGain());
    modulation.gain.value = 0.003;
    lfo.frequency.value = 0.3;
    lfo.connect(modulation);
    modulation.connect(delayA.delayTime);
    modulation.connect(delayB.delayTime);
    addSource(scene, lfo);
    lfo.start();
    scene.padFilter = filter;
    scene.layerGains.pad = layer;
  }

  function createArp(scene) {
    var input = gain(scene, 1);
    var direct = gain(scene, 0.08);
    var delayA = addNode(scene, ctx().createDelay(1));
    var delayB = addNode(scene, ctx().createDelay(1));
    var feedbackA = gain(scene, 0.35, delayB);
    var feedbackB = gain(scene, 0.35, delayA);
    var returnA = gain(scene, 0.16);
    var returnB = gain(scene, 0.16);
    input.connect(direct);
    direct.connect(scene.output);
    input.connect(delayA);
    delayA.connect(feedbackA);
    delayB.connect(feedbackB);
    var panA = ctx().createStereoPanner ? addNode(scene, ctx().createStereoPanner()) : null;
    var panB = ctx().createStereoPanner ? addNode(scene, ctx().createStereoPanner()) : null;
    if (panA && panB) {
      panA.pan.value = -0.7;
      panB.pan.value = 0.7;
      delayA.connect(panA);
      delayB.connect(panB);
      panA.connect(returnA);
      panB.connect(returnB);
    } else {
      delayA.connect(returnA);
      delayB.connect(returnB);
    }
    returnA.connect(scene.output);
    returnB.connect(scene.output);
    scene.arpInput = input;
    scene.arpDelayA = delayA;
    scene.arpDelayB = delayB;
    scene.layerGains.arp = direct;
  }

  function create(config) {
    var output = ctx().createGain();
    output.gain.value = 0.0001;
    output.connect(engine.getBus('music'));
    var scene = {
      config: config,
      output: output,
      nodes: [output],
      sources: [],
      pending: 0,
      stopping: false,
      intensity: 0,
      tension: false,
      choiceHold: false,
      appliedIntensity: -1,
      appliedTension: false,
      appliedChoice: false,
      layerGains: Object.create(null)
    };
    createDrone(scene);
    createPad(scene);
    createArp(scene);
    scene.bassFilter = addNode(scene, ctx().createBiquadFilter());
    scene.bassFilter.type = 'lowpass';
    scene.bassFilter.frequency.value = 400;
    scene.layerGains.bass = gain(scene, 0.18, scene.bassFilter);
    scene.bassFilter.connect(output);
    scene.layerGains.percussion = gain(scene, 0.45);
    scene.layerGains.percussion.connect(output);
    scene.layerGains.tension = gain(scene, 0.1);
    scene.layerGains.tension.connect(output);
    return scene;
  }

  function ramp(param, target) {
    var now = ctx().currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.setTargetAtTime(target, now, 0.2);
    } catch (error) {
      GW.events.emit('musicparamerror', error);
    }
  }

  function update(scene, intensity, tension, choice) {
    if (!scene || scene.stopping) {
      return;
    }
    scene.intensity = intensity;
    scene.tension = tension;
    scene.choiceHold = Boolean(choice);
    if (Math.abs(scene.appliedIntensity - intensity) < 0.01 &&
        scene.appliedTension === tension && scene.appliedChoice === scene.choiceHold) {
      return;
    }
    scene.appliedIntensity = intensity;
    scene.appliedTension = tension;
    scene.appliedChoice = scene.choiceHold;
    var arp = !scene.choiceHold && !scene.config.padOnly &&
      scene.config.id !== 'menu' && intensity > (scene.config.id === 'L0' ? 0.05 : 0.15);
    ramp(scene.layerGains.arp.gain, arp ? 0.08 : 0.0001);
    ramp(scene.layerGains.bass.gain, !scene.choiceHold && !scene.config.padOnly &&
      intensity > 0.3 ? 0.18 : 0.0001);
    ramp(scene.layerGains.percussion.gain, !scene.choiceHold && scene.config.drums &&
      intensity > 0.45 ? 0.45 : 0.0001);
    ramp(scene.layerGains.tension.gain, !scene.choiceHold && tension ? 0.1 : 0.0001);
    try {
      scene.padFilter.frequency.setTargetAtTime(tension ? 3000 : 900, ctx().currentTime, 0.25);
    } catch (error) {
      GW.events.emit('musicparamerror', error);
    }
  }

  function schedulePad(scene, chord, time, duration) {
    chord.forEach(function (noteNumber) {
      [-7, 0, 7].forEach(function (detune) {
        var end = time + duration + 0.8;
        note(scene, scene.padFilter, 'sawtooth', midi(noteNumber), time, end, {
          peak: 0.035,
          attack: 0.4,
          release: 0.8,
          detune: detune
        });
      });
    });
  }

  function scheduleArp(scene, chord, time, step, duration, random) {
    var pattern = GW.musicData.arpPattern[step];
    var noteNumber;
    if (random() < 0.04) {
      var scale = GW.musicData.arpScale;
      noteNumber = scale[Math.floor(random() * scale.length)] + 12;
    } else {
      noteNumber = chord[pattern % chord.length] + (pattern > 2 ? 24 : 12);
    }
    note(scene, scene.arpInput, 'square', midi(noteNumber), time, time + duration * 0.8, {
        peak: 0.6,
        attack: 0.002,
        release: 0.04
      });
    scene.arpDelayA.delayTime.setValueAtTime(duration * 3, time);
    scene.arpDelayB.delayTime.setValueAtTime(duration * 3, time);
  }

  function scheduleBass(scene, chord, time, step, duration, random) {
    if (!GW.musicData.bassPattern[step]) {
      return;
    }
    var noteNumber = chord[0] - (random() < 0.25 ? 12 : 24);
    note(scene, scene.bassFilter, 'sawtooth', midi(noteNumber), time, time + duration, {
      peak: 0.08,
      attack: 0.004,
      release: 0.08,
      endHz: midi(noteNumber) * 0.985,
      filter: {type: 'lowpass', hz: 400, endHz: 160}
    });
  }

  function noiseNote(scene, destination, time, duration, type, cutoff, peak, endCutoff) {
    var buffer = GW.audio.noise.getBuffer('white');
    if (!buffer) {
      return;
    }
    var source = ctx().createBufferSource();
    var filter = ctx().createBiquadFilter();
    var envelope = ctx().createGain();
    var end = time + duration;
    source.buffer = buffer;
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, time);
    if (endCutoff) {
      filter.frequency.exponentialRampToValueAtTime(endCutoff, end);
    }
    envelope.gain.setValueAtTime(peak, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    addSource(scene, source, [filter, envelope]);
    source.start(time);
    source.stop(end);
  }

  function percussion(scene, time, step, duration, intensity) {
    var kickSteps = intensity >= 0.65 ?
      GW.musicData.drumPatterns.busyKick : GW.musicData.drumPatterns.kick;
    if (kickSteps.indexOf(step) !== -1) {
      note(scene, scene.layerGains.percussion, 'sine', 150, time, time + 0.12, {
        peak: 0.6,
        attack: 0.003,
        release: 0.09,
        endHz: 45
      });
    }
    if (intensity >= 0.65 || GW.musicData.drumPatterns.hat.indexOf(step) !== -1) {
      var open = step === 14;
      noiseNote(scene, scene.layerGains.percussion, time, open ? 0.12 : 0.03,
        'highpass', 7000, open ? 0.18 : 0.1);
    }
    if (intensity >= 0.65 && GW.musicData.drumPatterns.clap.indexOf(step) !== -1) {
      noiseNote(scene, scene.layerGains.percussion, time, 0.12, 'bandpass', 1800, 0.28);
      noiseNote(scene, scene.layerGains.percussion, time + 0.035, 0.1, 'bandpass', 1800, 0.08);
    }
  }

  function riser(scene, time, duration) {
    noiseNote(scene, scene.layerGains.tension, time, duration, 'lowpass', 160, 0.18, 3200);
  }

  function heartbeat(scene, time, duration) {
    note(scene, scene.layerGains.tension, 'sine', 55, time, time + 0.1, {
      peak: 0.18,
      attack: 0.003,
      release: 0.07,
      endHz: 42
    });
    note(scene, scene.layerGains.tension, 'sine', 55, time + 0.12, time + 0.2, {
      peak: 0.12,
      attack: 0.003,
      release: 0.05,
      endHz: 42
    });
  }

  function step(scene, info) {
    if (info.step === 0) {
      var barLength = info.stepDuration * 16;
      schedulePad(scene, info.chord, info.time, barLength);
      if (info.tension && info.bar % 4 === 0) {
        riser(scene, info.time, barLength * 4);
      }
    }
    if (info.intensity > 0.15 && scene.config.id !== 'menu' &&
        scene.config.id !== 'result') {
      scheduleArp(scene, info.chord, info.time, info.step, info.stepDuration, info.random);
    }
    if (info.intensity > 0.3 && !scene.config.padOnly) {
      scheduleBass(scene, info.chord, info.time, info.step, info.stepDuration, info.random);
    }
    if (scene.config.drums && info.intensity > 0.45) {
      percussion(scene, info.time, info.step, info.stepDuration, info.intensity);
    }
    if (info.tension && info.step % 4 === 0) {
      heartbeat(scene, info.time, info.stepDuration);
      if (info.step === 0 && info.bar % 2 === 0) {
        note(scene, scene.layerGains.tension, 'square', 660, info.time,
          info.time + info.stepDuration * 2, {
            peak: 0.08,
            attack: 0.003,
            release: 0.1,
            filter: {type: 'lowpass', hz: 1800}
          });
      }
    }
  }

  function fade(scene, milliseconds) {
    if (!scene || scene.stopping) {
      return;
    }
    scene.stopping = true;
    var now = ctx().currentTime;
    var duration = Math.max(0, Number(milliseconds) || 0) / 1000;
    var end = now + duration;
    try {
      scene.output.gain.cancelScheduledValues(now);
      scene.output.gain.setValueAtTime(scene.output.gain.value, now);
      scene.output.gain.linearRampToValueAtTime(0.0001, end);
    } catch (error) {
      GW.events.emit('musicparamerror', error);
    }
    scene.sources.slice().forEach(function (source) {
      try {
        source.stop(Math.max(now + 0.01, end));
      } catch (error) {
        GW.events.emit('musicstoperror', error);
      }
    });
    if (!scene.pending) {
      cleanup(scene);
    }
  }

  // Synthesized scene layers and scheduled note voices.
  GW.musicVoices = {
    create: create,
    update: update,
    step: step,
    fade: fade
  };
})(window.GW);
