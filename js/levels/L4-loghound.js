(function (GW) {
  'use strict';

  var copy = GW.text.levels.L4;

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function suspects(logs) {
    var counts = Object.create(null);
    logs.forEach(function (entry) {
      counts[entry.node] = counts[entry.node] || {};
      counts[entry.node][entry.result] =
        (counts[entry.node][entry.result] || 0) + 1;
    });
    return Object.keys(counts).filter(function (node) {
      return counts[node][copy.deniedLabel] > 0 && counts[node][copy.grantedLabel] > 0;
    });
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var nodes = GW.rng.shuffle(random, copy.nodes);
    var target = GW.rng.pick(random, nodes);
    var logs = [];
    nodes.forEach(function (node) {
      logs.push({node: node, result: copy.grantedLabel});
      if (node === target) {
        logs.push({node: node, result: copy.deniedLabel});
      }
    });
    logs = GW.rng.shuffle(random, logs);
    return {
      logs: logs,
      target: target,
      solution: [
        {name: 'cat', args: ['auth.log']},
        {name: 'trace', args: [target]}
      ]
    };
  }

  function prove(puzzle) {
    var matches = suspects(puzzle.logs);
    return matches.length === 1 && matches[0] === puzzle.target &&
      puzzle.solution[0].args[0] === 'auth.log' &&
      puzzle.solution[1].args[0] === puzzle.target;
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L4 generated an ambiguous authentication log.');
    }
    context.puzzle = puzzle;
    context.logRead = false;
    context.complete = false;
    context.hintIndex = 0;
    GW.story.send(copy.story.intro);
    print('brief');
  }

  function wrong(context) {
    GW.trace.add(5, 'level:L4');
    print('wrong', null, 'err');
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      if (context.hintIndex >= copy.hints.length) {
        print('hintsSpent', null, 'warn');
        return;
      }
      GW.score.addHint();
      GW.trace.add(2, 'hint:L4');
      GW.terminal.print(copy.hints[context.hintIndex], 'warn');
      context.hintIndex += 1;
    } else if (name === 'cat' && args[0] === 'auth.log') {
      context.logRead = true;
      GW.terminal.print(copy.logHeading, 'intel');
      GW.terminal.printLines(context.puzzle.logs.map(function (entry) {
        return format(copy.logLine, {node: entry.node, result: entry.result});
      }), 'sys');
    } else if (name === 'trace' && context.logRead &&
        args[0] === context.puzzle.target) {
      context.complete = true;
      print('completeText', null, 'ok');
      GW.story.send(copy.story.complete);
    } else {
      wrong(context);
    }
  }

  function teardown(context) {
    delete context.puzzle;
  }

  GW.levels.register({
    id: 'L4',
    title: copy.title,
    brief: copy.brief,
    par: 220,
    commands: ['cat', 'trace', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.complete; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);