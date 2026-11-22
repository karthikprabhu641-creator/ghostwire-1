(function (GW) {
  'use strict';

  var context = null;
  var buses = Object.create(null);
  var masterGain = null;
  var compressor = null;
  var limiter = null;
  var musicLimiter = null;
  var voices = [];
  var ambientOutput = null;
  var ambientFilter = null;
  var status = 'locked';
  var pageHidden = false;
  var traceLevel = 0;
  var nextVoiceId = 0;
  var maxPolyphony = 16;
  var readyNotified = false;

  function notice(message) {
    var element = document.getElementById('audio-notice');
    if (!element) {
      return;
    }
    element.textContent = message || '';
    element.hidden = !message;
  }

  function audioText(name, fallback) {
    return GW.text && GW.text.audio && GW.text.audio[name] ?
      GW.text.audio[name] : fallback;
  }

  function report(error) {
    status = 'unavailable';
    notice(audioText('unavailable', 'AUDIO UNAVAILABLE'));
    GW.events.emit('audioerror', error);
  }

  function setParam(param, value, time) {
    if (!param || !context) {
      return;
    }
    try {
      var now = context.currentTime;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, time || 0.025);
    } catch (error) {
      GW.events.emit('audioparamerror', error);
    }
  }

  function setupGraph() {
    masterGain = context.createGain();
    compressor = context.createDynamicsCompressor();
    limiter = context.createDynamicsCompressor();
    musicLimiter = context.createDynamicsCompressor();

    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.12;
    limiter.threshold.value = -3;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    musicLimiter.threshold.value = -12;
    musicLimiter.ratio.value = 20;
    musicLimiter.attack.value = 0.001;
    musicLimiter.release.value = 0.12;

    masterGain.gain.value = 0.8;
    compressor.connect(limiter);
    limiter.connect(context.destination);
    masterGain.connect(compressor);

    ['sfx', 'music', 'amb'].forEach(function (name) {
      var bus = context.createGain();
      bus.gain.value = name === 'sfx' ? 0.9 : name === 'music' ? 0.5 : 0.35;
      bus.connect(name === 'music' ? musicLimiter : masterGain);
      buses[name] = bus;
    });
    musicLimiter.connect(masterGain);

    if (GW.audio.mixer) {
      GW.audio.mixer.apply();
    }
    createAmbience();
  }

  function createAmbience() {
    var buffer = GW.audio.noise.getBuffer('pink');
    if (!buffer) {
      return;
    }
    var source = context.createBufferSource();
    var filter = context.createBiquadFilter();
    var gain = context.createGain();
    var lfo = context.createOscillator();
    var lfoGain = context.createGain();

    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    gain.gain.value = 0.05 + (traceLevel / 100) * 0.03;
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 120;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(buses.amb);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    source.start();
    lfo.start();
    ambientOutput = gain;
    ambientFilter = filter;
  }

  function createContext() {
    var AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) {
      report(new Error('Web Audio API is not supported.'));
      return false;
    }
    try {
      context = new AudioContextType();
      GW.audio.noise.createBuffers(context);
      setupGraph();
      status = context.state === 'running' ? 'ready' : 'locked';
      return true;
    } catch (error) {
      context = null;
      report(error);
      return false;
    }
  }

  function unlock() {
    if (status === 'unavailable') {
      return Promise.resolve(false);
    }
    if (!context && !createContext()) {
      return Promise.resolve(false);
    }
    if (context.state === 'running') {
      announceReady();
      return Promise.resolve(true);
    }

    try {
      return context.resume().then(function () {
        if (context.state === 'running') {
          announceReady();
        } else {
          status = 'locked';
        }
        notice(status === 'ready' ? '' : audioText('enable', 'CLICK TO ENABLE AUDIO'));
        return status === 'ready';
      }).catch(function (error) {
        status = 'locked';
        notice(audioText('enable', 'CLICK TO ENABLE AUDIO'));
        GW.events.emit('audioresumeerror', error);
        return false;
      });
    } catch (error) {
      status = 'locked';
      notice(audioText('enable', 'CLICK TO ENABLE AUDIO'));
      GW.events.emit('audioresumeerror', error);
      return Promise.resolve(false);
    }

    function announceReady() {
      status = 'ready';
      notice('');
      if (!readyNotified) {
        readyNotified = true;
        GW.events.emit('audioready');
      }
    }
  }

  function destroyVoice(voice) {
    if (voice.closed) {
      return;
    }
    voice.closed = true;
    voice.nodes.forEach(function (node) {
      try {
        node.disconnect();
      } catch (error) {
        GW.events.emit('audiodisconnecterror', error);
      }
    });
    voices = voices.filter(function (entry) {
      return entry !== voice;
    });
  }

  function stopVoice(voice) {
    if (!voice || voice.closed) {
      return;
    }
    voice.sources.forEach(function (source) {
      try {
        source.stop();
      } catch (error) {
        GW.events.emit('audiostoperror', error);
      }
    });
    if (!voice.sources.length) {
      destroyVoice(voice);
    }
  }

  function createVoice(priority) {
    if (!context || context.state !== 'running' || pageHidden || !buses.sfx) {
      return null;
    }
    if (voices.length >= maxPolyphony) {
      var oldestLowPriority = voices.slice().sort(function (left, right) {
        return left.priority - right.priority || left.createdAt - right.createdAt;
      })[0];
      stopVoice(oldestLowPriority);
    }

    var output = context.createGain();
    output.gain.value = 0.0001;
    output.connect(buses.sfx);
    var voice = {
      id: nextVoiceId += 1,
      priority: priority || 0,
      createdAt: context.currentTime,
      output: output,
      nodes: [output],
      sources: [],
      pending: 0,
      sealed: false,
      closed: false
    };
    voices.push(voice);
    return voice;
  }

  function addNode(voice, node) {
    if (voice && node) {
      voice.nodes.push(node);
    }
  }

  function addSource(voice, source) {
    if (!voice || !source) {
      return;
    }
    voice.nodes.push(source);
    voice.sources.push(source);
    voice.pending += 1;
    source.addEventListener('ended', function () {
      voice.pending -= 1;
      if (voice.sealed && voice.pending <= 0) {
        destroyVoice(voice);
      }
    }, {once: true});
  }

  function finishVoice(voice) {
    if (!voice || voice.closed) {
      return;
    }
    voice.sealed = true;
    if (voice.pending <= 0) {
      destroyVoice(voice);
    }
  }

  function setBusGain(name, value) {
    if (name === 'master') {
      if (masterGain) {
        setParam(masterGain.gain, value);
      }
      return;
    }
    if (buses[name]) {
      setParam(buses[name].gain, value);
    }
  }

  function duckMusic() {
    if (!context || !buses.music || context.state !== 'running') {
      return;
    }
    try {
      var base = GW.audio.mixer ? GW.audio.mixer.get().music : 0.5;
      var param = buses.music.gain;
      var now = context.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(base * 0.631, now + 0.04);
      param.setValueAtTime(base * 0.631, now + 0.6);
      param.linearRampToValueAtTime(base, now + 0.8);
    } catch (error) {
      GW.events.emit('audioduckerror', error);
    }
  }

  function setTrace(value) {
    traceLevel = Math.max(0, Math.min(100, Number(value) || 0));
    if (ambientOutput && context) {
      setParam(ambientOutput.gain, 0.05 + (traceLevel / 100) * 0.03);
    }
  }

  function pause() {
    pageHidden = true;
    if (context && context.state === 'running') {
      try {
        context.suspend().catch(function (error) {
          GW.events.emit('audiosuspenderror', error);
        });
      } catch (error) {
        GW.events.emit('audiosuspenderror', error);
      }
    }
  }

  function resume() {
    pageHidden = false;
    if (context && context.state !== 'running') {
      unlock();
    }
  }

  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pause();
    } else {
      resume();
    }
  });
  GW.events.on('storymessage', duckMusic);
  GW.events.on('tracechange', function (event) { setTrace(event.value); });
  notice(audioText('enable', 'CLICK TO ENABLE AUDIO'));

  GW.audio = GW.audio || {};
  GW.audio.engine = {
    unlock: unlock,
    createVoice: createVoice,
    addNode: addNode,
    addSource: addSource,
    finishVoice: finishVoice,
    stopVoice: stopVoice,
    setBusGain: setBusGain,
    duckMusic: duckMusic,
    getContext: function () { return context; },
    getBus: function (name) { return buses[name] || null; },
    getStatus: function () { return status; },
    getVoiceCount: function () { return voices.length; },
    isReady: function () { return Boolean(context && context.state === 'running'); }
  };
})(window.GW);
