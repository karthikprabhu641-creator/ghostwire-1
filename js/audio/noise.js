(function (GW) {
  'use strict';

  var owner = null;
  var buffers = Object.create(null);

  function createBuffers(context) {
    if (owner === context && buffers.white && buffers.pink) {
      return;
    }
    owner = context;
    buffers = Object.create(null);
    var length = Math.floor(context.sampleRate * 2);
    var white = context.createBuffer(1, length, context.sampleRate);
    var pink = context.createBuffer(1, length, context.sampleRate);
    var whiteData = white.getChannelData(0);
    var pinkData = pink.getChannelData(0);
    var b0 = 0;
    var b1 = 0;
    var b2 = 0;
    var b3 = 0;
    var b4 = 0;
    var b5 = 0;
    var b6 = 0;

    for (var index = 0; index < length; index += 1) {
      var sample = Math.random() * 2 - 1;
      whiteData[index] = sample * 0.6;
      b0 = 0.99886 * b0 + sample * 0.0555179;
      b1 = 0.99332 * b1 + sample * 0.0750759;
      b2 = 0.969 * b2 + sample * 0.153852;
      b3 = 0.8665 * b3 + sample * 0.3104856;
      b4 = 0.55 * b4 + sample * 0.5329522;
      b5 = -0.7616 * b5 - sample * 0.016898;
      pinkData[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + sample * 0.5362) * 0.11;
      b6 = sample * 0.115926;
    }
    buffers.white = white;
    buffers.pink = pink;
  }

  function getBuffer(type) {
    return buffers[type] || null;
  }

  // Noise buffers are synthesized once per AudioContext and shared by all recipes.
  GW.audio = GW.audio || {};
  GW.audio.noise = {
    createBuffers: createBuffers,
    getBuffer: getBuffer
  };
})(window.GW);
