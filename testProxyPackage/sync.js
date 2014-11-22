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

  var velocityTestFilesCursor = VelocityTestFiles.find({}, {sort: {name: -1}}),
      velocityFixtureFilesCursor = VelocityFixtureFiles.find({}, {sort: {name: -1}}),
      path = Npm.require('path'),
      fs = Npm.require('fs'),
      mkdirp = Npm.require('mkdirp'),
      _ = Npm.require('lodash');

  Meteor.startup(function () {
    var _regeneratePackageJsDebounced = _.debounce(Meteor.bindEnvironment(Velocity.ProxyPackageSync.regeneratePackageJs), 200);
    velocityTestFilesCursor.observe({
      added: _regeneratePackageJsDebounced,
      removed: _regeneratePackageJsDebounced
    });
    velocityFixtureFilesCursor.observe({
      added: _regeneratePackageJsDebounced,
      removed: _regeneratePackageJsDebounced
    });
  });


//////////////////////////////////////////////////////////////////////////////////////////////////
// Public Methods
//

  _.extend(Velocity.ProxyPackageSync, {
    regeneratePackageJs: function () {

      DEBUG && console.log('[proxy-package-sync]', 'Checking if package.js needs to be regenerated');

      var packageJsContent = _gePackageJsContent();
      if (_packageContentIdenticalToCurrentPackageJS(packageJsContent)) {
        DEBUG && console.log('[proxy-package-sync]', 'No changes to package.js file required');
        return;
      }

      DEBUG && console.log('[proxy-package-sync]', 'Changes detected. Clearing package.js file and restarting');
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
      DEBUG && console.error('[proxy-package-sync]', 'package.js file does not exist');
      return false;
    }
    var currentPackageJS = fs.readFileSync(_getPackageJsFilePath()).toString();

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
      DEBUG && console.log('[proxy-package-sync]', 'creating symlink to tests directory');
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
      '\t' + 'version: "0.0.4",' + '\n' +
      '\t' + 'debugOnly: true' + '\n' +
      '});' + '\n' +
      '\n' +
      'Package.on_use(function (api) {' + '\n' +
      _getTestFiles() +
      _getFixtureFiles() +
      '});';
  }

  function _getTestFiles () {
    var packageJsTestFileEntries = '';
    _.each(velocityTestFilesCursor.fetch(), function (testFile) {
      if (_shouldIncludeInMirror(testFile)) {
        DEBUG && console.log('[proxy-package-sync] adding test file to package.js', testFile.relativePath);
        packageJsTestFileEntries += '\t' + 'api.add_files("' + testFile.relativePath + '",' + _getTarget(testFile) + ');' + '\n';
      }
    });
    return packageJsTestFileEntries;
  }

  function _getFixtureFiles () {
    var packageJsFixtureFileEntries = '';
    _.each(velocityFixtureFilesCursor.fetch(), function (fixtureFile) {
      DEBUG && console.log('[proxy-package-sync] adding fixture file to package.js', fixtureFile.relativePath);
      packageJsFixtureFileEntries += '\t' + 'api.add_files("' + fixtureFile.relativePath + '", ["server"]);' + '\n';
    });
    return packageJsFixtureFileEntries;
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

  function _shouldIncludeInMirror (file) {
    // TODO extract these to come from regex or similar when the framework registers
    return !_inUnitFolder(file);
  }

  function _inUnitFolder (file) {
    var integrationTestFragment = path.join(path.sep, 'unit', path.sep);
    return file.relativePath.indexOf(integrationTestFragment) !== -1;
  }


})();

