(function (GW) {
  'use strict';

  var queue = [];
  var wait = 0;
  var paused = false;
  var activeChoices = null;

  function send(text, options) {
    if (typeof text !== 'string' || !text.trim()) {
      throw new TypeError('Story messages must be non-empty strings.');
    }
    options = options || {};
    queue.push({
      text: text,
      delay: Math.max(600, Math.min(1400, Number(options.delay) || 900)),
      echo: options.echo !== false,
      branch: options.branch || null
    });
    GW.events.emit('storyqueued', {text: text, count: queue.length});
    return queue.length;
  }

  function update(delta) {
    if (paused || !queue.length) {
      return;
    }
    if (wait > 0) {
      wait = Math.max(0, wait - delta * 1000);
      return;
    }
    var message = queue.shift();
    wait = message.delay;
    if (GW.comms && typeof GW.comms.send === 'function') {
      GW.comms.send(message.text);
    }
    if (message.echo && GW.terminal && document.getElementById('terminal-output')) {
      GW.terminal.print('VESPER: ' + message.text, 'comms');
    }
    if (message.branch) {
      GW.events.emit('storybranch', message.branch);
    }
    GW.events.emit('storymessage', message);
  }

  function choice(options, callback) {
    if (!Array.isArray(options) || !options.length) {
      throw new TypeError('Story choices must be a non-empty array.');
    }
    activeChoices = options.map(function (option, index) {
      if (!option || typeof option.id !== 'string' || typeof option.text !== 'string') {
        throw new TypeError('Each story choice needs a string id and text.');
      }
      return {id: option.id, text: option.text, index: index};
    });
    GW.events.emit('storychoices', activeChoices.slice());

    function select(id) {
      if (!activeChoices) {
        return false;
      }
      var selected = activeChoices.filter(function (option) {
        return option.id === id;
      })[0];
      if (!selected) {
        return false;
      }
      activeChoices = null;
      var save = GW.store.load();
      save.story.lastChoice = selected.id;
      if (selected.id === 'ghost' || selected.id === 'whistle') {
        save.story.ending = selected.id;
        GW.events.emit('storyending', {ending: selected.id});
      }
      GW.store.save(save);
      GW.events.emit('storychoice', selected);
      if (typeof callback === 'function') {
        callback(selected);
      }
      return true;
    }

    if (GW.comms && typeof GW.comms.showChoices === 'function') {
      GW.comms.showChoices(activeChoices, select);
    }
    return select;
  }

  function clear() {
    queue = [];
    wait = 0;
    activeChoices = null;
    if (GW.comms && typeof GW.comms.clearChoices === 'function') {
      GW.comms.clearChoices();
    }
  }

  GW.loop.subscribe(update, null);
  GW.events.on('hidden', function () { paused = true; });
  GW.events.on('visible', function () { paused = false; });
  // Public story contract: queue messages and resolve branch choices.
  GW.story = {
    send: send,
    choice: choice,
    clear: clear,
    pending: function () { return queue.length; },
    getChoices: function () { return activeChoices ? activeChoices.slice() : []; }
  };
})(window.GW);
