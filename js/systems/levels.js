(function (GW) {
  'use strict';

  var registry = Object.create(null);
  var active = null;
  var generation = 0;

  function register(level) {
    if (!level || typeof level.id !== 'string' || !level.id.trim()) {
      throw new TypeError('A level must have a non-empty id.');
    }
    if (registry[level.id]) {
      throw new Error('Level already registered: ' + level.id);
    }
    registry[level.id] = level;
  }

  function list() {
    return Object.keys(registry).map(function (id) {
      return registry[id];
    });
  }

  function get(id) {
    return registry[id] || null;
  }

  function teardownCurrent() {
    if (!active) {
      return;
    }
    var previous = active;
    active = null;
    GW.trace.stop();
    if (typeof previous.definition.teardown === 'function') {
      previous.definition.teardown(previous.context);
    }
    GW.events.emit('levelteardown', {id: previous.definition.id});
  }

  function start(id, options) {
    var definition = get(id);
    if (!definition) {
      throw new RangeError('Level is not registered: ' + id);
    }
    options = options || {};
    teardownCurrent();

    generation += 1;
    var context = Object.assign({}, options, {
      id: definition.id,
      generation: generation,
      seed: options.seed
    });
    active = {definition: definition, context: context};
    GW.trace.reset();
    GW.score.startLevel(definition.id, {
      par: definition.par,
      difficulty: options.difficulty,
      dailySeed: options.dailySeed
    });
    GW.events.emit('levelstart', {id: definition.id, context: context});
    GW.trace.start(options.difficulty);

    try {
      if (typeof definition.setup === 'function') {
        definition.setup(context);
      }
    } catch (error) {
      teardownCurrent();
      throw error;
    }
    return context;
  }

  function handleCommand(name, args, parsed) {
    if (!active || typeof active.definition.onCommand !== 'function') {
      return false;
    }
    var commands = active.definition.commands || [];
    var allowed = commands.some(function (command) {
      if (typeof command === 'string') {
        return command === name;
      }
      return command.name === name || (command.aliases || []).indexOf(name) !== -1;
    });
    if (!allowed) {
      return false;
    }
    GW.score.addAttempt();
    var result = active.definition.onCommand(name, args, parsed, active.context);
    if (typeof active.definition.isComplete === 'function' &&
        active.definition.isComplete(active.context)) {
      finish({success: true});
    }
    return true;
  }

  function finish(result) {
    if (!active) {
      return null;
    }
    result = result || {};
    var previous = active;
    var record;
    try {
      record = GW.score.finishLevel({
        success: result.success !== false,
        trace: GW.trace.get()
      });
    } finally {
      active = null;
      GW.trace.stop();
      if (typeof previous.definition.teardown === 'function') {
        previous.definition.teardown(previous.context);
      }
    }
    GW.events.emit('levelcomplete', {
      id: previous.definition.id,
      success: result.success !== false,
      record: record
    });
    return record;
  }

  GW.events.on('tracefail', function () {
    if (active) {
      finish({success: false});
    }
  });

  // Public level contract: register, load, dispatch commands, finish, and inspect lifecycle state.
  GW.levels = {
    register: register,
    list: list,
    get: get,
    load: start,
    start: start,
    finish: finish,
    teardown: teardownCurrent,
    handleCommand: handleCommand,
    current: function () {
      return active ? active.definition : null;
    },
    context: function () {
      return active ? active.context : null;
    }
  };
})(window.GW);
