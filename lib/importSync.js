'use strict';

// Modules
const SynchronousWorker = require('@matteo.collina/worker');

// Exports

module.exports = function importSync(url) {
	const worker = new SynchronousWorker();
	const workerImport = worker.createRequire(__filename)('./import.js');
	const promise = workerImport(url);
	return worker.runLoopUntilPromiseResolved(promise);
};
