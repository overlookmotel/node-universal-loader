// Modules
import {join as pathJoin} from 'path';
import {fileURLToPath} from 'url';

// Exports
const localPath = fileURLToPath(import.meta.url);

export default function createLoader(loaderUrl) {
	return {
		globalPreload({port}) { // eslint-disable-line no-unused-vars
			return [
				`console.log('loaderUrl in preload:', ${JSON.stringify(loaderUrl)});`,
				"const {createRequire} = getBuiltin('module');",
				`const require = createRequire(${JSON.stringify(localPath)});`,
				`const importSync = require(${JSON.stringify(pathJoin(localPath, '../importSync.cjs'))});`,
				`const loader = importSync(${JSON.stringify(loaderUrl)});`,
				'console.log("loader:", loader);'
			].join('\n');
		}
	};
}
