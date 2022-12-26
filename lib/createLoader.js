'use strict';

// Modules
const pathJoin = require('path').join;

// Exports

module.exports = function createLoader(loaderUrl) {
	return {
		globalPreload({port}) { // eslint-disable-line no-unused-vars
			return [
				`console.log('loaderUrl in preload:', ${JSON.stringify(loaderUrl)});`,
				"const {createRequire} = getBuiltin('module');",
				`const require = createRequire(${JSON.stringify(__filename)});`,
				`const importSync = require(${JSON.stringify(pathJoin(__filename, '../importSync.js'))});`,
				`const loader = importSync(${JSON.stringify(loaderUrl)});`,
				'console.log("loader:", loader);'
			].join('\n');
		}
	};
};
