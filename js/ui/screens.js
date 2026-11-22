(function (GW) {
  'use strict';

  var bootScreen;
  var bootLines;
  var menuScreen;
  var settingsScreen;
  var gameScreen;
  var terminalReady = false;
  var levelOrder = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

  function startRun(mode, seed, metadata) {
    var runSeed = Number(seed) >>> 0;
    var run = Object.assign({}, metadata || {}, {
      mode: mode,
      seed: runSeed,
      dailySeed: mode === 'daily' ? runSeed : null
    });
    GW.store.set('activeRun', run);
    GW.story.clear();
    showGame();
    GW.levels.start('L0', {
      seed: runSeed,
      dailySeed: run.dailySeed,
      dailyDate: run.date
    });
  }

  function startFollowingLevel(event) {
    if (!event.success) {
      return;
    }
    var index = levelOrder.indexOf(event.id);
    if (index < 0 || index >= levelOrder.length - 1) {
      return;
    }
    var run = GW.store.get('activeRun', {});
    var seed = Number(run.seed) >>> 0;
    var nextIndex = index + 1;
    var nextSeed = (seed + Math.imul(nextIndex, 0x9E3779B9)) >>> 0;
    GW.levels.start(levelOrder[nextIndex], {
      seed: nextSeed,
      dailySeed: run.dailySeed,
      dailyDate: run.date
    });
  }

  function createLine(text) {
    var line = document.createElement('div');
    line.textContent = text;
    bootLines.appendChild(line);
  }

  function init() {
    bootScreen = document.getElementById('boot-screen');
    bootLines = document.getElementById('boot-lines');
    menuScreen = document.getElementById('menu-screen');
    settingsScreen = document.getElementById('settings-screen');
    gameScreen = document.getElementById('game-screen');
    var reduceMotion = GW.store.get('reduceMotion', null);
    var motionQuery = typeof window.matchMedia === 'function' ?
      window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    document.documentElement.classList.toggle('reduce-motion',
      Boolean(reduceMotion) || Boolean(motionQuery && motionQuery.matches));
    if (motionQuery) {
      var updateSystemMotion = function (event) {
        var savedPreference = GW.store.get('reduceMotion', null);
        document.documentElement.classList.toggle('reduce-motion',
          Boolean(savedPreference) || event.matches);
        GW.events.emit('motionchange', {reduced: GW.fx.reducedMotion()});
      };
      if (typeof motionQuery.addEventListener === 'function') {
        motionQuery.addEventListener('change', updateSystemMotion);
      } else if (typeof motionQuery.addListener === 'function') {
        motionQuery.addListener(updateSystemMotion);
      }
    }

    var lines = [
      'AURUM BIOS v9.4',
      'VERIFYING FICTIONAL NETWORK',
      'MOUNTING VAULT-9',
      'VESPER LINK: STANDBY',
      'WELCOME, GHOST.'
    ];
    var index = 0;
    var timer;

    function nextLine() {
      if (index >= lines.length) {
        timer = window.setTimeout(showMenu, 400);
        return;
      }
      createLine(lines[index]);
      index += 1;
      timer = window.setTimeout(nextLine, 180);
    }

    function finish() {
      if (timer) {
        window.clearTimeout(timer);
      }
      showMenu();
    }

    document.getElementById('skip-boot').addEventListener('click', finish);
    nextLine();
    bindMenu();
    bindSettings();
    bindGame();
  }

  function showMenu() {
    bootScreen.hidden = true;
    settingsScreen.hidden = true;
    gameScreen.hidden = true;
    menuScreen.hidden = false;
    if (GW.rain) {
      GW.rain.stop();
    }
    if (GW.static) {
      GW.static.stop();
    }
    if (GW.tunnel) {
      GW.tunnel.skip();
    }
    GW.music.start('menu');
    if (GW.glitch) {
      GW.glitch.play(menuScreen.querySelector('h1'));
    }
    menuScreen.querySelector('.menu-item:not(:disabled)').focus();
  }

  function showSettings() {
    menuScreen.hidden = true;
    settingsScreen.hidden = false;
    document.getElementById('settings-back').focus();
  }

  function showGame() {
    menuScreen.hidden = true;
    settingsScreen.hidden = true;
    gameScreen.hidden = false;
    GW.music.start('L0');
    GW.hud.init();

    if (!terminalReady) {
      GW.terminal.init();
      terminalReady = true;
    } else {
      document.getElementById('terminal-input').focus();
    }
  }

  function bindMenu() {
    menuScreen.querySelectorAll('.menu-item').forEach(function (item) {
      item.addEventListener('click', function () {
        GW.audio.sfx.play('ui_select');
        var action = item.dataset.action;
        if (action === 'settings') {
          showSettings();
        } else if (action === 'new-run') {
          startRun('story', Date.now());
        } else if (action === 'daily') {
          var run = GW.daily.start();
          startRun('daily', run.seed, {date: run.date});
          GW.terminal.print(
            GW.text.daily.header + ' // ' + run.date + ' // ' +
            GW.text.daily.seed + ' ' + run.seed + ' // ' +
            GW.text.daily.streak + ' ' + run.streak,
            'warn'
          );
        } else if (action === 'how-to') {
          window.alert('Type help and press Enter. Read every file. Hints cost trace.');
        } else if (action === 'leaderboard') {
          window.alert(GW.text.leaderboard.title + '\n' + GW.score.formatLeaderboard());
        }
      });
    });

    menuScreen.addEventListener('keydown', function (event) {
      var items = Array.prototype.slice.call(
        menuScreen.querySelectorAll('.menu-item:not(:disabled)')
      );
      var index = items.indexOf(document.activeElement);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(index + 1) % items.length].focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
      }
    });
  }

  function bindSettings() {
    var settingsBack = document.getElementById('settings-back');
    settingsBack.addEventListener('click', function () {
      GW.audio.sfx.play('ui_back');
      showMenu();
    });

    var audioSettings = GW.audio.mixer.get();
    settingsScreen.querySelectorAll('[data-audio-bus]').forEach(function (slider) {
      var bus = slider.dataset.audioBus;
      slider.value = Math.round(audioSettings[bus] * 100);
      slider.addEventListener('input', function () {
        GW.audio.mixer.setVolume(bus, Number(slider.value) / 100);
      });
    });
    var mute = settingsScreen.querySelector('[data-audio-mute]');
    mute.checked = audioSettings.muted;
    mute.addEventListener('change', function () {
      GW.audio.mixer.setMuted(mute.checked);
    });

    var reduceMotion = document.getElementById('reduce-motion');
    reduceMotion.checked = document.documentElement.classList.contains('reduce-motion');
    reduceMotion.addEventListener('change', function () {
      GW.store.set('reduceMotion', reduceMotion.checked);
      var systemReduced = typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.documentElement.classList.toggle('reduce-motion',
        reduceMotion.checked || systemReduced);
      GW.events.emit('motionchange', {reduced: GW.fx.reducedMotion()});
    });

    var quality = settingsScreen.querySelector('[data-quality]');
    quality.value = GW.quality.getMode();
    quality.addEventListener('change', function () {
      GW.quality.setMode(quality.value);
    });

    var reset = settingsScreen.querySelector('[data-setting="reset"]');
    reset.addEventListener('click', function () {
      if (window.confirm('Reset all local GHOSTWIRE progress?')) {
        GW.store.reset();
      }
    });

    settingsScreen.querySelector('[data-setting="export"]').addEventListener('click', function () {
      window.prompt('SAVE EXPORT', GW.store.export());
    });

    settingsScreen.querySelector('[data-setting="import"]').addEventListener('click', function () {
      var text = window.prompt('PASTE SAVE');
      if (text) {
        window.alert(GW.store.import(text) ? 'SAVE IMPORTED' : 'INVALID SAVE');
      }
    });
  }

  function bindGame() {
    GW.comms.init();
    GW.events.on('levelcomplete', startFollowingLevel);
    document.getElementById('menu-button').addEventListener('click', showMenu);

    document.querySelectorAll('[data-command]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = document.getElementById('terminal-input');
        input.value = button.dataset.command;
        input.focus();
        if (button.dataset.command.indexOf(' ') === -1) {
          GW.parser.run(input.value);
          input.value = '';
        }
      });
    });

    document.querySelectorAll('.mobile-tabs button').forEach(function (button) {
      button.addEventListener('click', function () {
        var pane = button.dataset.pane;
        var grid = document.querySelector('.game-grid');
        document.querySelectorAll('.mobile-tabs button').forEach(function (tab) {
          tab.classList.remove('active');
        });
        button.classList.add('active');
        grid.classList.remove('mobile-map', 'mobile-comms', 'mobile-tools');
        if (pane === 'map') {
          grid.classList.add('mobile-map');
        } else if (pane === 'comms') {
          grid.classList.add('mobile-comms');
        } else if (pane === 'tools') {
          grid.classList.add('mobile-tools');
        }
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !gameScreen.hidden) {
        showMenu();
      }
    });
  }

  GW.screens = {
    init: init,
    showMenu: showMenu,
    showSettings: showSettings,
    showGame: showGame
  };
})(window.GW);
