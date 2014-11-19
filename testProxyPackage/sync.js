/*jshint -W030 */
/* global
 DEBUG:true
 */

DEBUG = !!process.env.VELOCITY_DEBUG;

Velocity.ProxyPackageSync = {};

(function () {
  'use strict';

  if (process.env.NODE_ENV !== 'development' || process.env.IS_MIRROR) {
    DEBUG && console.log('[proxy-package-sync] ' + (process.env.IS_MIRROR ? 'Mirror detected - ' : '') + 'Not adding code');
    return;
  }
  Meteor.startup(function () {
    var _regeneratePackageJsDebounced = _.debounce(Meteor.bindEnvironment(Velocity.ProxyPackageSync.regeneratePackageJs), 200);
    velocityFilesCursor.observe({
      added: _regeneratePackageJsDebounced,
      removed: _regeneratePackageJsDebounced
    });
  });

  var velocityFilesCursor = VelocityTestFiles.find({}, {sort: {name: -1}}),
      path = Npm.require('path'),
      fs = Npm.require('fs'),
      mkdirp = Npm.require('mkdirp'),
      _ = Npm.require('lodash');


//////////////////////////////////////////////////////////////////////////////////////////////////
// Public Methods
//

  _.extend(Velocity.ProxyPackageSync, {
    regeneratePackageJs: function () {

      console.log('[proxy-package-sync]', 'Checking if package.js needs to be regenerated');

      var packageJsContent = _gePackageJsContent();
      if (_packageContentIdenticalToCurrentPackageJS(packageJsContent)) {
        DEBUG && console.log('[proxy-package-sync]', 'No changes to package.js file required');
        return;
      }

      console.log('[proxy-package-sync]', 'Changes detected. Clearing package.js file and restarting');
      _createProxyPackageDirectory();
      _createSymlinkToTestsDirectory();
      _writePackageJsFile(packageJsContent);
    }
  });

//////////////////////////////////////////////////////////////////////////////////////////////////
// Private Methods
//

  function _packageContentIdenticalToCurrentPackageJS (packageJsContent) {
    if (!fs.existsSync(_getPackageJsFilePath())) {
      console.error('[proxy-package-sync]', 'package.js file doe not exist');
      return false;
    }
    var currentPackageJS = fs.readFileSync(_getPackageJsFilePath()).toString();

    DEBUG && console.log('- - -');
    DEBUG && console.log('comparing:');
    DEBUG && console.log(currentPackageJS);
    DEBUG && console.log('with:');
    DEBUG && console.log(packageJsContent);
    DEBUG && console.log('- - -');

    return packageJsContent === currentPackageJS;
  }

  function _getPackageJsFilePath () {
    var testProxyPackageDir = path.join(Velocity.getAppPath(), 'packages', 'tests-proxy');
    return path.join(testProxyPackageDir, 'package.js');
  }

  function _writePackageJsFile (packageJsContent) {
    DEBUG && console.log('[proxy-package-sync]', 'writing package.js file');
    fs.writeFileSync(_getPackageJsFilePath(), packageJsContent);
  }

  function _createSymlinkToTestsDirectory () {
    var testProxyPackageDir = path.join(Velocity.getAppPath(), 'packages', 'tests-proxy'),
        testProxyPackageTestsDir = path.join(testProxyPackageDir, 'tests');

    // FIXME use relative thing
    if (!fs.existsSync(testProxyPackageTestsDir)) {
      console.log('[proxy-package-sync]', 'creating symlink to tests directory');
      fs.symlinkSync(Velocity.getTestsPath(), testProxyPackageTestsDir, 'dir');
    }
  }

  function _createProxyPackageDirectory () {
    var testProxyPackageDir = path.join(Velocity.getAppPath(), 'packages', 'tests-proxy');
    mkdirp.sync(testProxyPackageDir);
  }

  function _gePackageJsContent () {
    return '' +
      'Package.describe({' + '\n' +
      '\t' + 'name: "velocity:test-proxy",' + '\n' +
      '\t' + 'summary: "Dynamically created package to expose test files to mirrors",' + '\n' +
      '\t' + 'version: "0.0.1",' + '\n' +
      '\t' + 'debugOnly: true' + '\n' +
      '});' + '\n' +
      '\n' +
      'Package.on_use(function (api) {' + '\n' +
      _getTestFiles() +
      '});';
  }

  function _getTestFiles () {
    var testFiles = '';

    var files = velocityFilesCursor.fetch();
    _.each(files, function (file) {
      if (!_isUnitTest(file)) {
        testFiles += '\t' + 'api.add_files("' + file.relativePath + '",' + _getTarget(file) + ');' + '\n';
      }
    });
    return testFiles;
  }

  function _isUnitTest (file) {
    var unitTestFragment = path.join(path.sep, 'unit', path.sep);
    return file.relativePath.indexOf(unitTestFragment) !== -1;
  }

  function _getTarget (file) {
    var clientPathFragment = path.join(path.sep, 'client', path.sep),
        serverPathFragment = path.join(path.sep, 'server', path.sep);
    if (file.relativePath.indexOf(clientPathFragment) !== -1) {
      return '["client"]';
    } else if (file.relativePath.indexOf(serverPathFragment) !== -1) {
      return '["server"]';
    } else {
      return '["server","client"]';
    }
  }

})();

