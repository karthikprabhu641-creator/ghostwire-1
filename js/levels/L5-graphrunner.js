(function (GW) {
  'use strict';

  var copy = GW.text.levels.L5;

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function print(key, values, type) {
    GW.terminal.print(format(copy[key], values || {}), type || 'sys');
  }

  function edgesFor(path, ice) {
    return [
      {from: path[0], to: path[1]},
      {from: path[1], to: path[2]},
      {from: path[2], to: path[3]},
      {from: path[3], to: path[4]},
      {from: path[0], to: ice},
      {from: ice, to: path[4]}
    ];
  }

  function safePathCount(graph, start, target, ice, visited) {
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
      return count + safePathCount(graph, edge.to, target, ice, nextVisited);
    }, 0);
  }

  function generate(seed) {
    var random = GW.rng.mulberry32(Number(seed) >>> 0);
    var relays = GW.rng.shuffle(random, copy.nodes.slice(1, 4));
    var path = [copy.nodes[0]].concat(relays, [copy.nodes[5]]);
    var ice = copy.nodes[4];
    var graph = edgesFor(path, ice);
    return {
      path: path,
      ice: ice,
      graph: graph,
      solution: [
        {name: 'cat', args: ['graph.map']},
        {name: 'route', args: path.slice()}
      ]
    };
  }

  function prove(puzzle) {
    return puzzle.path[0] === copy.nodes[0] &&
      puzzle.path[puzzle.path.length - 1] === copy.nodes[5] &&
      safePathCount(puzzle.graph, copy.nodes[0], copy.nodes[5], puzzle.ice, []) === 1 &&
      puzzle.solution[0].args[0] === 'graph.map' &&
      puzzle.solution[1].args.join('|') === puzzle.path.join('|');
  }

  function setup(context) {
    var puzzle = generate(context.seed);
    if (!prove(puzzle)) {
      throw new Error('L5 generated a route without a unique safe path.');
    }
    context.puzzle = puzzle;
    context.mapRead = false;
    context.complete = false;
    context.hintIndex = 0;
    GW.story.send(copy.story.intro);
    print('brief');
  }

  function wrong() {
    GW.trace.add(6, 'level:L5');
    print('wrong', null, 'err');
  }

  function onCommand(name, args, parsed, context) {
    if (name === 'hint') {
      if (context.hintIndex >= copy.hints.length) {
        print('hintsSpent', null, 'warn');
        return;
      }
      GW.score.addHint();
      GW.trace.add(2, 'hint:L5');
      GW.terminal.print(copy.hints[context.hintIndex], 'warn');
      context.hintIndex += 1;
    } else if (name === 'cat' && args[0] === 'graph.map') {
      context.mapRead = true;
      GW.terminal.print(copy.mapHeading, 'intel');
      GW.terminal.printLines(context.puzzle.graph.map(function (edge) {
        return format(copy.edgeLine, {
          from: edge.from,
          to: edge.to,
          risk: edge.to === context.puzzle.ice ? copy.iceLabel : copy.safeLabel
        });
      }), 'sys');
    } else if (name === 'route' && context.mapRead &&
        args.join('|') === context.puzzle.path.join('|')) {
      context.complete = true;
      print('completeText', null, 'ok');
      GW.story.send(copy.story.complete);
    } else {
      wrong();
    }
  }

  function teardown(context) {
    delete context.puzzle;
  }

  GW.levels.register({
    id: 'L5',
    title: copy.title,
    brief: copy.brief,
    par: 240,
    commands: ['cat', 'route', 'hint'],
    setup: setup,
    onCommand: onCommand,
    isComplete: function (context) { return context.complete; },
    hints: copy.hints,
    teardown: teardown,
    generate: generate,
    prove: prove
  });
})(window.GW);