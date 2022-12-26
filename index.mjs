/* --------------------
 * node-universal-loader module
 * Entry point
 * ------------------*/

// Imports
import getLoaderUrl from './lib/getLoaderUrl.mjs';
import createLoader from './lib/createLoader.mjs';

// Export loader
const loaderUrl = await getLoaderUrl(import.meta.url);
const loader = createLoader(loaderUrl);
export const {resolve, load, globalPreload} = loader;
