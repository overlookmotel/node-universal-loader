'use strict';

// Imports
const {createChannels, defer, unwrapError} = require('./utils.js'),
	{RESOLVE, LOAD, FAIL} = require('./constants.js');

// Exports

module.exports = function createLoader(loaderUrl) {
	let readyDeferred = defer(),
		resolve,
		load;

	return {
		async resolve(specifier, context, nextResolve) {
			if (readyDeferred) await readyDeferred.promise;
			if (resolve) return resolve(specifier, context, nextResolve);
			return nextResolve(specifier, context);
		},

		async load(url, context, nextLoad) {
			if (readyDeferred) await readyDeferred.promise;
			if (load) return load(url, context, nextLoad);
			return nextLoad(url);
		},

		globalPreload({port}) {
			const {listen, addCallback, createChannel} = createChannels(port, 'outer');

			addCallback(0, (type, data) => {
				if (type === FAIL) {
					readyDeferred.reject(unwrapError(data));
				} else {
					if (data.resolve) resolve = createHandler(RESOLVE);
					if (data.load) load = createHandler(LOAD);

					readyDeferred.resolve();
				}

				readyDeferred = undefined;
				port.unref();

				return true;
			});

			function createHandler(hook) {
				return (arg1, arg2, next) => createChannel(
					hook, [arg1, arg2], (inType, inData) => next(...inData)
				);
			}

			listen();

			return [
				"const {createRequire} = getBuiltin('module');",
				`const require = createRequire(${JSON.stringify(__filename)});`,
				`require('./preload.js')(${JSON.stringify(loaderUrl)}, port, getBuiltin);`
			].join('\n');
		}
	};
};
