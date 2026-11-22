(function (GW) {
  'use strict';

  GW.musicData = {
    chords: {
      Am: [57, 60, 64],
      F: [53, 57, 60],
      C: [60, 64, 67],
      G: [55, 59, 62],
      Dm: [62, 65, 69],
      E: [52, 56, 59]
    },
    progressions: {
      menu: ['Am', 'Am', 'F', 'F'],
      L0: ['Am', 'Am', 'F', 'F'],
      L1: ['Am', 'F', 'C', 'G'],
      L2: ['Am', 'F', 'C', 'G'],
      L3: ['Am', 'F', 'Dm', 'E'],
      L4: ['Am', 'G', 'F', 'E'],
      L5: ['Am', 'Am', 'F', 'E'],
      L6: ['Am', 'F', 'Dm', 'E', 'Am', 'G', 'F', 'E'],
      result: ['Am', 'F', 'C', 'G']
    },
    tempos: {
      menu: 76,
      L0: 90,
      L1: 96,
      L2: 100,
      L3: 104,
      L4: 108,
      L5: 112,
      L6: 124,
      result: 76
    },
    arpScale: [57, 60, 62, 64, 67],
    arpPattern: [0, 1, 2, 1, 0, 2, 3, 2, 0, 1, 2, 1, 3, 2, 1, 0],
    bassPattern: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    drumPatterns: {
      kick: [0, 10],
      busyKick: [0, 4, 8, 12],
      hat: [2, 6, 10, 14],
      clap: [4, 12]
    }
  };
})(window.GW);
