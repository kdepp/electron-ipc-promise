var eh = require('./lib/electron_helper');

module.exports = {
  mainHost: eh.openMainWithHost,
  guestHost: eh.openHostWithGuest,
  ipcPromise: require('./lib/ipc_promise'),
};
