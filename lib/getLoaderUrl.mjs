// Modules
import {pathToFileURL} from 'url';
import {join as pathJoin} from 'path';
import {resolve} from 'import-meta-resolve';
import assert from 'simple-invariant';

// Exports

export default async function getLoaderUrl(url) {
	// Extract loader from `import.meta.url`
	const urlObj = new URL(url);
	const match = urlObj.search.match(/^\?(.+?)(?:\?(.+))?$/);
	assert(match, 'No loader specified');
	const [, loaderId, query] = match;

	let loaderUrl = await resolve(loaderId, pathToFileURL(pathJoin(process.cwd(), 'dummy.js')).toString());
	if (query) loaderUrl += `?${query}`;
	return loaderUrl;
}
