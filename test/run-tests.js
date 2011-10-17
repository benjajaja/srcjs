var reporter = require('nodeunit').reporters.default;
reporter.run([
	'test-startstop.js',
	'../plugins/mc_jsonapi/test.js',
]);