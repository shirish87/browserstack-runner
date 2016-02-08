
var path = require('path');
var Helper = require('./helper');

var browserstackConfig = {
  username: "BROWSERSTACK_USERNAME",
  key: "BROWSERSTACK_KEY"
};

var testHome = path.resolve('.');
var runnerPath = path.resolve(path.join('..', 'bin', 'cli.js'));

var repositories = [
  {
    name: 'mocha',
    tag: '1.21.5',
    url: 'https://github.com/mochajs/mocha.git',
    test_framework: 'mocha',
    browsers: [
      {
        browser: 'chrome',
        browser_version: '48.0',
        os: 'Windows',
        os_version: 'XP'
      }
    ],
    test_path: [
      'test/browser/index.html',
      'test/browser/large.html',
      'test/browser/opts.html'
    ],
    expected_results: {
      tests: 32,
      passed: 30,
      failed: 2
    }
  },
  {
    name: 'mocha',
    tag: '2.4.5',
    url: 'https://github.com/mochajs/mocha.git',
    test_framework: 'mocha',
    browsers: [
      {
        browser: 'chrome',
        browser_version: '48.0',
        os: 'Windows',
        os_version: '7'
      }
    ],
    test_path: [
      'test/browser/grep.html',
      'test/browser/index.html',
      'test/browser/large.html',
      'test/browser/opts.html',
      'test/browser/stack-trace.html',
      'test/browser/ui.html'
    ],
    expected_results: {
      tests: 118,
      passed: 108,
      failed: 10
    }
  }
];

function run(repositories, callback) {
  var repository = repositories.shift();
  if (!repository) {
    return callback(null);
  }

  Helper.runRepository(testHome, runnerPath, repository, browserstackConfig, function (err) {
    if (err) {
      return callback(err);
    }

    run(repositories, callback);
  });
}

run(repositories, function (err) {
  console.log(err || 'Done.');
});
