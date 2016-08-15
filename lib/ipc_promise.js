var TO_BE_REMOVED = false;

function ipcPromise(options) {
  var ask = options.ask,
    answer = options.answer,
    timeout = options.timeout,
    onAnswer = options.onAnswer,
    onAsk = options.onAsk;

  var askCache = {},
    unhandledAsk = [],
    markUnhandled = function (uid, cmd, args) {
      unhandledAsk.push({ uid: uid, cmd: cmd, args: args });
    },
    handler = markUnhandled;

  // both for ask and unhandledAsk
  timeout = timeout || 5000;

  onAnswer(function (uid, err, data) {
    if (uid && askCache[uid] === TO_BE_REMOVED) {
      delete askCache[uid];
      return;
    }

    if (!uid || !askCache[uid]) {
      throw new Error('ipcPromise: response uid invalid: ' + uid);
    }

    var resolve = askCache[uid][0];
    var reject  = askCache[uid][1];

    delete askCache[uid];

    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  });

  onAsk(function(uid, cmd, args) {
    setTimeout(function () {
      var found = unhandledAsk.find(function (item) {
        return item.uid === uid;
      });

      if (!found) return;

      answer(uid, new Error('ipcPromise: answer timeout ' + timeout + ' for cmd "' + cmd + '", args "'  + args + '"'));
    }, timeout);

    if (handler == markUnhandled) {
      markUnhandled(uid, cmd, args);
      return;
    }

    Promise.resolve(handler(cmd, args))
    .then(function (ret) {
      if (ret === undefined) {
        markUnhandled(uid, cmd, args);
      } else {
        answer(uid, ret.err, ret.data);
      }
    });
  });

  var wrapAsk = function (cmd, args) {
    var uid = 'ipcp_' + new Date() * 1 + '_' + Math.round(Math.random() * 1000);

    setTimeout(function () {
      var reject;

      if (askCache[uid]) {
        reject = askCache[uid][1];
        askCache[uid] = TO_BE_REMOVED;
        reject(new Error('ipcPromise: onAsk timeout ' + timeout + ' for cmd "' + cmd + '", args "'  + args + '"'));
      }
    }, timeout);

    ask(uid, cmd, args || []);

    return new Promise(function (resolve, reject) {
      askCache[uid] = [resolve, reject];
    });
  }

  var wrapOnAsk = function (fn) {
    handler = fn;

    var ps = unhandledAsk.map(function (task) {
      return Promise.resolve(handler(task.cmd, task.args))
      .then(function (ret) {
        if (ret === undefined)  return;
        answer(task.uid, ret.err, ret.data)
        return task.uid;
      });
    });

    Promise.all(ps).then(function (uids) {
      for (var uid of uids) {
        if (uid === undefined)  continue;

        var index = unhandledAsk.findIndex(function (item) {
          return item.uid === uid;
        });

        unhandledAsk.splice(index, 1);
      }
    });
  }

  return {
    ask: wrapAsk,
    send: wrapAsk,
    onAsk: wrapOnAsk
  };
}

ipcPromise.serialize = function (obj) {
  return {
    ask: function (cmd, args) {
      return obj.ask(cmd, JSON.stringify(args));
    },

    send: function (cmd, args) {
      return obj.send(cmd, JSON.stringify(args));
    },

    onAsk: function (fn) {
      return obj.onAsk(function (cmd, args) {
        return fn(cmd, JSON.parse(args));
      });
    }
  };
};

module.exports = ipcPromise;