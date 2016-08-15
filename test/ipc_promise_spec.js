var ipcPromise = require('../lib/ipc_promise');
var chai = require('chai');
var expect = chai.expect;

var ipcFactory = function () {
    var mainListeners = {},
        subListeners  = {},
        genSend = function (targetListeners) {
            return function (name) {
                var args = Array.from(arguments).slice(1);
                    listeners = targetListeners[name] || [];

                for (var fn of listeners) {
                    fn.apply(null, args);
                }
            }
        },
        genOn = function (selfListeners) {
            return function (name, fn) {
                selfListeners[name] = selfListeners[name] || [];
                selfListeners[name].push(fn);
            };
        };

    return {
        main: {
            send: genSend(subListeners), on: genOn(mainListeners)
        },

        sub: {
            send: genSend(mainListeners), on: genOn(subListeners)
        }
    };
};

describe('IPC Promise', function () {
    it('simple', function (done) {
        var ipcTuple = ipcFactory(),
            ipcA     = ipcTuple.main,
            ipcB     = ipcTuple.sub,
            timeout  = 1000,
            delay    = 100;

        this.timeout(timeout * 2);

        var tupleA =  ipcPromise({
            ask: function (uid, cmd, args) {
                ipcA.send('a2b', uid, cmd, args);
            },
            answer: function (uid, err, data) {
                ipcA.send('answer b2a', uid, err, data);
            },
            onAnswer: function (fn) {
                ipcA.on('answer a2b', fn);
            },
            onAsk: function (fn) {
                ipcA.on('b2a', fn);
            },
            timeout: timeout,
            name: 'A'
        });

        var tupleB =  ipcPromise({
            ask: function (uid, cmd, args) {
                ipcB.send('b2a', uid, cmd, args);
            },
            answer: function (uid, err, data) {
                ipcB.send('answer a2b', uid, err, data);
            },
            onAnswer: function (fn) {
                ipcB.on('answer b2a', fn);
            },
            onAsk: function (fn) {
                ipcB.on('a2b', fn);
            },
            timeout: timeout,
            name: 'B'
        });

        var A_ask_B      = tupleA.ask,
            on_B_Ask_A   = tupleA.onAsk;

        var B_ask_A      = tupleB.ask,
            on_A_Ask_B   = tupleB.onAsk;

        var startTime = new Date() * 1;

        // Ask before setting onAsk

        var p1 = A_ask_B('sum', [1,2,3])
        .then(function (data) {
            expect(data).to.equal(6);
            // expect(new Date() * 1 - startTime > delay).to.be.true;
            return 1;
        }, function (err) {
            console.log('p1 error: ', err);
        });

        var p2 = B_ask_A('multiply', [2,3,4])
        .then(function (data) {
            expect(data).to.equal(24);
            //  expect(new Date() * 1 - startTime > delay).to.be.true;
            return 2;
        }, function (err) {
            console.log('p2 error: ', err);
        });

        setTimeout(function () {
            // set onAsk

            on_B_Ask_A(function (cmd, args) {
                console.log('in on_B_Ask_A ', JSON.stringify(arguments));

                if (cmd == 'multiply') {
                    return  {
                        data: args.reduce(function (prev, cur) {
                            return prev * cur;
                        }, 1)
                    };
                }

                if (cmd == 'double') {
                    return {
                        data: args.map(function (item) {
                            return item * 2;
                        })
                    };
                }
            });

            on_A_Ask_B(function (cmd, args) {
                console.log('in on_A_Ask_B ', JSON.stringify(arguments));

                if (cmd == 'sum') {
                    return {
                        data: args.reduce(function (prev, cur) {
                            return prev + cur;
                        }, 0)
                    };
                }

                if (cmd == 'triple') {
                    return {
                        data: args.map(function (item) {
                            return item * 3;
                        })
                    };
                }
            });

            // Ask after setting onAsk

            var p3 = A_ask_B('triple', [1,2,3])
            .then(function (data) {
                expect(data).to.eql([3,6,9]);
                return 3;
            }, function (err) {
                console.log('p3 error: ', err);
            });

            var p4 = B_ask_A('double', [1,2,3])
            .then(function (data) {
                expect(data).to.eql([2,4,6]);
                return 4;
            }, function (err) {
                console.log('p4 error: ', err);
            });

            var p5 = B_ask_A('noanswer', [])
            .then(function (data) {
            }, function (err) {
                var time = new Date() * 1;

                expect(err).to.be.ok;
                expect(time - startTime > delay + timeout).to.be.true;

                return 5;
            });

            Promise.all([ p1, p2, p3, p4, p5 ])
            .then(function (data) {
                expect(data).to.eql([1,2,3,4,5]);
                done();
            })
            .catch(function (err) {
                console.log('finally error: ', err.stack);
            });
        }, delay);
    });
});
