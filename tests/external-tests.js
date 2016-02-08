
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
      tests: 100,
      passed: 92,
      failed: 8
    }
  },
  {
    name: 'mocha',
    tag: 'v2.4.5',
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
      tests: 229,
      passed: 206,
      failed: 23
    }
  },
  {
    name: 'qunit',
    tag: 'v1.0.0',
    url: 'https://github.com/jquery/qunit.git',
    test_framework: 'qunit',
    browsers: [
      {
        "browser_version": "44.0",
        "os_version": "Snow Leopard",
        "browser": "firefox",
        "os": "OS X",
        "device": null
      }
    ],
    test_path: [
      'test/index.html',
      'test/logs.html'
    ],
    expected_results: {
      tests: 606,
      passed: 606,
      failed: 0
    }
  },
  {
    name: 'qunit',
    tag: '1.21.0',
    url: 'https://github.com/jquery/qunit.git',
    test_framework: 'qunit',
    browsers: [
      {
        "browser_version": "44.0",
        "os_version": "El Capitan",
        "browser": "firefox",
        "os": "OS X",
        "device": null
      }
    ],
    test_path: [
      'test/autostart.html',
      'test/index.html',
      'test/logs.html',
      'test/startError.html'
    ],
    expected_results: {
      tests: 590,
      passed: 590,
      failed: 0
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
  if (err) {
    throw err;
  }

  console.log('Done.');
});
