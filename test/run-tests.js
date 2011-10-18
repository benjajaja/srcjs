var reporter = require('nodeunit').reporters.default;
reporter.run([
	'test-startstop.js',
	'../plugins/mc_jsonapi/plugintest.js',
]);