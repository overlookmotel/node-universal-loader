/* --------------------
 * node-universal-loader module
 * Tests
 * ------------------*/

'use strict';

// Modules
const loader = require('node-universal-loader');

// Init
require('./support/index.js');

// Tests

describe('tests', () => {
	it.skip('all', () => { // eslint-disable-line jest/no-disabled-tests
		expect(loader).toBeDefined();
	});
});
