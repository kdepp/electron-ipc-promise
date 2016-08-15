# Electron IPC promise

It's a handy tool for electron ipc communication between ipcMain, ipcRender and webview.

## Install

``` bash
npm install electron-ipc-promise --save
```

## Usage

### ipc between ipcMain and ipcRenderer

``` javascript
/*
 * -- in main.js
 */
var ipcMain = require('electron').ipcMain;
var ipcPromise = require('electron-ipc-promise').mainHost();

// create your new BrowserWindow before initializing ipcMain
var ipc = ipcPromise.ipcMain(ipcMain, mainWindow.webContents);

ipc.onAsk(function (cmd, args) {
  return {
    data: cmd + ' done',
    err: null
  };
});

ipc.ask('COMMAND', args);


/*
 * -- in renderer.js
 */
var ipcRenderer = require('electron').ipcRenderer;
var ipcPromise = require('electron-ipc-promise').mainHost();

var ipc = ipcPromise.ipcHost(ipcRenderer);

ipc.onAsk(function (cmd, args) {
  return {
    data: cmd + ' done',
    err: null
  };
});

ipc.ask('COMMAND', args);

```

### ipc between ipcRenderer and Webview

``` javascript

/*
 * -- in renderer.js
 */
var ipcPromise = require('electron-ipc-promise').guestHost();

// get the webview reference before initializing ipcHost
var ipc = ipcPromise.ipcHost(webview);

ipc.onAsk(function (cmd, args) {
  return {
    data: cmd + ' done',
    err: null
  };
});

ipc.ask('COMMAND', args);


/*
 * -- in webview.js
 */
var ipcRenderer = require('electron').ipcRenderer;
var ipcPromise = require('electron-ipc-promise').guestHost();

var ipc = ipcPromise.ipcGuest(ipcRenderer);

ipc.onAsk(function (cmd, args) {
  return {
    data: cmd + ' done',
    err: null
  };
});

ipc.ask('COMMAND', args);

```

### multiple channels

``` javascript
// pass a uid to initialize function

var ipcGH = require('electron-ipc-promise').guestHost('PAGE_1');

var ipcMH = require('electron-ipc-promise').mainHost('HOST_1');

```



## TODO

* ipc pipe
  * one renderer directly with another renderer)
  * main directly with webview
