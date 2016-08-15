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

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              webContents.send(wrap('BG_ASK_HOST'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              ipcMain.on(wrap('HOST_ANSWER_BG'), function (event, uid, err, data) {
                  fn(uid, err, data);
              });
          },
          onAsk: function (fn) {
              ipcMain.on(wrap('HOST_ASK_BG'), function (event, uid, cmd, args) {
                  fn(uid, cmd, args);
              });
          },
          answer: function (uid, err, data) {
              webContents.send(wrap('BG_ANSWER_HOST'), uid, err, data);
          },
      }));
    },

    ipcHost: function (ipcRenderer) {
      assert(ipcRenderer, 'ipcRenderer required');

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              ipcRenderer.send(wrap('HOST_ASK_BG'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              ipcRenderer.on(wrap('BG_ANSWER_HOST'), function (event, uid, err, data) {
                  fn(uid, err, data);
              });
          },
          onAsk: function (fn) {
              ipcRenderer.on(wrap('BG_ASK_HOST'), function (event, uid, cmd, args) {
                  fn(uid, cmd, args);
              });
          },
          answer: function (uid, err, data) {
              ipcRenderer.send(wrap('HOST_ANSWER_BG'), uid, err, data);
          },
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

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              ipcRenderer.sendToHost(wrap('GUEST_ASK_HOST'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              ipcRenderer.on(wrap('HOST_ANSWER_GUEST'), function (event, uid, err, data) {
                  fn(uid, err, data);
              });
          },
          onAsk: function (fn) {
              ipcRenderer.on(wrap('HOST_ASK_GUEST'), function (event, uid, cmd, args) {
                  fn(uid, cmd, args);
              });
          },
          answer: function (uid, err, data) {
              ipcRenderer.sendToHost(wrap('GUEST_ANSWER_HOST'), uid, err, data);
          },
      }));
    },

    ipcHost: function (webview) {
      assert(webview, 'webview required');

      return ipcPromise.serialize(ipcPromise({
          ask: function (uid, cmd, args) {
              webview.send(wrap('HOST_ASK_GUEST'), uid, cmd, args);
          },
          onAnswer: function (fn) {
              webview.addEventListener('ipc-message', function (e) {
                  if (e.channel !== wrap('GUEST_ANSWER_HOST'))  return;

                  var uid = e.args[0],
                      err = e.args[1],
                      data = e.args[2];

                  fn(uid, err, data);
              });
          },
          onAsk: function (fn) {
              webview.addEventListener('ipc-message', function (e) {
                  if (e.channel !== wrap('GUEST_ASK_HOST'))  return;

                  var uid = e.args[0],
                      cmd = e.args[1],
                      args = e.args.slice(2);

                  fn(uid, cmd, args);
              });
          },
          answer: function (uid, err, data) {
              webview.send(wrap('HOST_ANSWER_GUEST'), uid, err, data);
          },
      }));
    }
  };
};

module.exports = {
  openHostWithGuest: openHostWithGuest,
  openMainWithHost: openMainWithHost
};
