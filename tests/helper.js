
var exec = require('child_process').execFile;
var execSync = require('child_process').execFileSync;
var fs = require('fs');
var path = require('path');
var util = require('util');

module.exports = {
  runRepository: runRepository
};

function runRepository(testHome, runnerPath, repository, conf, callback) {
  var done = function () {
    try {
      process.chdir(testHome);
    } catch(e) {
      return callback('Error switching to test directory: ' + e);
    }

    callback.apply(null, Array.prototype.slice.call(arguments, 0));
  };

  try {
    fs.mkdirSync(repository.name);
  } catch (e) {
    // ignore
  }

  process.chdir(repository.name);
  repository.branch = repository.branch || repository.tag;

  gitCloneByBranch(repository.name, repository.branch, repository.url, function (err, output) {
    if (err && !err.message.match(/already exists/)) {
      return done(err);
    }

    var projectPath = path.resolve(path.join(repository.name + '-' + repository.branch));
    conf.test_framework = repository.test_framework;
    conf.browsers = repository.browsers;
    conf.project = repository.name;
    conf.build = repository.branch;

    conf.test_path = conf.test_path || [];
    (repository.test_path || []).forEach(function (p) {
      conf.test_path.push(p);
    });

    runTests(runnerPath, projectPath, conf, repository.expected_results, done);
  });
}

function gitCloneByBranch(repository, branch, url, callback) {
  var dirName = repository + '-' + branch;

  fs.lstat(dirName, function (err, stat) {
    var dirExistsError = new Error(dirName + ' already exists');
    if (err && (err.code !== 'ENOENT' || err.errno !== -2)) {
      return callback(err);
    }

    if (stat && stat.isDirectory()) {
      return callback(dirExistsError);
    }

    var cmd = util.format('git clone -b %s --single-branch --depth 1 %s %s', branch, url, dirName);
    console.log('Executing:', cmd);
    var cmdParts = cmd.split(' ');

    runCommand(cmdParts.shift(), cmdParts, false, null, callback);
  });
}

function initRepository() {
  try {
    execSync('npm', [ 'install' ]);
  } catch (e) {
    console.error(e.message || e.toString());
  }

  try {
    var stat = fs.lstatSync('bower.json');
    if (stat && stat.isFile()) {
      execSync('bower', [ 'install' ]);
    }
  } catch (e) {
    console.warn(e.message || e.toString());
  }
}

function runTests(runnerPath, projectDir, conf, expectedResults, callback) {
  var results = {
    tests: 0,
    passed: 0,
    failed: 0
  };

  try {
    console.log('Switching to repository:', projectDir);
    process.chdir(projectDir);
  } catch (e) {
    return callback('Error switching to project directory: ' + e);
  }

  initRepository();

  var confPath = path.join(process.cwd(), 'browserstack.json');
  var confString = JSON.stringify(conf, null, 4);
  console.log('Creating config (%s):\n%s', confPath, confString);

  fs.writeFile(confPath, confString, 'utf8', function (err) {
    if (err) {
      return callback(err);
    }

    console.log('Running tests:', projectDir);
    runCommand(runnerPath, [], true, function (data, done) {
      if (data && data.length) {
        var matches = data.match(/\[(.*)\] (passed|failed): (\d+) tests, (\d+) passed, (\d+) failed/i);
        if (matches && matches.length > 5) {
          // results.pages.push(matches[1].split(', ').slice(2).join(''));

          [ 'failed', 'passed', 'tests' ].forEach(function (k) {
            results[k] += parseInt(matches.pop());
          });

          console.log('>', data);
        }
      }

      // continue until end
      done(false);
    }, function (err) {
      if (err) {
        return callback(err);
      }

      var diff = Object.keys(results).reduce(function (o, k) {
        if (isFinite(expectedResults[k]) && expectedResults[k] !== results[k]) {
          o.push(util.format('Mismatch in %s: %d !== %d', k, results[k], expectedResults[k]));
        }

        return o;
      }, []);

      callback(diff.length ? new Error(diff.join('\r\n')) : null, results);
    });
  });
}

function runCommand(cmd, args, ignoreErr, processOutputHook, callback) {
  var isRunning = true,
    output = '',
    subProcess,
    timeoutHandle;

  processOutputHook = processOutputHook || (function (data, done) {
    output += data;
    done();
  });

  var callbackOnce = function (err, result) {
    clearTimeout(timeoutHandle);
    if (subProcess && isRunning) {
      try {
        process.kill(subProcess.pid, 'SIGKILL');
        subProcess = null;
      } catch (e) {
      }
    }

    callback && callback(err, result);
    callback = null;
  };

  var processOutput = function (isError) {
    return function (data) {
      processOutputHook(data, function (isDone) {
        if (isDone) {
          isError ? callbackOnce(new Error(data)) : callbackOnce(null, data);
        }
      });
    };
  };

  try {
    subProcess = exec(cmd, args, function (error, stdout, stderr) {
      isRunning = false;

      if (error && !ignoreErr) {
        callbackOnce(new Error('failed to get process output: ' + error));
      } else {
        processOutputHook(stdout || stderr || output || error, callbackOnce);
      }
    });

    subProcess.stdout.on('data', processOutput(false));
    subProcess.stderr.on('data', processOutput(true));
  } catch (e) {
    // Handles EACCESS and other errors when binary file exists,
    // but doesn't have necessary permissions (among other issues)
    callbackOnce(new Error('failed to get process output: ' + e));
  }
}
