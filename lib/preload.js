'use strict';

// Modules
const {receiveMessageOnPort} = require('worker_threads');

// Imports
const {unwrapError} = require('./errors.js'),
	{INIT, RESOLVE, LOAD, SUCCESS, FAIL} = require('./constants.js');

// Exports

module.exports = function preload(hasResolveHook, hasLoadHook, getBuiltin, port, preloadCode) {
	let nextMessageId = 0;

	const notifyHandle = new Int32Array(new SharedArrayBuffer(4));
	// message(INIT, {notifyHandle});
	// message(INIT, {});
	post(INIT, {notifyHandle});

	function message(hook, data) {
		const id = post(hook, data);

		return;

		Atomics.wait(notifyHandle, 0, 0);
		const reply = receiveMessageOnPort(port).message;

		console.log('global received message:', { // eslint-disable-line no-console
			id: reply.id,
			type: {[SUCCESS]: 'SUCCESS', [FAIL]: 'FAIL'}[reply.type] || reply.type,
			data: reply.data
		});

		if (reply.id !== id) throw new Error('Received invalid message from loader');

		if (reply.type === SUCCESS) return reply.data;
		throw unwrapError(reply.data);
	}

	function post(hook, data) {
		const id = nextMessageId++;
		console.log('global sending message:', { // eslint-disable-line no-console
			id,
			hook: {[INIT]: 'INIT', [RESOLVE]: 'RESOLVE', [LOAD]: 'LOAD'}[hook] || hook,
			data
		});
		port.postMessage({id, hook, data});
		return id;
	}

	if (preloadCode) {
		// TODO Pass a port too
		(new Function('getBuiltin', preloadCode))(getBuiltin); // eslint-disable-line no-new-func
	}

	// Patch CommonJS loader
	// TODO

	// Dummy message
	message(RESOLVE, {specifier: './errors.js', parentPath: __filename});
};
