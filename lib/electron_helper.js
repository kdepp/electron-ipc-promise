var ipcPromise  = require('./ipc_promise');
var assert = require('./assert');

var openMainWithHost = function (uid) {
  var wrap = function (str) {
    return uid ? (str + '_' + uid) : str;
  };

  return {
    ipcMain: function (ipcMain, webContents) {
      assert(ipcMain, 'ipcMain required');
      assert(webContents, 'webContents required');

      var fn1, fn2;

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              webContents.send(wrap('BG_ASK_HOST'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              fn1 = function (event, uid, err, data) {
                  fn(uid, err, data);
              };
              ipcMain.on(wrap('HOST_ANSWER_BG'), fn1);
          },
          onAsk: function (fn) {
              fn2 = function (event, uid, cmd, args) {
                  fn(uid, cmd, args);
              };
              ipcMain.on(wrap('HOST_ASK_BG'), fn2);
          },
          answer: function (uid, err, data) {
              webContents.send(wrap('BG_ANSWER_HOST'), uid, err, data);
          },
          destroy: function () {
              ipcMain.removeListener(wrap('HOST_ANSWER_BG'), fn1);
              ipcMain.removeListener(wrap('HOST_ASK_BG'), fn2);
          }
      }));
    },

    ipcHost: function (ipcRenderer) {
      assert(ipcRenderer, 'ipcRenderer required');

      var fn1, fn2;

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              ipcRenderer.send(wrap('HOST_ASK_BG'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              fn1 = function (event, uid, err, data) {
                  fn(uid, err, data);
              };
              ipcRenderer.on(wrap('BG_ANSWER_HOST'), fn1);
          },
          onAsk: function (fn) {
              fn2 = function (event, uid, cmd, args) {
                  fn(uid, cmd, args);
              };
              ipcRenderer.on(wrap('BG_ASK_HOST'), fn2);
          },
          answer: function (uid, err, data) {
              ipcRenderer.send(wrap('HOST_ANSWER_BG'), uid, err, data);
          },
          destroy: function () {
              ipcRenderer.removeListener(wrap('BG_ANSWER_HOST'), fn1);
              ipcRenderer.removeListener(wrap('BG_ASK_HOST'), fn2);
          }
      }));
    }
  };
};



var openHostWithGuest = function (uid) {
  var wrap = function (str) {
    return uid ? (str + '_' + uid) : str;
  };

  return {
    ipcGuest: function (ipcRenderer) {
      assert(ipcRenderer, 'ipcRenderer required');

      var fn1, fn2;

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              ipcRenderer.sendToHost(wrap('GUEST_ASK_HOST'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              fn1 = function (event, uid, err, data) {
                  fn(uid, err, data);
              };
              ipcRenderer.on(wrap('HOST_ANSWER_GUEST'), fn1);
          },
          onAsk: function (fn) {
              fn2 = function (event, uid, cmd, args) {
                  fn(uid, cmd, args);
              };
              ipcRenderer.on(wrap('HOST_ASK_GUEST'), fn2);
          },
          answer: function (uid, err, data) {
              ipcRenderer.sendToHost(wrap('GUEST_ANSWER_HOST'), uid, err, data);
          },
          destroy: function () {
              ipcRenderer.removeListener(wrap('HOST_ANSWER_GUEST'), fn1);
              ipcRenderer.removeListener(wrap('HOST_ASK_GUEST'), fn2);
          }
      }));
    },

    ipcHost: function (webview) {
      assert(webview, 'webview required');

      var fn1, fn2;

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              webview.send(wrap('HOST_ASK_GUEST'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              fn1 = function (e) {
                  if (e.channel !== wrap('GUEST_ANSWER_HOST'))  return;

                  var uid = e.args[0],
                      err = e.args[1],
                      data = e.args[2];

                  fn(uid, err, data);
              };
              webview.addEventListener('ipc-message', fn1);
          },
          onAsk: function (fn) {
              fn2 = function (e) {
                  if (e.channel !== wrap('GUEST_ASK_HOST'))  return;

                  var uid = e.args[0],
                      cmd = e.args[1],
                      args = e.args.slice(2);

                  fn(uid, cmd, args);
              };
              webview.addEventListener('ipc-message', fn2);
          },
          answer: function (uid, err, data) {
              webview.send(wrap('HOST_ANSWER_GUEST'), uid, err, data);
          },
          destroy: function () {
              if (webview && webview.removeEventListener) {
                  webview.removeEventListener('ipc-message', fn1);
                  webview.removeEventListener('ipc-message', fn2);
              }
          }
      }));
    }
  };
};

module.exports = {
  openHostWithGuest: openHostWithGuest,
  openMainWithHost: openMainWithHost
};
