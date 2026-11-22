(function (GW) {
  'use strict';

  var copy = GW.text.levels.L0;
  var services = ['relay', 'archive', 'uplink', 'beacon'];

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function penalize() {
    GW.trace.add(3, 'level:L0');
    print('wrong', null, 'err');
  }

  function advance(puzzle, step, name, args) {
    if (step === 0 && name === 'cat' && args[0] === 'boot.log') {
      return 1;
    }
    if (step === 1 && name === 'scan' && args[0] === puzzle.service) {
      return 2;
    }
    if (step === 2 && name === 'connect' && args[0] === String(puzzle.port)) {
      return 3;
    }
    return step;
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var puzzle = {
      service: GW.rng.pick(random, services),
      port: GW.rng.int(random, 3100, 8900)
    };
    puzzle.solution = [
      {name: 'cat', args: ['boot.log']},
      {name: 'scan', args: [puzzle.service]},
      {name: 'connect', args: [String(puzzle.port)]}
    ];
    return puzzle;
  }

  function prove(puzzle) {
    var state = 0;
    puzzle.solution.forEach(function (command) {
      state = advance(puzzle, state, command.name, command.args);
    });
    return state === 3 && puzzle.solution.length === 3;
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L0 generated an unsolvable boot sequence.');
    }
    context.puzzle = puzzle;
    context.step = 0;
    context.hintIndex = 0;
    GW.story.send(copy.story.intro);
    print('brief');
  }

  function hint(context) {
    if (context.hintIndex >= copy.hints.length) {
      print('hintsSpent', null, 'warn');
      return;
    }
    GW.score.addHint();
    GW.trace.add(2, 'hint:L0');
    GW.terminal.print(copy.hints[context.hintIndex], 'warn');
    context.hintIndex += 1;
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      hint(context);
      return;
    }
    var before = context.step;
    context.step = advance(context.puzzle, context.step, name, args);
    if (context.step === before) {
      penalize();
      return;
    }
    if (name === 'cat') {
      print('bootLog', {service: context.puzzle.service});
    } else if (name === 'scan') {
      print('scan', {service: context.puzzle.service, port: context.puzzle.port}, 'ok');
    } else if (context.step === 3) {
      print('connected', null, 'ok');
      GW.story.send(copy.story.complete);
    }
  }

  function teardown(context) {
    delete context.puzzle;
    delete context.solution;
  }

  GW.levels.register({
    id: 'L0',
    title: copy.title,
    brief: copy.brief,
    par: 90,
    commands: ['cat', 'scan', 'connect', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.step === 3; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);