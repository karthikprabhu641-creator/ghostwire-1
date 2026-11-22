(function (GW) {
  'use strict';

  var copy = GW.text.levels.L2;

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function digitSum(code) {
    return String(code).split('').reduce(function (sum, digit) {
      return sum + Number(digit);
    }, 0);
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var codes = [];
    var sums = Object.create(null);
    var pool = [];
    for (var code = 100; code <= 999; code += 1) {
      pool.push({code: code, sum: digitSum(code)});
    }
    GW.rng.shuffle(random, pool).some(function (entry) {
      var sum = entry.sum;
      if (!sums[sum]) {
        sums[sum] = true;
        codes.push(entry.code);
      }
      return codes.length === 4;
    });
    var solutionIndex = GW.rng.int(random, 0, codes.length - 1);
    var puzzle = {
      candidates: codes,
      checksum: digitSum(codes[solutionIndex]),
      solution: [
        {name: 'cat', args: ['crackline/keyring.log']},
        {name: 'crack', args: [String(codes[solutionIndex])]}
      ]
    };
    return puzzle;
  }

  function prove(puzzle) {
    var matches = puzzle.candidates.filter(function (code) {
      return digitSum(code) === puzzle.checksum;
    });
    return puzzle.candidates.length === 4 &&
      new Set(puzzle.candidates).size === puzzle.candidates.length &&
      matches.length === 1 &&
      String(matches[0]) === puzzle.solution[1].args[0];
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L2 generated an ambiguous keyring.');
    }
    context.puzzle = puzzle;
    context.seenLog = false;
    context.complete = false;
    context.hintIndex = 0;
    GW.story.send(copy.story.intro);
    print('brief');
  }

  function wrong() {
    GW.trace.add(5, 'level:L2');
    print('wrong', null, 'err');
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      if (context.hintIndex >= copy.hints.length) {
        print('hintsSpent', null, 'warn');
        return;
      }
      GW.score.addHint();
      GW.trace.add(2, 'hint:L2');
      GW.terminal.print(copy.hints[context.hintIndex], 'warn');
      context.hintIndex += 1;
    } else if (name === 'cat' && args[0] === 'crackline/keyring.log') {
      context.seenLog = true;
      print('keyring', {
        codes: context.puzzle.candidates.join(', '),
        checksum: context.puzzle.checksum
      });
    } else if (name === 'crack' && context.seenLog &&
        args[0] === context.puzzle.solution[1].args[0]) {
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
    id: 'L2',
    title: copy.title,
    brief: copy.brief,
    par: 180,
    commands: ['cat', 'crack', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.complete; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);