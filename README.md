# SubEtha Window Information

Publish window details over SubEtha

by Bemi Faison


## Description

SubEtha Window Information (or WI) is a Subetha-Client plugin that provides a spatial model of non-framed windows. WI publishes window activity and metrics of each document using the plugin.

To observe WI in action, open this [visualizer demo](http://rawgit.com/bemson/subetha-client-wi/master/wi_demo_visualizer.html) in several windows.

**Note:** Please see the [Subetha project page](https://github.com/bemson/subetha), for important background information, plus development, implementation, and security considerations.


## Usage

WI provides methods to start and stop monitoring window changes, but begins monitoring once a connection is established (by default). The plugin adds a custom array to the Subetha module itself, as `Subetha.winfos`. This array contains _winfo_ objects that describe each window, and hosts API methods to observe and control functionality.

### Accessing Window Information

To access information about a window, simply select an indexed _winfo object_ from the `Subetha.winfos` array.

```js
var firstWinfo = Subetha.winfos[0];
if (firstWinfo) {
  console.log('The first monitored window id is "%s"', firstWinfo.id);
} else {
  console.log('WI is not monitoring any windows');
}
```

**Note:** Ensure the `winfos` array has members before accessing it.

Each winfo is an object literal with the following properties:

  * **bheight** - The browser height, in pixels.
  * **bwidth** - The browser width, in pixels.
  * **bx** - The browser x coordinate.
  * **by** - The browser y coordinate.
  * **self** - A boolean that, when `true`, indicates whether the winfo describes the current window.
  * **focus** - A boolean that, when true, indicates whether the window has focus.
  * **height** - The document height (including scrollbars).
  * **id** - The unique identifier for the window.
  * **scrollx** - The horizontal scroll position.
  * **scrolly** - The vertical scroll position.
  * **width** - The document width (including scrollbars).
  * **x** - The document x coordinate.
  * **y** - The document y coordinate.

#### Accessing the Current Window

Access details for the current window, at `Subetha.winfos.current`. This winfo is also an indexed element of the `winfos`, and the only one where it's "self" property is `true`.

```js
var myWinfo = Subetha.winfos.current;
if (myWinfo) {
  console.log('The id for this window is "%s"', myWinfo.id);
} else {
  console.log('WI is not monitoring any windows');
}
```

**Note:** The "current" winfo is `null` when monitoring is disabled.

#### Estimating the Document X/Y Position

The winfo properties **x** and **y** are intended to reflect the position of the document _within_ the window. Sadly, it's so far been impossible to calculate the window "chrome" - that is, the toolbars and panes which generally frame the web page.

Therefore, these coordinates are a guestimate of the document's location within the entire screen. The estimation is not sophisticated, and merely presuming all chrome lay above a horizontally centered document.


### Controlling and Observing WI

#### Observing Events

As an event emitter, the winfos array features the canonical `on`, `off`, and `fire` methods, to manage event subscribers. Callbacks are passed the impacted winfo object, at least, and scoped to the global/window object.

Below lists the WI events available:

  * _add_ - Triggered when a winfo object is added to the winfos array.
  * _remove_ - Triggered when a winfo object is removed from the winfos array.
  * _update_ - Triggered when one or more properties of a winfo object have changed.

##### Observing Additions

The _add_ event informs when a winfo object is added to the winfos array. When WI is enabled, this event occurs at least once for the current window.

Below demonstrates subscribing to the _add_ event.

```js
Subetha.winfos.on('add', function (winfo) {
  if (winfo.self) {
    console.log('Added the current window.');
  } else {
    console.log('Added some other window.');
  }
});
```

##### Observing Removals

The _remove_ event informs when a winfo object is removed from the winfos array. In this case, the _winfo_ argument given to callbacks, is no longer in the `winfos` array.

Below demonstrates subscribing to the _remove_ event.

```js
Subetha.winfos.on('remove', function (winfo) {
  if (
    winfo.bwidth == screen.availWidth &&
    winfo.bheight == screen.availHeight &&
    !winfo.bx &&
    !winfo.by
  ) {
    console.log('Removed full screen window.');
  } else {
    console.log('Removed regular window.');
  }
});
```

##### Observing Updates

The _update_ event informs when details about an existing winfo object change. This event passes an additional, second argument to callbacks - an object-literal, listing the properties that have changed, along with their previous value.

Below demonstrates subscribing to the _update_ event.

```js
Subetha.winfos.on('update', function (winfo, changed) {
  if (changed.hasOwnProperty('focus')) {
    console.log('Focus is no longer %s.', changed.focus);
  } else {
    console.log('Something changed, but focus is still %s.', winfo.focus);
  }
});
```

#### Controlling Functionality

By default, WI will connect to "subetha/wi@public", and begin syncing window details. To prevent this behavior invoke the static `stop()` method. To reestablish and resume monitoring, invoke the static `start()` method.

Below demonstrates stopping the default monitoring behavior, then resuming it based on preferences or user confirmation.

```js
// don't monitor initially
Subetha.winfos.stop();

if (userPrefs.monitor_me || confirm('Share window details?')) {
  Subetha.winfos.start();
  // update ficitious "userPrefs" data-store
  userPrefs.monitor_me = true;
}
```

Once disabled (via `winfos.stop()`), the `winfos` array is emptied, and `winfos.current` is set to `null`. As well, prior to removal, the _remove_ event will fire for all existing winfo objects.

##### Changing Networks

To connect to own network, provide the url (or url-alias) of your bridge, via the `winfos.start()` method. The url gets captured in the `winfos.url` property, for future connection attempts.

Below demonstrates how to publish and synchronization window details with a different bridge.

```js
Subetha.winfos.start('my.com/bridge/url');
```

The above example could also be set as a configuration. WI would uses this url by default, during initialization.

```js
Subetha.winfos.url = 'my.com/bridge/url';
```

**Note:** WI does not provide or allow passing credentials currently. This will likely change in a future release.


## API

Below is reference documentation for the SubEtha Window Information module - which are additions to [SubEtha-Client module](https://github.com/bemson/subetha-client).

**Note:** Instance methods are prefixed with a pound-symbol (`#`). Instance properties are prefixed with an at-symbol (`@`). Static members are prefixed with a double-colon (`::`).

### Subetha::winfos

#### winfos#start()

Begin monitoring this and other windows.

```
Subetha.winfos.start([url]);
```

  * **url**: (string) The bridge url that will host window synchronization. The `winfos.url` property is updated or retrieved when this argument is given or omitted, respectively.

Returns `true` if monitoring begins. Otherwise, `false`.

This function does nothing when the given network is already active. If not, the current network (if active) is closed, first (via `winfos.stop()`).

#### winfos#stop()

Stop monitoring this and other windows.

```
Subetha.winfos.stop();
```

Returns `true` when the network is changed from active to inactive. Otherwise, `false`.

#### winfos@current

The winfo object of the current window, when actively monitoring a network. Otherwise, when inactive, this is a `null` reference.

#### winfos@url

A string reflecting the last/currently active (bridge) url. This property is used when calling `winfos.start()` with no arguments, and updated when called with arguments.

#### winfos@unsupported

A boolean indicating when the WI plugin can not work with the given docuemnt.

This property should be considered _read-only_ and is set during plugin initialization. The value will be `false` for iframed documents.


## Installation

SubEtha WI works within, and is intended for, modern JavaScript browsers. It is available on [bower](http://bower.io/search/?q=subetha-client-wi), [component](http://component.github.io/) and [npm](https://www.npmjs.org/package/subetha-client-subetha-client-wi) as a [CommonJS](http://wiki.commonjs.org/wiki/CommonJS) or [AMD](http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition) module.

If SubEtha WI isn't compatible with your favorite runtime, please file an issue or pull-request (preferred).

### Dependencies

SubEtha WI depends on the following modules:

  * [SubEtha-Client](https://github.com/bemson/subetha-client)

### Web Browsers

Use a `<SCRIPT>` tag to load the _subetha-client-wi.min.js_ file in your web page. The file does _not_ include the SubEtha-Client module. You must include this as well, _before_ loading this plugin, which updates members of the `Subetha` namespace, in the global scope.

```html
  <script type="text/javascript" src="path/to/subetha-client.min.js"></script>
  <script type="text/javascript" src="path/to/subetha-client-wi.min.js"></script>
  <script type="text/javascript">
    // ... SubEtha dependent code ...
  </script>
```

**Note:** The minified file was compressed by [Closure Compiler](http://closure-compiler.appspot.com/).

Generally speaking, the standalone version of this plugin should not be installed manually, since it's bundled with the SubEtha module. Install the [SubEtha module](https://github.com/bemson/subetha) instead - a rollup of the SubEtha-Client and recommended plugins.

### Package Managers

  * `npm install subetha-client-wi`
  * `component install bemson/subetha-client-wi`
  * `bower install subetha-client-wi`

**Note:** The npm package uses `subetha-client` as a [peerDependency](https://www.npmjs.org/doc/files/package.json.html#peerdependencies).

### AMD

Assuming you have a [require.js](http://requirejs.org/) compatible loader, configure an alias for the SubEtha WI module (the term "subetha-client-wi" is recommended, for consistency). The _subetha-client-wi_ module exports a module namespace.

```js
require.config({
  paths: {
    'subetha-client-wi': 'libs/subetha-client-wi'
  }
});
```

Then require and use the module in your application code:

```js
require(['subetha-client-wi'], function (Subetha) {
  // ... SubEtha dependent code ...
});
```

**Caution:** You should not load the minified file via AMD. Instead use AMD optimizers like [r.js](https://github.com/jrburke/r.js/), in order to roll-up your dependency tree.


## License

SubEtha Window Information is available under the terms of the [MIT-License](http://en.wikipedia.org/wiki/MIT_License#License_terms).

Copyright 2015, Bemi Faison