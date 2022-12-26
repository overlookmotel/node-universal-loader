'use strict';

const {emit} = process;
process.emit = function(name, data) {
	if (
		name === 'warning'
      && data && typeof data === 'object'
      && data.name === 'ExperimentalWarning'
      && (data.message.includes('--experimental-loader')
        || data.message.includes('Custom ESM Loaders is an experimental feature'))
	) return false;

	return emit.apply(process, arguments); // eslint-disable-line prefer-rest-params
};
