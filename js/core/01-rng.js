(function (GW) {
  'use strict';

  function mulberry32(seed) {
    var value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      var t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function int(random, min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  function pick(random, values) {
    return values[int(random, 0, values.length - 1)];
  }

  function shuffle(random, values) {
    var copy = values.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = int(random, 0, i);
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  GW.rng = {mulberry32: mulberry32, int: int, pick: pick, shuffle: shuffle};
})(window.GW);
