'use strict';

// Modules
const {isFunction} = require('is-it-type');

// Imports
const {INCOMING, SUCCESS, FAIL, NEXT, ERROR, OTHER, RESOLVE, LOAD} = require('./constants.js');

// Exports

module.exports = {createChannels, defer, wrapError, unwrapError};

function createChannels(port, logName) {
	let nextChannelId = 1;
	const callbacks = new Map();

	function listen(onIncoming) {
		port.onmessage = ({data: {id, type, hook, data}}) => {
			logMessage(logName, 'received', id, type, hook, data);

			if (type === INCOMING) {
				let res;
				try {
					res = onIncoming(id, hook, data);
				} catch (err) {
					post(id, FAIL, hook, wrapError(err));
					return;
				}
				post(id, SUCCESS, hook, res);
				return;
			}

			callbacks.get(id)(type, data);
		};
	}

	function addCallback(messageId, callback) {
		callbacks.set(messageId, (type, data) => {
			const shouldDelete = callback(type, data);
			if (shouldDelete) callbacks.delete(messageId);
		});
	}

	function createChannel(hook, data, onMessage) {
		const channelId = nextChannelId++;
		return message(channelId, INCOMING, hook, data, onMessage);
	}

	function message(channelId, type, hook, data, onMessage) {
		const deferred = defer();
		addCallback(channelId, (replyType, replyData) => {
			if (replyType === SUCCESS) {
				deferred.resolve(replyData);
				return true;
			}

			if (replyType === FAIL) {
				deferred.reject(unwrapError(replyData));
				return true;
			}

			onMessage(replyType, replyData).then(
				value => post(channelId, SUCCESS, hook, value),
				err => post(channelId, FAIL, hook, wrapError(err))
			);
			return false;
		});

		post(channelId, type, hook, data);

		return deferred.promise;
	}

	function post(id, type, hook, data) {
		// debugMessage(logName, 'sending', id, type, hook, data);
		port.postMessage({id, type, hook, data});
	}

	return {listen, addCallback, createChannel, message, post};
}

function defer() {
	const deferred = {promise: null, resolve: null, reject: null};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred;
}

function wrapError(err) {
	if (isFunction(err)) return {type: ERROR, message: 'Unserializable error', stack: null, props: null};

	if (err instanceof Error) {
		const {message, stack, ...props} = err;
		return {type: ERROR, message, stack, props};
	}

	return {type: OTHER, value: err};
}

function unwrapError(errDef) {
	if (errDef.type !== ERROR) return errDef.value;

	const err = new Error(errDef.message);
	if (errDef.stack) err.stack = errDef.stack;
	Object.assign(err, errDef.props);
	return err;
}

function logMessage(logName, action, id, type, hook, data) {
	console.log(`${logName} ${action} message:`, { // eslint-disable-line no-console
		id,
		type: {[INCOMING]: 'INCOMING', [SUCCESS]: 'SUCCESS', [FAIL]: 'FAIL', [NEXT]: 'NEXT'}[type] || type,
		hook: {[RESOLVE]: 'RESOLVE', [LOAD]: 'LOAD'}[hook] || hook,
		data
	});
}
