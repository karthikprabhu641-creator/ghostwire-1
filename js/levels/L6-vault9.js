(function (GW) {
  'use strict';

  var copy = GW.text.levels.L6;

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function digitSum(code) {
    return String(code).split('').reduce(function (sum, digit) {
      return sum + Number(digit);
    }, 0);
  }

  function makeKeys(random) {
    var pool = [];
    for (var code = 100; code <= 999; code += 1) {
      pool.push({code: code, sum: digitSum(code)});
    }
    var selected = [];
    var sums = Object.create(null);
    GW.rng.shuffle(random, pool).some(function (entry) {
      if (!sums[entry.sum]) {
        sums[entry.sum] = true;
        selected.push(entry.code);
      }
      return selected.length === 4;
    });
    var key = selected[GW.rng.int(random, 0, selected.length - 1)];
    return {
      candidates: selected,
      checksum: digitSum(key),
      key: key
    };
  }

  function makeRoute(random) {
    var relays = GW.rng.shuffle(random, copy.nodes.slice(1, 4));
    var path = [copy.nodes[0]].concat(relays, [copy.nodes[5]]);
    var ice = copy.nodes[4];
    var graph = [];
    for (var index = 0; index < path.length - 1; index += 1) {
      graph.push({from: path[index], to: path[index + 1]});
    }
    graph.push({from: path[0], to: ice});
    graph.push({from: ice, to: path[path.length - 1]});
    return {path: path, ice: ice, graph: graph};
  }

  function countSafePaths(graph, start, target, ice, visited) {
    if (start === ice || visited.indexOf(start) !== -1) {
      return 0;
    }
    if (start === target) {
      return 1;
    }
    var nextVisited = visited.concat(start);
    return graph.filter(function (edge) {
      return edge.from === start && edge.to !== ice;
    }).reduce(function (count, edge) {
      return count + countSafePaths(graph, edge.to, target, ice, nextVisited);
    }, 0);
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var signals = GW.rng.shuffle(random, copy.signals).slice(0, 3);
    var route = makeRoute(random);
    var keys = makeKeys(random);
    return {
      signals: signals,
      route: route,
      keys: keys,
      solution: [
        {name: 'cat', args: ['vault.plan']},
        {name: 'pulse', args: signals.slice()},
        {name: 'cat', args: ['vault.plan']},
        {name: 'route', args: route.path.slice()},
        {name: 'cat', args: ['vault.plan']},
        {name: 'authorize', args: [String(keys.key)]}
      ]
    };
  }

  function prove(puzzle) {
    var matchingKeys = puzzle.keys.candidates.filter(function (code) {
      return digitSum(code) === puzzle.keys.checksum;
    });
    return puzzle.signals.length === 3 &&
      new Set(puzzle.signals).size === 3 &&
      puzzle.solution[1].args.join('|') === puzzle.signals.join('|') &&
      countSafePaths(
        puzzle.route.graph,
        copy.nodes[0],
        copy.nodes[5],
        puzzle.route.ice,
        []
      ) === 1 &&
      puzzle.solution[3].args.join('|') === puzzle.route.path.join('|') &&
      matchingKeys.length === 1 &&
      String(matchingKeys[0]) === puzzle.solution[5].args[0];
  }

  function showPhase(context) {
    print('phase', {
      phase: context.phase,
      name: copy.phaseNames[context.phase - 1]
    }, 'warn');
  }

  function showPlan(context) {
    var puzzle = context.puzzle;
    if (context.phase === 1) {
      print('signalLog', {
        one: puzzle.signals[0],
        two: puzzle.signals[1],
        three: puzzle.signals[2]
      }, 'intel');
    } else if (context.phase === 2) {
      GW.terminal.print(copy.mapHeading, 'intel');
      GW.terminal.printLines(puzzle.route.graph.map(function (edge) {
        return format(copy.edgeLine, {
          from: edge.from,
          to: edge.to,
          risk: edge.to === puzzle.route.ice ? copy.iceLabel : copy.safeLabel
        });
      }), 'sys');
    } else {
      print('keyring', {
        codes: puzzle.keys.candidates.join(', '),
        checksum: puzzle.keys.checksum
      }, 'intel');
    }
  }

  function completeEnding(context, selected) {
    print('endingHeader', {ending: selected.id}, 'story');
    GW.terminal.print(copy.endings[selected.id], 'story');
    GW.story.send(copy.endings[selected.id], {echo: false});
    if (context.dailyDate && context.dailySeed !== null &&
        context.dailySeed !== undefined && GW.daily.complete(
          context.dailyDate,
          context.dailySeed,
          selected.id
        )) {
      GW.terminal.print(format(copy.dailyComplete, {
        seed: context.dailySeed,
        ending: selected.id
      }), 'ok');
    }
    GW.events.emit('gameending', {
      ending: selected.id,
      dailyDate: context.dailyDate || null
    });
  }

  function offerEnding(context) {
    GW.story.send(copy.story.choice);
    context.selectEnding = GW.story.choice([
      {id: 'ghost', text: copy.storyChoices.ghost},
      {id: 'whistle', text: copy.storyChoices.whistle}
    ], function (selected) {
      completeEnding(context, selected);
    });
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L6 generated an unsolvable vault sequence.');
    }
    context.puzzle = puzzle;
    context.phase = 1;
    context.planRead = false;
    context.complete = false;
    context.hintIndex = 0;
    GW.events.emit('bossphase', {phase: context.phase});
    GW.story.send(copy.story.intro);
    showPhase(context);
  }

  function wrong(context) {
    GW.trace.add(context.phase * 3, 'level:L6:phase:' + context.phase);
    print('wrong', null, 'err');
  }

  function advance(context) {
    print('phaseClear', {phase: context.phase}, 'ok');
    if (context.phase < 3) {
      context.phase += 1;
      context.planRead = false;
      GW.events.emit('bossphase', {phase: context.phase});
      showPhase(context);
      GW.story.send(context.phase === 2 ? copy.story.phase2 : copy.story.phase3);
      return;
    }
    context.complete = true;
    print('completeText', null, 'ok');
    offerEnding(context);
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      if (context.hintIndex >= copy.hints.length) {
        print('hintsSpent', null, 'warn');
        return;
      }
      GW.score.addHint();
      GW.trace.add(3, 'hint:L6:phase:' + context.phase);
      GW.terminal.print(copy.hints[context.hintIndex], 'warn');
      context.hintIndex += 1;
    } else if (name === 'cat' && args[0] === 'vault.plan') {
      context.planRead = true;
      showPlan(context);
    } else if (context.phase === 1 && name === 'pulse' &&
        context.planRead && args.join('|') === context.puzzle.signals.join('|')) {
      advance(context);
    } else if (context.phase === 2 && name === 'route' &&
        context.planRead && args.join('|') === context.puzzle.route.path.join('|')) {
      advance(context);
    } else if (context.phase === 3 && name === 'authorize' &&
        context.planRead && args[0] === String(context.puzzle.keys.key)) {
      advance(context);
    } else {
      wrong(context);
    }
  }

  function teardown(context) {
    delete context.puzzle;
    delete context.selectEnding;
  }

  GW.levels.register({
    id: 'L6',
    title: copy.title,
    brief: copy.brief,
    par: 360,
    commands: ['cat', 'pulse', 'route', 'authorize', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.complete; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);