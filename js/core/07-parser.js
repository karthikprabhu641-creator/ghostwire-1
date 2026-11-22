(function (GW) {
  'use strict';

  var commands = Object.create(null);

  function register(command) {
    commands[command.name] = command;
    (command.aliases || []).forEach(function (alias) {
      commands[alias] = command;
    });
  }

  function parse(text) {
    var parts = text.trim().split(/\s+/);
    return {
      name: (parts.shift() || '').toLowerCase(),
      args: parts
    };
  }

  function distance(left, right) {
    var row = [];
    for (var i = 0; i <= right.length; i += 1) {
      row[i] = i;
    }
    for (var j = 1; j <= left.length; j += 1) {
      var diagonal = j - 1;
      for (var k = 1; k <= right.length; k += 1) {
        var previous = row[k];
        row[k] = Math.min(
          row[k] + 1,
          row[k - 1] + 1,
          diagonal + (left[j - 1] === right[k - 1] ? 0 : 1)
        );
        diagonal = previous;
      }
    }
    return row[right.length];
  }

  function run(text) {
    var parsed = parse(text);
    var command = commands[parsed.name];
    if (!parsed.name) {
      return;
    }
    if (command) {
      return command.run(parsed.args, parsed);
    }
    if (GW.levels && GW.levels.handleCommand(parsed.name, parsed.args, parsed)) {
      return;
    }

    var names = Object.keys(commands).filter(function (name, index, values) {
      return values.indexOf(name) === index;
    });
    var nearest = names
      .map(function (name) {
        return {name: name, distance: distance(parsed.name, name)};
      })
      .filter(function (entry) {
        return entry.distance <= 2;
      })
      .sort(function (left, right) {
        return left.distance - right.distance;
      })[0];

    if (GW.audio && GW.audio.sfx) {
      GW.audio.sfx.play('error_buzz');
    }
    GW.terminal.print(
      'COMMAND NOT FOUND: ' + parsed.name +
      (nearest ? '. Did you mean "' + nearest.name + '"?' : '.'),
      'err'
    );
  }

  function autocomplete(text) {
    var trimmed = text.trimStart();
    var names = [];
    Object.keys(commands).forEach(function (name) {
      if (names.indexOf(name) === -1) {
        names.push(name);
      }
    });
    var matches = names.filter(function (name) {
      return name.indexOf(trimmed.toLowerCase()) === 0;
    }).sort();
    if (!trimmed || matches.length === 0) {
      return null;
    }
    if (matches.length === 1) {
      return matches[0].length > trimmed.length ? matches[0] : null;
    }
    return matches[0].slice(0, longestCommonPrefix(matches));
  }

  function longestCommonPrefix(names) {
    if (!names.length) {
      return 0;
    }
    var prefix = names[0];
    for (var i = 1; i < names.length; i += 1) {
      while (names[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1);
      }
    }
    return prefix.length;
  }

  GW.parser = {
    register: register,
    parse: parse,
    run: run,
    autocomplete: autocomplete
  };
})(window.GW);
