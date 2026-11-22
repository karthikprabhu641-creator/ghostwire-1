(function (GW) {
  'use strict';

  function attach(input, handlers) {
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && handlers.submit) {
        event.preventDefault();
        handlers.submit(input.value);
      } else if (event.key === 'Tab' && handlers.complete) {
        event.preventDefault();
        handlers.complete();
      } else if (event.key === 'ArrowUp' && handlers.historyUp) {
        event.preventDefault();
        handlers.historyUp();
      } else if (event.key === 'ArrowDown' && handlers.historyDown) {
        event.preventDefault();
        handlers.historyDown();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'l' && handlers.clear) {
        event.preventDefault();
        handlers.clear();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'c' && handlers.cancel) {
        event.preventDefault();
        handlers.cancel();
      }
    });

    input.addEventListener('input', function () {
      if (handlers.change) {
        handlers.change(input.value);
      }
    });
  }

  GW.input = {attach: attach};
})(window.GW);
