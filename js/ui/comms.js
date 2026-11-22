(function (GW) {
  'use strict';

  var pane;
  var messages = [];
  var choicePanel = null;

  function init() {
    pane = document.querySelector('.comms-pane');
  }

  function send(text) {
    if (!pane) {
      init();
    }
    if (!pane || typeof text !== 'string') {
      return;
    }
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    var toolsHeading = pane.querySelector('.tools-title');
    pane.insertBefore(bubble, toolsHeading || null);
    messages.push(bubble);
    while (messages.length > 6) {
      var old = messages.shift();
      if (old.parentNode) {
        old.parentNode.removeChild(old);
      }
    }
  }

  function showChoices(options, onChoice) {
    clearChoices();
    if (!pane) {
      init();
    }
    if (!pane) {
      return;
    }
    choicePanel = document.createElement('div');
    choicePanel.className = 'story-choices';
    options.forEach(function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.text;
      button.addEventListener('click', function () {
        clearChoices();
        onChoice(option.id);
      });
      choicePanel.appendChild(button);
    });
    pane.insertBefore(choicePanel, pane.querySelector('.tools-title') || null);
  }

  function clearChoices() {
    if (choicePanel && choicePanel.parentNode) {
      choicePanel.parentNode.removeChild(choicePanel);
    }
    choicePanel = null;
  }

  GW.comms = {
    init: init,
    send: send,
    showChoices: showChoices,
    clearChoices: clearChoices
  };
})(window.GW);
