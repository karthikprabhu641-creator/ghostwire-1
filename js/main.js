(function (GW) {
  'use strict';

  GW.parser.register({
    name: 'help',
    aliases: [],
    help: 'List available commands.',
    run: function () {
      GW.terminal.printLines([
        'AVAILABLE COMMANDS',
        '  help  - list commands',
        '  ls    - list virtual files',
        '  clear - clear the terminal'
      ], 'sys');
    }
  });

  GW.parser.register({
    name: 'ls',
    aliases: [],
    help: 'List virtual files.',
    run: function () {
      GW.terminal.printLines([
        'drwxr-xr-x  ghost  vault',
        '-rw-r--r--  ghost  README.txt',
        '-rw-r--r--  ghost  TRACE.log'
      ], 'ok');
    }
  });

  GW.parser.register({
    name: 'clear',
    aliases: [],
    help: 'Clear the terminal.',
    run: function () {
      GW.terminal.clear();
    }
  });

  GW.screens.init();
  GW.loop.subscribe(function (delta) {
    GW.quality.update(delta);
  }, null);
  GW.loop.start();

  document.addEventListener('visibilitychange', function () {
    GW.events.emit(document.hidden ? 'hidden' : 'visible');
  });
})(window.GW);
