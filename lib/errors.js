'use strict';

// Modules
const {isFunction} = require('is-it-type');

// Imports
const {ERROR, OTHER} = require('./constants.js');

// Exports

module.exports = {wrapError, unwrapError};

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
