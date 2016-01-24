
'use strict';

var fs = require('fs');
var path = require('path');
var UglifyJS = require('uglify-js');

var patchRootDir = path.join(__dirname, '_patch');
var patchCache = {};

var patchTagStart = '\n<!-- BrowserStackRunner -->\n<script type="text/javascript">\n';
var patchTagEnd = '\n</script>\n<!-- /BrowserStackRunner -->\n';

var scripts = [
  'json2.js',
  'browserstack.js',
  'browserstack-util.js'
];

var framework_scripts = {
  'qunit': {
    files: [ 'qunit-plugin.js' ]
  },

  'jasmine': {
    files: [ 'jasmine-jsreporter.js', 'jasmine-plugin.js' ],
    inline: 'jasmine.getEnv().addReporter(new jasmine.JSReporter());'
  },

  'jasmine2': {
    files: [ 'jasmine2-plugin.js' ]
  },

  'mocha': {
    files: [ 'mocha-plugin.js' ],
    inline: 'mocha.reporter(Mocha.BrowserStack);'
  }
};


function readFiles(files, separator, callback) {
  if (typeof separator === 'function') {
    callback = separator;
    separator = '';
  }

  var fileCount = files.length;
  if (!Array.isArray(files) || !fileCount) {
    return callback();
  }

  var contents = [];

  (function readFile(i) {
    fs.readFile(files[i], 'utf8', function (err, data) {
      if (err) {
        return callback(err);
      }

      if (data && data.length) {
        contents.push(data);
      }

      if (i === fileCount - 1) {
        return callback(null, contents.join(separator));
      }

      readFile(++i);
    });
  })(0);
}


function getPatch(framework, callback) {
  if (!framework || !framework_scripts[framework]) {
    return callback(new Error('Could not apply patch: unrecognized framework: ' + framework));
  }

  // return cached patch, if available
  if (patchCache[framework]) {
    return callback(null, patchCache[framework]);
  }

  var frameworkPatch = framework_scripts[framework];

  var frameworkFiles = [].concat(scripts).concat(frameworkPatch.files).map(function (f) {
    return path.join(patchRootDir, f);
  });

  readFiles(frameworkFiles, '\n', function (err, contents) {
    if (err) {
      return callback(err);
    }

    contents = contents || '';

    if (frameworkPatch.inline) {
      contents += frameworkPatch.inline;
    }

    try {
      var result = UglifyJS.minify(contents, { fromString: true });
      contents = (result && result.code) || contents;
    } catch (e) {
      // TODO: log error
    }

    patchCache[framework] = patchTagStart + contents + patchTagEnd;
    callback(null, patchCache[framework]);
  });
}


function applyPatch(framework, content, callback) {
  if (!framework || !framework_scripts[framework]) {
    return callback(new Error('Could not apply patch: unrecognized framework: ' + framework));
  }

  var tagName = (framework === 'mocha') ? 'head' : 'body';
  var tagToReplace = '</' + tagName + '>';
  var tagRegExp = new RegExp(tagToReplace, 'i');

  if (!tagRegExp.test(content)) {
    return callback(new Error('Could not apply patch: content missing ' + tagToReplace + ' tag'));
  }

  getPatch(framework, function (err, patch) {
    if (err) {
      return callback(err);
    }

    callback(null, content.replace(tagRegExp, patch + '\n\n' + tagToReplace));
  });
}


module.exports = {
  getPatch: getPatch,
  applyPatch: applyPatch
};