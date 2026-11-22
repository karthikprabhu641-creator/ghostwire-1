(function (GW) {
  'use strict';

  function dateKey(date) {
    var value = date ? new Date(date) : new Date();
    if (Number.isNaN(value.getTime())) {
      throw new TypeError('Daily Heist date is invalid.');
    }
    return value.toISOString().slice(0, 10);
  }

  function hash(text) {
    var value = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function seed(date) {
    return hash('GHOSTWIRE-DAILY-' + dateKey(date));
  }

  function dayNumber(key) {
    return Math.floor(Date.parse(key + 'T00:00:00Z') / 86400000);
  }

  function get(date) {
    var key = dateKey(date);
    var daily = GW.store.load().daily;
    return {
      date: key,
      seed: seed(key),
      streak: Number(daily.streak) || 0,
      bestStreak: Number(daily.bestStreak) || 0,
      lastPlayed: daily.lastPlayed || null
    };
  }

  function start(date) {
    var result = get(date);
    var save = GW.store.load();
    var daily = save.daily;
    if (daily.lastPlayed !== result.date) {
      var previousDay = daily.lastPlayed ? dayNumber(daily.lastPlayed) : -2;
      var today = dayNumber(result.date);
      daily.streak = today - previousDay === 1 ? (Number(daily.streak) || 0) + 1 : 1;
      daily.bestStreak = Math.max(Number(daily.bestStreak) || 0, daily.streak);
      daily.lastPlayed = result.date;
      save.daily = daily;
      GW.store.save(save);
    }
    result.streak = Number(daily.streak) || 0;
    result.bestStreak = Number(daily.bestStreak) || 0;
    result.random = GW.rng.mulberry32(result.seed);
    GW.events.emit('dailystart', {
      date: result.date,
      seed: result.seed,
      streak: result.streak
    });
    return result;
  }

  function complete(date, dailySeed, ending) {
    var key = dateKey(date);
    var expectedSeed = seed(key);
    var value = Number(dailySeed) >>> 0;
    if (value !== expectedSeed) {
      throw new RangeError('Daily Heist seed does not match its date.');
    }
    if (ending !== 'ghost' && ending !== 'whistle') {
      throw new RangeError('Daily Heist ending is invalid.');
    }

    var save = GW.store.load();
    if (!save.daily.completions || typeof save.daily.completions !== 'object' ||
        Array.isArray(save.daily.completions)) {
      save.daily.completions = {};
    }
    if (Object.prototype.hasOwnProperty.call(save.daily.completions, key)) {
      return false;
    }
    save.daily.completions[key] = {seed: value, ending: ending};
    save.daily.lastCompleted = key;
    GW.store.save(save);
    GW.events.emit('dailycomplete', {date: key, seed: value, ending: ending});
    return true;
  }

  // Public Daily Heist contract: deterministic UTC date seed and streak lifecycle.
  GW.daily = {
    seed: seed,
    get: get,
    start: start,
    complete: complete
  };
})(window.GW);
