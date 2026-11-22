(function (GW) {
  'use strict';

  var copy = GW.text.levels.L1;
  var colors = ['amber', 'cyan', 'violet', 'white', 'green'];

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function matches(expected, args) {
    return expected.length === args.length &&
      expected.every(function (color, index) {
        return color === String(args[index] || '').toLowerCase();
      });
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var slots = GW.rng.shuffle(random, colors).slice(0, 3);
    var puzzle = {
      slots: slots,
      solution: [
        {name: 'cat', args: ['door.log']},
        {name: 'knock', args: slots.slice()}
      ]
    };
    return puzzle;
  }

  function prove(puzzle) {
    return puzzle.slots.length === 3 &&
      new Set(puzzle.slots).size === 3 &&
      puzzle.solution[0].name === 'cat' &&
      puzzle.solution[0].args[0] === 'door.log' &&
      puzzle.solution[1].name === 'knock' &&
      matches(puzzle.slots, puzzle.solution[1].args);
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L1 generated an invalid knock sequence.');
    }
    context.puzzle = puzzle;
    context.seenLog = false;
    context.complete = false;
    context.hintIndex = 0;
    GW.story.send(copy.story.intro);
    print('brief');
  }

  function wrong() {
    GW.trace.add(4, 'level:L1');
    print('wrong', null, 'err');
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      if (context.hintIndex >= copy.hints.length) {
        print('hintsSpent', null, 'warn');
        return;
      }
      GW.score.addHint();
      GW.trace.add(2, 'hint:L1');
      GW.terminal.print(copy.hints[context.hintIndex], 'warn');
      context.hintIndex += 1;
    } else if (name === 'cat' && args[0] === 'door.log') {
      context.seenLog = true;
      print('doorLog', {
        one: context.puzzle.slots[0],
        two: context.puzzle.slots[1],
        three: context.puzzle.slots[2]
      });
    } else if (name === 'knock' && context.seenLog &&
        matches(context.puzzle.slots, args)) {
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
    id: 'L1',
    title: copy.title,
    brief: copy.brief,
    par: 150,
    commands: ['cat', 'knock', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.complete; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);