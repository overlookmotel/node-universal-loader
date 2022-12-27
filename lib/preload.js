'use strict';

// Modules
const {MessageChannel} = require('worker_threads'),
	SynchronousWorker = require('@matteo.collina/worker'),
	{isFunction} = require('is-it-type');

// Imports
const {createChannels, wrapError} = require('./utils.js'),
	{RESOLVE, SUCCESS, FAIL, INIT, NEXT} = require('./constants.js');

// Exports

module.exports = function preload(loaderUrl, port, getBuiltin) {
	const {listen, message, post} = createChannels(port, 'inner');
	port.unref();

	let worker, loader;
	try {
		worker = new SynchronousWorker();
		const workerImport = worker.createRequire(__filename)('./import.js');
		const promise = workerImport(loaderUrl);
		loader = worker.runLoopUntilPromiseResolved(promise);
	} catch (err) {
		post(0, FAIL, INIT, wrapError(err));
		return;
	}

	const {resolve, load} = loader;

	listen((channelId, hook, data) => {
		const promise = (hook === RESOLVE ? resolve : load)(
			...data,
			(specifier, context) => message(channelId, NEXT, hook, [specifier, context])
		);

		if (!promise || !isFunction(promise.then)) {
			console.log('is not promise');
			return promise;
		}

		const res = worker.runLoopUntilPromiseResolved(promise);
		console.log('res:', res);
		return res;
	});

	post(0, SUCCESS, INIT, {resolve: !!loader.resolve, load: !!loader.load});

	if (loader.globalPreload) {
		const {port1, port2} = new MessageChannel();
		const preloadCode = loader.globalPreload.call(undefined, {port: port1});
		// eslint-disable-next-line no-new-func
		new Function('getBuiltin', 'port', preloadCode)(getBuiltin, port2);
	}

	// TODO Patch CommonJS loader
};
