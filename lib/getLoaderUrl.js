'use strict';

// Modules
const {pathToFileURL} = require('url'),
	pathJoin = require('path').join,
	assert = require('simple-invariant');

// Exports

module.exports = async function getLoaderUrl(url) {
	// Extract loader from `import.meta.url`
	const urlObj = new URL(url);
	const match = urlObj.search.match(/^\?(.+?)(?:\?(.+))?$/);
	assert(match, 'No loader specified');
	const [, loaderId, query] = match;

	const {resolve} = await import('import-meta-resolve');
	let loaderUrl = await resolve(loaderId, pathToFileURL(pathJoin(process.cwd(), 'dummy.js')).toString());
	if (query) loaderUrl += `?${query}`;
	return loaderUrl;
};
