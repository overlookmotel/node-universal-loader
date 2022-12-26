/* --------------------
 * node-universal-loader module
 * Tests
 * ------------------*/

'use strict';

// Modules
const createLoader = require('node-universal-loader/create'); // eslint-disable-line import/no-unresolved

// Init
require('./support/index.js');

// Tests

describe('createLoader', () => {
	it('is function', () => {
		expect(createLoader).toBeFunction();
	});
});
