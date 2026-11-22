(function (GW) {
  'use strict';

  var prefix = 'GW:';
  var memory = Object.create(null);
  var storageUnavailable = false;

  function defaultSave() {
    return {
      schemaVersion: 1,
      progress: {},
      stats: {},
      leaderboard: [],
      daily: {},
      story: {}
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeSave(value) {
    if (!isRecord(value)) {
      throw new TypeError('Save data must be an object.');
    }
    if (value.schemaVersion !== undefined && value.schemaVersion > 1) {
      throw new RangeError('Save data was created by a newer version.');
    }

    var base = defaultSave();
    var legacy = Object.assign({}, value);
    delete legacy.schemaVersion;
    delete legacy.progress;
    delete legacy.stats;
    delete legacy.leaderboard;
    delete legacy.daily;
    delete legacy.story;

    base.schemaVersion = 1;
    base.progress = isRecord(value.progress) ? value.progress : {};
    base.stats = isRecord(value.stats) ? value.stats : {};
    base.leaderboard = Array.isArray(value.leaderboard) ? value.leaderboard : [];
    base.daily = isRecord(value.daily) ? value.daily : {};
    base.story = isRecord(value.story) ? value.story : {};
    if (Object.keys(legacy).length) {
      base.progress.legacy = Object.assign(
        {},
        isRecord(base.progress.legacy) ? base.progress.legacy : {},
        legacy
      );
    }
    return clone(base);
  }

  function reportStorageFailure(error) {
    if (storageUnavailable) {
      return;
    }
    storageUnavailable = true;
    if (GW.events) {
      GW.events.emit('storageunavailable', error);
    }
  }

  function get(key, fallback) {
    try {
      var value = window.localStorage.getItem(prefix + key);
      if (value === null) {
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
      }
      return JSON.parse(value);
    } catch (error) {
      reportStorageFailure(error);
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
    }
  }

  function set(key, value) {
    var encoded;
    try {
      encoded = JSON.stringify(value);
    } catch (error) {
      return false;
    }

    memory[key] = value;
    try {
      window.localStorage.setItem(prefix + key, encoded);
      return true;
    } catch (error) {
      reportStorageFailure(error);
      return false;
    }
  }

  function load() {
    var current = get('save', null);
    if (current === null) {
      return defaultSave();
    }
    try {
      return normalizeSave(current);
    } catch (error) {
      GW.events.emit('saveinvalid', error);
      return defaultSave();
    }
  }

  function save(value) {
    var data = normalizeSave(value === undefined ? load() : value);
    return set('save', data);
  }

  function reset() {
    memory = Object.create(null);
    try {
      for (var index = window.localStorage.length - 1; index >= 0; index -= 1) {
        var key = window.localStorage.key(index);
        if (key && key.indexOf(prefix) === 0) {
          window.localStorage.removeItem(key);
        }
      }
      return true;
    } catch (error) {
      reportStorageFailure(error);
      return false;
    }
  }

  function exportSave() {
    return JSON.stringify(load());
  }

  function importSave(text) {
    var value;
    try {
      value = JSON.parse(text);
      value = normalizeSave(value);
    } catch (error) {
      return false;
    }
    set('save', value);
    return true;
  }

  // Public storage contract: namespaced persistence with memory fallback and portable saves.
  GW.store = {
    get: get,
    set: set,
    save: save,
    load: load,
    reset: reset,
    export: exportSave,
    import: importSave
  };
})(window.GW);
