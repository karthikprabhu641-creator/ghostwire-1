(function (GW) {
  'use strict';

  var activeRun = null;
  var totalScore = 0;
  var rankRows = [
    {minimum: 900, rank: 'S'},
    {minimum: 750, rank: 'A'},
    {minimum: 550, rank: 'B'},
    {minimum: 350, rank: 'C'},
    {minimum: 0, rank: 'D'}
  ];

  function startLevel(levelId, options) {
    options = options || {};
    activeRun = {
      levelId: levelId,
      startedAt: Date.now(),
      parSeconds: Math.max(1, Number(options.par) || 180),
      hints: 0,
      attempts: 0,
      difficulty: options.difficulty || 'Operator',
      dailySeed: options.dailySeed || null
    };
    GW.events.emit('scorelevelstart', activeRun);
    return activeRun;
  }

  function calc(result) {
    result = result || {};
    var elapsed = Math.max(0, Number(result.elapsedSeconds) || 0);
    var par = Math.max(1, Number(result.parSeconds) || 180);
    var trace = Math.max(0, Math.min(100, Number(result.trace) || 0));
    var hints = Math.max(0, Number(result.hints) || 0);
    var attempts = Math.max(0, Number(result.attempts) || 0);
    if (result.success === false) {
      return 0;
    }

    var timeBonus = Math.max(0, Math.floor((par - elapsed) * 2));
    return Math.max(0, Math.round(
      1000 + timeBonus - trace * 4 - hints * 80 - attempts * 15
    ));
  }

  function rank(score) {
    var value = Math.max(0, Number(score) || 0);
    for (var index = 0; index < rankRows.length; index += 1) {
      if (value >= rankRows[index].minimum) {
        return rankRows[index].rank;
      }
    }
    return 'D';
  }

  function finishLevel(result) {
    if (!activeRun) {
      throw new Error('Cannot finish a level before starting one.');
    }
    result = result || {};
    var elapsed = Math.max(0, (Date.now() - activeRun.startedAt) / 1000);
    var record = {
      levelId: activeRun.levelId,
      success: result.success !== false,
      score: calc({
        success: result.success !== false,
        elapsedSeconds: result.elapsedSeconds === undefined ? elapsed : result.elapsedSeconds,
        parSeconds: activeRun.parSeconds,
        trace: result.trace === undefined ? GW.trace.get() : result.trace,
        hints: result.hints === undefined ? activeRun.hints : result.hints,
        attempts: result.attempts === undefined ? activeRun.attempts : result.attempts
      }),
      elapsedSeconds: Math.round(elapsed),
      trace: GW.trace.get(),
      difficulty: activeRun.difficulty,
      dailySeed: activeRun.dailySeed,
      completedAt: new Date().toISOString()
    };
    record.rank = rank(record.score);
    totalScore += record.score;

    var save = GW.store.load();
    save.stats.totalScore = (Number(save.stats.totalScore) || 0) + record.score;
    save.stats.levelsPlayed = (Number(save.stats.levelsPlayed) || 0) + 1;
    if (record.success) {
      save.progress[record.levelId] = {
        completed: true,
        bestScore: Math.max(
          Number(save.progress[record.levelId] && save.progress[record.levelId].bestScore) || 0,
          record.score
        )
      };
    }
    save.leaderboard.push(record);
    save.leaderboard.sort(function (left, right) {
      return right.score - left.score || left.completedAt.localeCompare(right.completedAt);
    });
    save.leaderboard = save.leaderboard.slice(0, 10);
    GW.store.save(save);

    activeRun = null;
    GW.events.emit('scorelevelend', record);
    return record;
  }

  function listLeaderboard() {
    return GW.store.load().leaderboard.slice();
  }

  function formatLeaderboard() {
    var rows = listLeaderboard();
    if (!rows.length) {
      return 'NO LOCAL RUNS';
    }
    return rows.map(function (row, index) {
      return (index + 1) + '. ' + row.score + '  ' + row.rank +
        '  ' + row.levelId + '  ' + row.difficulty;
    }).join('\n');
  }

  function shareCode(record) {
    record = record || {};
    var fields = [
      'GW1',
      String(Math.max(0, Number(record.score) || totalScore)).toString(36).toUpperCase(),
      String(record.rank || rank(record.score || totalScore)),
      String(record.dailySeed || 'RUN')
    ];
    var source = fields.join('-');
    var checksum = 2166136261;
    for (var index = 0; index < source.length; index += 1) {
      checksum ^= source.charCodeAt(index);
      checksum = Math.imul(checksum, 16777619);
    }
    return source + '-' + (checksum >>> 0).toString(36).toUpperCase();
  }

  // Public scoring contract: level lifecycle, scoring, ranks, and local leaderboard.
  GW.score = {
    startLevel: startLevel,
    finishLevel: finishLevel,
    calc: calc,
    rank: rank,
    leaderboard: listLeaderboard,
    formatLeaderboard: formatLeaderboard,
    shareCode: shareCode,
    getTotal: function () { return totalScore; },
    getActiveRun: function () { return activeRun; },
    addHint: function () { if (activeRun) { activeRun.hints += 1; } },
    addAttempt: function () { if (activeRun) { activeRun.attempts += 1; } }
  };
})(window.GW);
