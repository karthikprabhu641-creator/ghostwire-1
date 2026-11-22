(function (GW) {
  'use strict';

  var bootScreen;
  var bootLines;
  var menuScreen;
  var settingsScreen;
  var gameScreen;
  var terminalReady = false;

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
    GW.music.start('menu');
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
          GW.store.set('activeRun', {mode: 'story'});
          showGame();
        } else if (action === 'daily') {
          var run = GW.daily.start();
          GW.store.set('activeRun', {
            mode: 'daily',
            date: run.date,
            seed: run.seed
          });
          showGame();
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
    reduceMotion.addEventListener('change', function () {
      document.documentElement.classList.toggle('reduce-motion', reduceMotion.checked);
      GW.store.set('reduceMotion', reduceMotion.checked);
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
