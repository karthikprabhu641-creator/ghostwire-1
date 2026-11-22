(function (GW) {
  'use strict';

  var output;
  var input;
  var ghost;
  var inputRow;
  var history = [];
  var historyIndex = 0;

  function init() {
    output = document.getElementById('terminal-output');
    input = document.getElementById('terminal-input');
    ghost = document.getElementById('terminal-ghost');
    inputRow = input.closest('.terminal-input-row');
    historyIndex = 0;

    GW.input.attach(input, {
      submit: submit,
      complete: complete,
      historyUp: historyUp,
      historyDown: historyDown,
      clear: clear,
      cancel: cancel,
      change: change
    });

    input.focus();
  }

  function submit(text) {
    var command = text.trim();
    if (!command) {
      return;
    }
    print('ghost@vault9:~$ ' + command, 'sys');
    history.push(command);
    historyIndex = history.length;
    input.value = '';
    ghost.textContent = '';
    GW.parser.run(command);
  }

  function print(text, type) {
    var line = document.createElement('div');
    line.className = 'terminal-line ' + (type || 'sys');
    line.textContent = text;
    output.insertBefore(line, inputRow);
    scrollLatest();
    if (type === 'err' && GW.events) {
      GW.events.emit('inputerror', {target: line});
    }
    return line;
  }

  function printLines(lines, type) {
    lines.forEach(function (line) {
      print(line, type);
    });
  }

  function clear() {
    Array.prototype.slice.call(output.children).forEach(function (child) {
      if (child !== inputRow) {
        child.remove();
      }
    });
    input.value = '';
    ghost.textContent = '';
    input.focus();
  }

  function type(text, typeName, callback) {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var line = document.createElement('div');
    line.className = 'terminal-line ' + (typeName || 'sys');
    output.insertBefore(line, inputRow);

    if (reduced) {
      line.textContent = text;
      if (callback) {
        callback();
      }
      return;
    }

    var index = 0;
    function step() {
      line.textContent = text.slice(0, index);
      index += 1;
      scrollLatest();
      if (index <= text.length) {
        window.setTimeout(step, 10);
      } else if (callback) {
        callback();
      }
    }
    step();
  }

  function complete() {
    var value = GW.parser.autocomplete(input.value);
    if (!value) {
      return;
    }
    if (value.length > input.value.trim().length) {
      input.value = value;
      ghost.textContent = '';
      change(input.value);
    }
  }

  function change(text) {
    var suggestion = GW.parser.autocomplete(text);
    ghost.textContent = suggestion ? suggestion.slice(text.length) : '';
  }

  function historyUp() {
    if (historyIndex > 0) {
      historyIndex -= 1;
      input.value = history[historyIndex];
      change(input.value);
    }
  }

  function historyDown() {
    if (historyIndex < history.length - 1) {
      historyIndex += 1;
      input.value = history[historyIndex];
    } else {
      historyIndex = history.length;
      input.value = '';
    }
    change(input.value);
  }

  function cancel() {
    input.value = '';
    ghost.textContent = '';
  }

  function scrollLatest() {
    output.scrollTop = output.scrollHeight;
  }

  GW.terminal = {
    init: init,
    print: print,
    printLines: printLines,
    clear: clear,
    type: type
  };
})(window.GW);
