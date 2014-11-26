/*!
 * SubEtha Window Info v1.0.0
 * http://github.com/bemson/subetha-client-winfo
 *
 * Copyright, Bemi Faison
 * Released under the MIT License
 */
/*
Use this plugin observe changes in all windows in the network.
*/
/* global define, require */
!function (inAMD, inCJS, Array, Date, Math, JSON, Object, RegExp, scope, undefined) {

  function initSubEthaWindows() {

    var
      subetha = ((inCJS || inAMD) ? require('subetha') : scope.Subetha),
      protoSlice = Array.prototype.slice,
      protoHas = Object.prototype.hasOwnProperty,
      monitor = new subetha.Client(),
      lastInfo,

      doc = scope.document,
      docBody,

      // utility
      bind = scope.attachEvent ?
        function (object, eventName, callback) {
          object.attachEvent('on' + eventName, callback);
        } :
        function (object, eventName, callback) {
          object.addEventListener(eventName, callback, false);
        },
      unbind = scope.attachEvent ?
        function (object, eventName, callback) {
          object.detachEvent('on' + eventName, callback);
        } :
        function (object, eventName, callback) {
          object.removeEventListener(eventName, callback, false);
        },

      // array of windows
      winfo = [],
      stageDiv
    ;

    // add event emitter and expose winfo
    mix(winfo, subetha.EventEmitter.prototype);
    subetha.winfo = winfo;

    // exit if within an iframe
    if (scope !== self) {
      /*
      Can't work in iframe until we can
      groups iframes in the same window
      subetha doesn't do windows... :-(
      */
      winfo.unsupported = 1;
      return subetha;
    }

    // create stage div
    stageDiv = doc.createElement('div');
    stageDiv.style.cssText = css_reset + 'position:fixed;overflow:visible;';
    stageDiv.setAttribute('data-owner', 'subetha-winfo');


    // UTILITY

    // shallow object merge
    function mix(base) {
      var
        argIdx = 1,
        source,
        member;

      for (; source = arguments[argIdx]; argIdx++) {
        for (member in source) {
          if (protoHas.call(source, member)) {
            base[member] = source[member];
          }
        }
      }
      return base;
    }


    // add styles to reset appearance of div
    function setResetStyles(node) {
      var style = node.style;
      // is marginally faster than .cssText?
      style.position = 'absolute';
      style.width =
      style.height =
      style.margin =
      style.padding =
      style.background =
      style.lineHeight =
      style.fontSize =
        0;
      style.border = 'none';
    }

    // Functions

    function initMonitor() {

      if (initialized) {
        return;
      }

      initialized = 1;

      docBody = doc.body;

      buildStage();

      // init winfo on self
      moniotor.winfo = getWindowinfo();
      addWindoid(moniotor);

      // start watching window motion, when this window is focused
      bind(win, 'focus', onFocus);
      // stop watching window motion, when this window is blurred
      bind(win, 'blur', onBlur);
      // always observe scroll changes
      bind(win, 'scroll', onScroll);
      // always observe resize changes
      bind(win, 'resize', onResize);

      // do blur or focus action now
      if (doc.hasFocus()) {
        onFocus();
      } else {
        onBlur();
      }
    }


    // uses dom for shared window id
    function getWindowId() {
      var
        head = doc.getElementsByTagName('head')[0],
        id = head.getAttribute(WINDOW_ID_ATTR);

      if (!id) {
        id = subetha.guid();
        head.setAttribute(WINDOW_ID_ATTR, id);
      }
      return id;
    }

    function watchWindowRegion() {
      var curInfo = getWindowInfo();

      if (
        !lastRegion ||
        lastRegion.x !== curRegion.x ||
        lastRegion.y !== curRegion.y ||
        lastRegion.width !== curRegion.width ||
        lastRegion.height !== curRegion.height
      ) {
        lastRegion = curRegion;
        bird.send('lead', lastRegion);
      }
    }

    function getWindowInfo() {
      return {
        x: getScreenX(),
        y: getScreenY(),
        width: outerWidth,
        height: outerHeight
      };
    }

    // start watching for window changes
    function onFocus() {
      // start watching window
      // broadcast info
    }

    // stop watching for window changes
    function onBlur() {
      // stop watching window
      // broadcast info
    }

    // update scroll position
    function onScroll() {
      // only update scroll details
      // broadcast info
    }

    // update changed dimensions
    function onResize() {
      // retrieve all, since resizing can occur from any corner
      // broadcast info
    }

    function appendStage() {
      if (stageDiv.parentNode !== docBody) {
        positionStage();
        docBody.appendChild(stageDiv);
      }
    }

    function positonStage() {
      stageDiv.style.top = -getScreenX() + 'px';
      stageDiv.style.left = -getScreenY() + 'px';
    }

    function buildStage() {
      var
        pid,
        coords,
        div,
        peers = monitor.peers;

      // remove stage from dom
      if (stageDiv.parentNode) {
        stageDiv.parentNode.removeChild(stageDiv);
      }
      // empty div
      stageDiv.innerHTML = '';
      // clear winfo array
      winfo.length = 0;
      // repopulate stage and winfo with peers
      for (pid in peers) {
        if (protoHas.call(peers, pid)) {
          coords = monitor.peers[pid].winfo;
          div = monitor.peers[pid].div;

          // add to public array
          winfo.push(coords);

          // update peer div
          div.style.width = coords.width + 'px';
          div.style.height = coords.height + 'px';
          div.style.top = coords.x + 'px';
          div.style.left = coords.y + 'px';

          // add to stage
          stageDiv.appendChild(div);
        }
      }

      // re-append if allowed
      appendStage();
    }

    // setup monitor
    monitor.open('window-dimensions@public')
      .on('::connect', function () {
        var xid;

        // ask for ids
        if (xid = monitor.ask('window id?', getWindowId())) {
          // mark end of this exchange
          monitor.on('::exchange-complete', function askForIds(phrase, exId) {
            // exit when not this conversation
            if (xid != exId) {
              return;
            }
            // remove this listener
            monitor.off('::exchange-complete', askForIds);
            // initialize monitor
            initMonitor();
          });
        }

      })
      .on('::join', function (peer) {
        // add div to represent peer (window)
        peer.div = document.createElement('div');
      })
      .on('::drop', function (peer) {
        stageDiv.removeChild(peer.div);
      })
      // handle coordinates change
      .on('coords', function (evt, coords) {
        var peer = evt.peer;

        // capture window information in peer and array
        evt.peer.winfo =
        winfo[peer.idx] =
          coords;

        // notify change in peer window
        winfo.fire('changed', peer, pinfo);
      })
      // handle style changes
      .on('style', function () {

      });

    // adhoc response to window id
    monitor.adhoc('window id?', function (convo, wid) {
      var peer = convo.peer;

      peer.wid = wid;
      convo.reply('wid', getWindowId());

      // if not already watching this window
      if (!protoHas.call(watching, wid)) {
        // flag that this peer should be watched
        peer.watching =
        // note that this window is being watched
        watching[wid] =;
          1;
        // start monitoring
        initMonitor():
      } else {
        peer.watching = 0;
      }
    });

    // adhoc receipt of window id response
    monitor.adhoc('window id?', 'wid', function (convo, wid) {
      var peer = convo.peer;

      // capture id of window being watched by this peer
      peer.wid = wid
      // convo.end();

      if () {
        // don't track own window
        // if not already tracking a window
        if (!monitor.tracking) {
          // update own window with this one
          monitor.tracking = 1;
          // flag that this peer is our mirror
          convo.peer.mirror = 1;
        }
      }
    });

    // expose emitter of window boundary events
    subetha.wInfo = stage;

    return subetha;
  }

  function setPeerDimensions(peer, dimensions) {
    initPeer(peer);
    peer._dim = dimensions;
  }

  function initPeer(peer) {
    if (!protoHas.call(peer, '_dim')) {
      peer._dim = {
        x: 0,
        y: 0,
        w: 0,
        h: 0
      };
    }
  }

  // initialize and expose module, based on the environment
  if (inAMD) {
    define(initSubEthaWindows);
  } else if (inCJS) {
    module.exports = initSubEthaWindows();
  } else if (!scope.Subetha || !scope.Subetha._vp) {
    // tack on to existing namespace
    initSubEthaWindows();
  }
}(
  typeof define === 'function',
  typeof exports != 'undefined',
  Array, Date, Math, JSON, Object, RegExp, this
);