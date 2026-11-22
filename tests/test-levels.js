(function (GW) {
  'use strict';

  var status = document.getElementById('test-status');
  var output = document.getElementById('test-results');
  var lines = [];
  var count = 0;
  GW.terminal = {
    print: function () {},
    printLines: function () {},
    clear: function () {},
    type: function () {}
  };

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function exercise(level, seed) {
    var generated = level.generate(seed);
    var repeat = level.generate(seed);
    assert(JSON.stringify(generated) === JSON.stringify(repeat),
      level.id + ' was not deterministic at seed ' + seed);
    assert(level.prove(generated), level.id + ' failed its solvability proof at seed ' + seed);

    var context = {seed: seed};
    level.setup(context);
    generated.solution.forEach(function (command) {
      level.onCommand(command.name, command.args.slice(), {}, context);
    });
    assert(level.isComplete(context), level.id + ' solution failed at seed ' + seed);
    level.teardown(context);
    GW.story.clear();

    GW.trace.reset();
    context = {seed: seed};
    level.setup(context);
    level.onCommand('cat', ['invalid.log'], {}, context);
    assert(GW.trace.get() > 0, level.id + ' missing wrong-command trace penalty');
    level.onCommand('hint', [], {}, context);
    assert(GW.trace.get() > 0, level.id + ' missing hint trace cost');
    level.teardown(context);
    GW.story.clear();
  }

  function exerciseEndings() {
    var level = GW.levels.get('L6');
    ['ghost', 'whistle'].forEach(function (ending) {
      var context = {seed: 912734};
      level.setup(context);
      context.puzzle.solution.forEach(function (command) {
        level.onCommand(command.name, command.args.slice(), {}, context);
      });
      assert(context.complete && typeof context.selectEnding === 'function',
        'L6 did not offer the ending choice');
      assert(context.selectEnding(ending), 'L6 rejected ending ' + ending);
      assert(GW.store.load().story.ending === ending, 'Ending was not saved: ' + ending);
      level.teardown(context);
      GW.story.clear();
    });
  }

  function exerciseDaily() {
    var date = '2026-11-22';
    var seed = GW.daily.seed(date);
    assert(seed === GW.daily.seed(date), 'Daily seed changed for the same date');
    var context = {seed: seed, dailySeed: seed, dailyDate: date};
    var level = GW.levels.get('L6');
    level.setup(context);
    context.puzzle.solution.forEach(function (command) {
      level.onCommand(command.name, command.args.slice(), {}, context);
    });
    assert(context.selectEnding('whistle'), 'Daily ending selection failed');
    assert(GW.store.load().daily.completions[date].seed === seed,
      'Daily completion did not record its date seed');
    level.teardown(context);
    GW.story.clear();
  }

  try {
    ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'].forEach(function (id) {
      var level = GW.levels.get(id);
      assert(level, 'Missing level ' + id);
      assert(Array.isArray(level.hints) && level.hints.length === 3,
        id + ' must provide exactly three hints');
      for (var index = 0; index < 200; index += 1) {
        exercise(level, (Math.imul(index + 1, 2654435761) + id.charCodeAt(1)) >>> 0);
        count += 1;
      }
      lines.push(id + ' PASS // 200 seeded puzzles, deterministic and solvable');
    });
    exerciseEndings();
    exerciseDaily();
    lines.push('L6 PASS // Ghost and Whistle endings');
    lines.push('DAILY PASS // deterministic seed and completion record');
    status.textContent = 'PASS // ' + count + ' SEEDED PUZZLE RUNS';
    output.textContent = lines.join('\n');
  } catch (error) {
    status.textContent = 'FAIL';
    output.textContent = lines.concat(error.stack || error.message).join('\n');
    throw error;
  }
})(window.GW);