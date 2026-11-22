(function (GW) {
  'use strict';

  var defaults = {
    master: 0.8,
    sfx: 0.9,
    music: 0.5,
    ambience: 0.35,
    muted: false
  };
  var settings = Object.assign({}, defaults);

  function clamp(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function persist() {
    GW.store.set('audio-settings', Object.assign({}, settings));
  }

  function apply() {
    var engine = GW.audio.engine;
    engine.setBusGain('master', settings.muted ? 0 : settings.master);
    engine.setBusGain('sfx', settings.sfx);
    engine.setBusGain('music', settings.music);
    engine.setBusGain('amb', settings.ambience);
  }

  function init() {
    var saved = GW.store.get('audio-settings', null);
    if (saved && typeof saved === 'object') {
      settings.master = clamp(saved.master === undefined ? defaults.master : saved.master);
      settings.sfx = clamp(saved.sfx === undefined ? defaults.sfx : saved.sfx);
      settings.music = clamp(saved.music === undefined ? defaults.music : saved.music);
      settings.ambience = clamp(saved.ambience === undefined ? defaults.ambience : saved.ambience);
      settings.muted = saved.muted === true;
    }
    apply();
    persist();
  }

  function setVolume(name, value) {
    if (!Object.prototype.hasOwnProperty.call(defaults, name) || name === 'muted') {
      throw new RangeError('Unknown audio bus: ' + name);
    }
    var numeric = Number(value);
    settings[name] = clamp(numeric);
    apply();
    persist();
    GW.events.emit('audiovolumechange', {bus: name, value: settings[name]});
  }

  function setMuted(value) {
    settings.muted = Boolean(value);
    apply();
    persist();
    GW.events.emit('audiomutechange', settings.muted);
  }

  function duck() {
    GW.audio.engine.duckMusic();
  }

  GW.audio = GW.audio || {};
  GW.audio.mixer = {
    init: init,
    apply: apply,
    setVolume: setVolume,
    setMuted: setMuted,
    duck: duck,
    get: function () { return Object.assign({}, settings); }
  };
})(window.GW);
