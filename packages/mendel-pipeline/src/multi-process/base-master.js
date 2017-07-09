const analyticsCollector = require('../helpers/analytics/analytics-collector');
const analyzeIpc = require('../helpers/analytics/analytics')('ipc');
const {fork} = require('child_process');
const debug = require('debug');
const RECOMMENDED_CPUS = require('os').cpus().length;
const Protocol = require('./protocol');
const path = require('path');

// Deallocate unused child process after 10 seconds.
const CHILD_PROCESS_DEALLOC_PERIOD = 7.5e3;

class BaseMasterProcess {
    static get Protocol() {
        return Protocol;
    }

    constructor(workerFileName, options={}) {
        this._name = options.name || 'unamed_multi_process';
        this._workerArgs = [this._name, workerFileName]
            .concat(options.workerArgs);
        this._maxChildCount = options.numWorker || RECOMMENDED_CPUS;

        // Queues
        this._workers = new Map();
        this._idleWorkers = [];
        this._jobs = [];

        // Get Listeners from subclass
        this._subscribers = this.subscribe();

        // debug related
        this._debug = debug(`mendel:${this._name}:master`);
    }

    _exit() {
        this._workers.forEach(({process}) => this.dealloc(process));
    }

    canAlloc() {
        return this._workers.size < this._maxChildCount;
    }

    alloc() {
        const child = fork(path.join(__dirname, 'worker.js'), this._workerArgs);
        const {pid} = child;

        analyticsCollector.connectProcess(child);
        child.once('error', () => {
            console.error('[ERROR] Worker process unexpectedly exited.');
            this.dealloc(child);
        });

        this._workers.set(pid, {
            process: child,
            timer: this._setChildTTL(child),
        });
        this._idleWorkers.push(pid);

        this._debug(`[${this._name}:${pid}] alloced`);
    }

    _setChildTTL(child) {
        return setTimeout(
            () => this.dealloc(child),
            CHILD_PROCESS_DEALLOC_PERIOD
        );
    }

    dealloc(child) {
        if (child.connected) {
            child.send({
                type: Protocol.DONE,
                args: {},
            });
            child.kill();
        }

        const {pid} = child;
        this._workers.delete(pid);
        this._idleWorkers.splice(this._idleWorkers.indexOf(pid), 1);
        this._debug(`[${this._name}:${pid}] dealloced`);
    }

    getIdleProcess() {
        const workerId = this._idleWorkers.shift();
        const desc = this._workers.get(workerId);

        clearTimeout(desc.timer);
        desc.timer = this._setChildTTL(desc.process);
        return desc.process;
    }

    onExit() {
        this._exit();
    }

    onForceExit() {
        this._exit();
    }

    subscribe() {
        throw new Error(
            'Required "subscribe" method is not implemented for ' +
            this.constructor.name
        );
    }

    dispatchJob(args) {
        setImmediate(() => this._next());
        return new Promise((resolve, reject) => {
            this._jobs.push({
                args,
                promise: {resolve, reject},
            });
        });
    }

    sendAll(type, args) {
        this._workers.forEach(worker => worker.send({type, args}));
    }

    _next() {
        if (!this._jobs.length) return;
        if (!this._idleWorkers.length) {
            if (this.canAlloc()) {
                this.alloc();
                setImmediate(() => this._next());
            }
            return;
        }

        const self = this;

        const {args, promise} = this._jobs.shift();
        const worker = this.getIdleProcess();

        worker.on('message', function onMessage({type, message}) {
            setImmediate(() => self._next());
            if (type === Protocol.ERROR || type === Protocol.DONE) {
                // No longer needed
                worker.removeListener('message', onMessage);
                self._idleWorkers.push(worker.pid);
            }

            if (type === Protocol.ERROR) {
                promise.reject(message);
            } else if (type === Protocol.DONE) {
                promise.resolve(message);
            } else {
                if (!self._subscribers[type]) return;
                self._subscribers[type](message, (type, sendArg) => {
                    analyzeIpc.tic(this._name);
                    worker.send({
                        type,
                        args: sendArg,
                    });
                    analyzeIpc.toc(this._name);
                });
            }
        });

        analyzeIpc.tic(this._name);
        worker.send({
            type: Protocol.START,
            // entry properties
            args,
        });
        analyzeIpc.toc(this._name);
        setImmediate(() => this._next());
    }
}

module.exports = BaseMasterProcess;
