'use strict';

// Modules
const SynchronousWorker = require('@matteo.collina/worker');

// Imports
const {createChannels, wrapError} = require('./utils.js'),
	{RESOLVE, SUCCESS, FAIL, INIT, NEXT} = require('./constants.js');

// Exports

module.exports = function preload(loaderUrl, port, getBuiltin) {
	const {listen, message, post} = createChannels(port, 'inner');
	port.unref();

	let loader;
	try {
		loader = importSync(loaderUrl);
	} catch (err) {
		post(0, FAIL, INIT, wrapError(err));
		return;
	}

	const {resolve, load} = loader;

	listen((channelId, hook, data) => (hook === RESOLVE ? resolve : load)(
		...data,
		(specifier, context) => message(channelId, NEXT, hook, [specifier, context])
	));

	post(0, SUCCESS, INIT, {resolve: !!loader.resolve, load: !!loader.load});

	if (loader.globalPreload) {
		// TODO Proxy outer port
		const preloadCode = loader.globalPreload();

		// TODO Proxy inner port
		// eslint-disable-next-line no-new-func
		new Function('getBuiltin', preloadCode)(getBuiltin);
	}
};

function importSync(url) {
	const worker = new SynchronousWorker();
	const workerImport = worker.createRequire(__filename)('./import.js');
	const promise = workerImport(url);
	return worker.runLoopUntilPromiseResolved(promise);
}
