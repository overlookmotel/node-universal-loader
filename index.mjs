/* --------------------
 * node-universal-loader module
 * Entry point
 * ------------------*/

// Imports
import getLoaderUrl from './lib/getLoaderUrl.js';
import createLoader from './lib/createLoader.js';

// Export loader
const loaderUrl = await getLoaderUrl(import.meta.url);
const loader = createLoader(loaderUrl);
export const {resolve, load, globalPreload} = loader;
