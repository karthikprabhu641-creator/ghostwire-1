(function (GW) {
  'use strict';

  var copy = GW.text.levels.L3;
  var words = ['ORBIT', 'LEDGER', 'SIGNAL', 'GHOST', 'VAULT', 'EMBER', 'CIPHER'];

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function rotate(value, amount) {
    return value.split('').map(function (letter) {
      var code = letter.charCodeAt(0) - 65;
      return String.fromCharCode(65 + (code + amount + 26) % 26);
    }).join('');
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var plain = GW.rng.pick(random, words);
    var shift = GW.rng.int(random, 1, 5);
    var puzzle = {
      plain: plain,
      shift: shift,
      cipher: rotate(plain, shift),
      solution: [
        {name: 'cat', args: ['cipher.note']},
        {name: 'decode', args: [rotate(plain, shift)]},
        {name: 'verify', args: [plain]}
      ]
    };
    return puzzle;
  }

  function prove(puzzle) {
    return puzzle.shift >= 1 && puzzle.shift <= 5 &&
      rotate(puzzle.cipher, -puzzle.shift) === puzzle.plain &&
      puzzle.solution[0].args[0] === 'cipher.note' &&
      puzzle.solution[1].args[0] === puzzle.cipher &&
      puzzle.solution[2].args[0] === puzzle.plain;
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L3 generated an invalid Caesar cipher.');
    }
    context.puzzle = puzzle;
    context.seenNote = false;
    context.decoded = false;
    context.complete = false;
    context.hintIndex = 0;
    GW.story.send(copy.story.intro);
    print('brief');
  }

  function wrong() {
    GW.trace.add(5, 'level:L3');
    print('wrong', null, 'err');
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      if (context.hintIndex >= copy.hints.length) {
        print('hintsSpent', null, 'warn');
        return;
      }
      GW.score.addHint();
      GW.trace.add(2, 'hint:L3');
      GW.terminal.print(copy.hints[context.hintIndex], 'warn');
      context.hintIndex += 1;
    } else if (name === 'cat' && args[0] === 'cipher.note') {
      context.seenNote = true;
      print('cipherNote', {
        cipher: context.puzzle.cipher,
        shift: context.puzzle.shift
      });
    } else if (name === 'decode' && context.seenNote &&
        String(args[0] || '').toUpperCase() === context.puzzle.cipher) {
      context.decoded = true;
      print('decoded', {plain: context.puzzle.plain}, 'ok');
    } else if (name === 'verify' && context.decoded &&
        String(args[0] || '').toUpperCase() === context.puzzle.plain) {
      context.complete = true;
      print('opened', null, 'ok');
      GW.story.send(copy.story.complete);
    } else {
      wrong();
    }
  }

  function teardown(context) {
    delete context.puzzle;
    delete context.solution;
  }

  GW.levels.register({
    id: 'L3',
    title: copy.title,
    brief: copy.brief,
    par: 210,
    commands: ['cat', 'decode', 'verify', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.complete; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);