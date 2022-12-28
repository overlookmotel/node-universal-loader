'use strict';

// Modules
// const {MessageChannel} = require('worker_threads');
const {pathToFileURL, fileURLToPath} = require('url'),
	{isObject, isString} = require('is-it-type');

// Imports
const {wrapError} = require('./errors.js'),
	{INIT, RESOLVE, LOAD, SUCCESS, FAIL} = require('./constants.js');

// Exports

const TypedArray = Object.getPrototypeOf(Int8Array);

module.exports = async function createLoader(loaderUrl) {
	const loader = await import(loaderUrl);
	const {resolve, load, globalPreload} = loader;

	const wrappedLoader = {resolve: undefined, load: undefined, globalPreload: undefined};

	if (resolve) {
		// eslint-disable-next-line arrow-body-style
		wrappedLoader.resolve = (specifier, context, nextResolve) => {
			return resolve(specifier, context, nextResolve);
		};
	}

	if (load) {
		// eslint-disable-next-line arrow-body-style
		wrappedLoader.resolve = (url, context, nextLoad) => {
			return load(url, context, nextLoad);
		};
	}

	let notifyHandle;

	function runInit(data) {
		notifyHandle = data.notifyHandle;
	}

	async function runResolve(data) {
		const defaultResolve = () => { throw new Error('Not implemented'); }; // TODO
		const context = {
			conditions: ['node', 'require', 'default'], // TODO Correct?
			importAssertions: {},
			parentUrl: data.parentPath ? pathToFileURL(data.parentPath).toString() : undefined
		};
		const res = await resolve(data.specifier, context, defaultResolve);

		if (!isObject(res)) {
			throw errorWithCode(TypeError, 'ERR_INVALID_RETURN_VALUE', `Expected an object to be returned from the "${loaderUrl} 'resolve' hook's nextResolve()" function.`);
		}
		if (res.shortCircuit !== true) {
			throw errorWithCode(Error, 'ERR_LOADER_CHAIN_INCOMPLETE', `"${loaderUrl} 'resolve'" did not call the next hook in its chain and did not explicitly signal a short circuit. If this is intentional, include \`shortCircuit: true\` in the hook's return.`);
		}
		if (res.format != null && !isString(res.format)) {
			throw errorWithCode(TypeError, 'ERR_INVALID_RETURN_PROPERTY_VALUE', `Expected a string to be returned for the "format" from the "${loaderUrl} 'resolve'" function.`);
		}
		if (!isString(res.url)) {
			throw errorWithCode(TypeError, 'ERR_INVALID_RETURN_PROPERTY_VALUE', `Expected a url string to be returned for the "url" from the "${loaderUrl} 'resolve'" function.`);
		}

		return {format: res.format, url: fileURLToPath(res.url)};
	}

	async function runLoad(data) {
		const defaultLoad = () => { throw new Error('Not implemented'); }; // TODO
		const context = {
			conditions: ['node', 'require', 'default'], // TODO Correct?
			format: 'commonjs',
			parentUrl: pathToFileURL(data.parentPath).toString()
		};
		const res = await resolve(data.url, context, defaultLoad);
		if (!isObject(res)) {
			throw errorWithCode(TypeError, 'ERR_INVALID_RETURN_VALUE', `Expected an object to be returned from the "${loaderUrl} 'load' hook's nextLoad()" function.`);
		}
		if (res.shortCircuit !== true) {
			throw errorWithCode(Error, 'ERR_LOADER_CHAIN_INCOMPLETE', `"${loaderUrl} 'load'" did not call the next hook in its chain and did not explicitly signal a short circuit. If this is intentional, include \`shortCircuit: true\` in the hook's return.`);
		}

		const {format} = res;
		if (!isString(format)) {
			throw errorWithCode(TypeError, 'ERR_INVALID_RETURN_PROPERTY_VALUE', `Expected a string to be returned for the "format" from the "${loaderUrl} 'resolve'" function.`);
		}

		if (format === 'module') throw new Error('Cannot load ES modules with `require()`');

		// TODO Would be faster to transfer buffers as `ArrayBuffer`s
		let {source} = res;
		if (source instanceof ArrayBuffer) {
			source = Buffer.from(source).toString('utf8');
		} else if (source instanceof TypedArray) {
			source = Buffer.from(source.buffer, source.byteOffset, source.byteLength).toString('utf8');
		} else if (!isString(source)) {
			throw errorWithCode(TypeError, 'ERR_INVALID_RETURN_PROPERTY_VALUE', 'Expected string, array buffer, or typed array to be returned for the "source" from the "load" function but got type object.');
		}

		return {format, source};
	}

	wrappedLoader.globalPreload = ({port}) => {
		port.onmessage = ({data: {id, hook, data}}) => {
			console.log('loader received message:', { // eslint-disable-line no-console
				id,
				hook: {[INIT]: 'INIT', [RESOLVE]: 'RESOLVE', [LOAD]: 'LOAD'}[hook] || hook,
				data
			});

			(async () => {
				try {
					const run = {[INIT]: runInit, [RESOLVE]: runResolve, [LOAD]: runLoad}[hook];
					const res = await run(data);
					post(id, SUCCESS, res);
				} catch (err) {
					post(id, FAIL, wrapError(err));
				}
			})();
		};

		function post(id, type, data) {
			console.log('loader sending message:', { // eslint-disable-line no-console
				id,
				type: {[SUCCESS]: 'SUCCESS', [FAIL]: 'FAIL'}[type] || type,
				data
			});

			port.postMessage({id, type, data});
			Atomics.store(notifyHandle, 0, 1);
			Atomics.notify(notifyHandle, 0);
		}

		// TODO Pass port
		const preloadCode = globalPreload ? globalPreload() : undefined;

		return `
			const {createRequire} = getBuiltin('module');
			const require = createRequire(${JSON.stringify(__filename)});
			require('./preload.js')(
				${!!resolve}, ${!!load}, getBuiltin, port, ${JSON.stringify(preloadCode)}
			);
		`;
	};

	return wrappedLoader;
};

function errorWithCode(ErrorClass, code, message) {
	const err = new ErrorClass(message);
	err.code = code;
	return err;
}
