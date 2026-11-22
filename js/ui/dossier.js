(function (GW) {
  'use strict';

  function format(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return values[key] === undefined ? match : values[key];
    });
  }

  function shake(widget) {
    if (GW.fx.reducedMotion()) {
      return;
    }
    widget.classList.remove('rank-stamp-shake');
    void widget.offsetWidth;
    widget.classList.add('rank-stamp-shake');
  }

  function stamp(rank) {
    var widget = document.querySelector('.score-widget');
    if (!widget) {
      return false;
    }
    var value = format(GW.text.effects.rankStamp, {rank: rank});
    var element = document.createElement('span');
    element.className = 'rank-stamp';
    element.setAttribute('role', 'status');
    element.textContent = value;
    widget.appendChild(element);

    function impact() {
      element.classList.add('rank-stamp-impact');
      if (GW.audio && GW.audio.sfx) {
        GW.audio.sfx.play('stamp_thunk');
      }
      shake(widget);
    }

    if (GW.decode) {
      function onDecoded(event) {
        if (event.target !== element) {
          return;
        }
        GW.events.off('decodecomplete', onDecoded);
        impact();
      }
      GW.events.on('decodecomplete', onDecoded);
      var started = GW.decode.scramble(
        element,
        value,
        GW.fx.time('--duration-rank-scramble', 0.45)
      );
      if (!started) {
        GW.events.off('decodecomplete', onDecoded);
        impact();
      }
    } else {
      impact();
    }
    element.addEventListener('animationend', function (event) {
      if (event.target === element && event.animationName.indexOf('rank-stamp') === 0 &&
          element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    return true;
  }

  GW.events.on('levelcomplete', function (event) {
    if (event && event.success && event.record) {
      stamp(event.record.rank);
    }
  });
  // Public dossier contract: decode, stamp, and thunk a successful rank.
  GW.dossier = {stamp: stamp};
})(window.GW);