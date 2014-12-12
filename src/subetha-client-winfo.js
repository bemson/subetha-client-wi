/*!
 * SubEtha Window Information
 * http://github.com/bemson/subetha-client-winfo
 *
 * Copyright, Bemi Faison
 * Released under the MIT License
 */
/*
Use this plugin observe changes in all windows in the network.
*/
/* jshint browser:true */
/* global define, require, self */
!function (inAMD, inCJS, scope, undefined) {

  function initSubEthaWinfo() {

    var
      subetha = ((inCJS || inAMD) ? require('subetha') : scope.Subetha),
      monitor = new subetha.Client(),

      protoHas = Object.prototype.hasOwnProperty,
      sharedHeadObj,
      monitoring,
      positionWatchInt,
      finalResizeInt,
      winMetrics,
      windowId,
      lastCoord,

      doc = scope.document,
      docBody,
      docHead,

      // array of windows for public consumption
      winAry = [],
      // collection of window objects for private management
      winObjs = {},

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
      next =
        // use setImmediate
        (
          typeof setImmediate === 'function' &&
          setImmediate
        ) ||
        // use nextTick (for nodeJS only)
        (inCJS && process.nextTick) ||
        // fallback to slower setTimeout call
        function (fn) {
          setTimeout(fn, 0);
        }
    ;

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

    function ArrayIndexOf(ary, item) {
      var
        idx = -1,
        ln = ary.length;
      while (ln--) {
        if (ary[ln] === item) {
          idx = ln;
          break;
        }
      }
      return idx;
    }

    // determine if the window has focus
    function hasFocus() {
      var hiddenPropName;

      if (typeof doc.hidden !== "undefined") {
          hiddenPropName = "hidden";
      } else if (typeof doc.mozHidden !== "undefined") {
          hiddenPropName = "mozHidden";
      } else if (typeof doc.msHidden !== "undefined") {
          hiddenPropName = "msHidden";
      } else if (typeof doc.webkitHidden !== "undefined") {
          hiddenPropName = "webkitHidden";
      }

      if (hiddenPropName && (hiddenPropName in doc)) {
        // has focus when hidden is false
        return !doc[hiddenPropName];
      } else {
        // use fallback API
        return doc.hasFocus();
      }
    }

    // FUNCTIONS

    function startMonitor() {

      // exit if already monitoring
      if (monitoring) {
        return;
      }

      monitoring = 1;

      // listen to window events
      rigWindow();

      // start watching window, if focused
      if (hasFocus()) {
        watchWindowPosition();
      }
    }

    function stopMonitor() {
      if (!monitoring) {
        return;
      }
      monitoring = 0;

      unrigWindow();
      unwatchWindowPosition();
    }

    function rigWindow() {
      // starts watching window motion, when this window is focused
      bind(scope, 'focus', onFocus);
      // stops watching window motion, when this window is blurred
      bind(scope, 'blur', onBlur);
      // always observe scroll changes
      bind(scope, 'scroll', onScroll);
      // always observe resize changes
      bind(scope, 'resize', onResize);
    }

    function unrigWindow() {
      unbind(scope, 'focus', onFocus);
      unbind(scope, 'blur', onBlur);
      unbind(scope, 'scroll', onScroll);
      unbind(scope, 'resize', onResize);
    }

    function isActiveMonitor() {
      return sharedHeadObj.mid == monitor.id;
    }

    function getDocHeight() {
      return scope.innerHeight;
    }

    function getDocWidth() {
      return scope.innerWidth;
    }

    function getDocScroll() {
      return {
        scrollx: scope.pageXOffset,
        scrolly: scope.pageYOffset
      };
    }

    function getBrowserHeight() {
      return scope.outerHeight;
    }

    function getBrowserWidth() {
      return scope.outerWidth;
    }

    function getWindowPosition() {
      var
        bx = scope.screenX,
        by = scope.screenY;

      return {
        x: bx,
        y: by + (scope.outerHeight - scope.innerHeight),
        bx: bx,
        by: by,
      };
    }

    function updateResizeMetrics() {
      updateWindowMetrics(mix(getWindowDimensions(), getWindowPosition()));
    }

    function getWindowDimensions() {
      return {
        width: getDocWidth(),
        height: getDocHeight(),
        bwidth: getBrowserWidth(),
        bheight: getBrowserHeight()
      };
    }

    function watchWindowPosition() {
      unwatchWindowPosition();
      positionWatchInt = setInterval(checkWindowPosition, 100);
    }

    function unwatchWindowPosition() {
      clearInterval(positionWatchInt);
    }

    function checkWindowPosition() {
      var curCoord = getWindowPosition();

      if (
        !lastCoord ||
        lastCoord.x != curCoord.x ||
        lastCoord.y != curCoord.y
      ) {
        lastCoord = curCoord;
        // passing width and height, since those may have updated as well
        updateWindowMetrics(mix(lastCoord, getWindowDimensions()));
      }
    }

    // start watching for window changes
    function onFocus() {
      // start watching window
      watchWindowPosition();
      // broadcast focus change
      updateWindowMetrics({focus: true});
    }

    // stop watching for window changes
    function onBlur() {
      // stop watching window position
      unwatchWindowPosition();
      // broadcast focus change
      updateWindowMetrics({focus: false});
    }

    // update scroll position
    function onScroll() {
      // broadcast scroll change
      updateWindowMetrics(getDocScroll());
    }

    // update changed dimensions
    function onResize() {
      // kill final resize
      clearTimeout(finalResizeInt);
      // retrieve all, since resizing can occur from any corner
      updateResizeMetrics();
      // final resize
      finalResizeInt = setTimeout(updateResizeMetrics, 50);
    }

    function fireAddWindowEvent(wid, winfo) {
      winAry.fire('add', wid, winfo);
    }

    function fireRemoveWindowEvent(wid, winfo) {
      winAry.fire('remove', wid, winfo);
    }

    function fireUpdateWindowEvent(wid, winfo, changes) {
      winAry.fire('update', wid, winfo, changes);
    }

    function updateWindowMetrics(data) {
      var
        changed = {},
        deets = winMetrics.deets,
        key,
        value,
        hasChanges
      ;
      // keep changed values
      for (key in data) {
        if (
          protoHas.call(data, key) &&
          (
            !protoHas.call(deets, key) ||
            deets[key] != (value = data[key])
          )
        ) {
          // capture changed value
          changed[key] =
          // update metric
          deets[key] =
            value;
          // not that there is something to send
          hasChanges = 1;
        }
      }

      // exit if nothing has changed
      if (!hasChanges) {
        return;
      }

      // broadcast changed/new values
      sendWindowMetrics(changed);

      // notify self
      next(function () {
        fireUpdateWindowEvent(windowId, deets, changed);
      });
    }

    function sendWindowMetrics(data, target) {
      monitor._transmit('subetha/winfo', target, {
        id: windowId,
        cnt: sharedHeadObj.cnt,
        deets: data
      });
    }

    // IMPLEMENTATION

    // add event emitter and expose winfo
    mix(winAry, subetha.EventEmitter.prototype);
    subetha.winfo = winAry;

    if (scope == self) {

      // setup monitor
      monitor.open('window-information@public')
        .on('::connect', function () {
          var me = this;

          docBody = doc.body;
          docHead = doc.head;

          // resolve tracker for all window monitors
          if (!protoHas.call(docHead, '_winfo')) {
            // init shared tracker
            docHead._winfo = {
              // window id
              wid: subetha.guid(),
              // id of monitor tracking this window
              mid: me.id,
              // number of monitors for this window
              cnt: 0
            };
          }

          // alias shared object
          sharedHeadObj = docHead._winfo;
          // increment monitor count
          sharedHeadObj.cnt++;

          // alias window id
          windowId = sharedHeadObj.wid;

          if (isActiveMonitor()) {
            // create and add winMetrics to public array
            winMetrics =
            winObjs[windowId] = {
              id: windowId,
              cnt: sharedHeadObj.cnt,
              deets: mix(
                {
                  focus: hasFocus()
                },
                getWindowPosition(),
                getWindowDimensions(),
                getDocScroll()
              )
            };

            winAry[0] = winMetrics.deets;

            // start watching window
            startMonitor();

            // announce this window to self next
            next(function () {
              fireAddWindowEvent(windowId, winMetrics.deets);
            });
            setTimeout(function () {
              // introduce this window to peers
              sendWindowMetrics(winMetrics.deets);
            },5);
          }
        })
        .on('::disconnect', function () {
          // clean up & destroy monitor
          monitor.off();

          // decrement number of monitors for this page
          sharedHeadObj.cnt--;

          // if this monitor was currently tracking this window
          if (isActiveMonitor()) {
            // stop watching the window
            stopMonitor();
          }

          // if no other monitors remain...
          if (!sharedHeadObj.cnt) {
            // remove winfo tracker from HEAD node
            delete docHead._winfo;
            // clear public array
            winAry.length = 0;
          }

          // nullify local reference
          sharedHeadObj = 0;
        })
        .on('::join', function (peer, exists) {
          // exit pre-existing peers
          if (exists) {
            return;
          }

          // send metrics to peer
          sendWindowMetrics(winMetrics.deets, peer);
        })
        .on('::drop', function (peer) {
          var
            wid = peer.wid,
            winfo,
            idx;

          // exit if there is no window information associated with this peer
          if (!wid || !protoHas.call(winObjs, wid)) {
            return;
          }
          winfo = winObjs[wid];

          // decrement number of monitors
          winfo.cnt--;

          // if this peer was monitoring this window...
          if (sharedHeadObj.mid == peer.id) {
            // set monitor self
            sharedHeadObj.mid = this.id;
            // use winfo as winMetric
            winMetrics = winfo;
            // get updated count
            // this has already been decremented by the departing monitor
            winMetrics.cnt = sharedHeadObj.cnt;
            // start watching window
            startMonitor();
          } else if (!winfo.cnt) { // take action when there are no more monitors for this window
            // remove deets from public array
            if (~(idx = ArrayIndexOf(winAry, winfo.deets))) {
              winAry.splice(idx, 1);
            }
            // remove window info object
            delete winObjs[wid];
            // announce removal of window
            fireRemoveWindowEvent(wid, winfo.deets);
          }
        })
      ;

      // add subetha/winfo type
      /*
      payload
      {
        id: // window id
        cnt: // number of monitors for this window
        deets: { // updated window information
          x: // x coord
          y: // y coord
          width: // doc width
          height: // doc height
          bwidth: // browser width
          bheight: // browser height
          scrollx: // horizontal scroll position
          scrolly: // vertical scroll position
          hasscrollx: // flag when has horizontal scroll bar
          hasscrolly: // flag when has vertical scroll bar
          focus: // focus (truthy)
        }
      }
      */
      subetha.msgType['subetha/winfo'] = function (client, peer, payload) {
        var
          deets,
          winfo,
          wid,
          adding;

        // exit when payload is invalid
        if (
          !payload ||
          typeof payload != 'object' ||
          typeof payload.cnt != 'number' ||
          typeof (wid = payload.id) != 'string' ||
          typeof (deets = payload.deets) != 'object' ||
          !deets
        ) {
          return;
        }

        // if there is no window info object for this window
        if (protoHas.call(winObjs, wid)) {
          winfo = winObjs[wid];
        } else {
          // init window information object - start with id
          winfo =
          winObjs[wid] =
            {
              id: wid,
              deets: {
                id: wid
              }
            };
          // add deets to public array
          winAry.push(winfo.deets);
          // link window to this peer - this way we can check the window when this peer disconnects
          peer.wid = wid;
          // flag that this update is for a new window
          adding = 1;
        }

        // update window details
        mix(winfo.deets, deets);
        // update meta-data
        winfo.cnt = payload.cnt;

        if (adding) {
          fireAddWindowEvent(wid, winfo.deets);
        } else {
          fireUpdateWindowEvent(wid, winfo.deets, deets);
        }
      };

    } else {

      // Can't work in iframe until we can identify which iframes belong to which window
      winAry.unsupported = 1;

    }

    return subetha;
  }

  // initialize and expose module, based on the environment
  if (inAMD) {
    define(initSubEthaWinfo);
  } else if (inCJS) {
    module.exports = initSubEthaWinfo();
  } else if (scope.Subetha && !scope.Subetha.winfo) {
    // tack on to existing namespace
    initSubEthaWinfo();
  }
}(
  typeof define === 'function',
  typeof exports != 'undefined',
  this
);