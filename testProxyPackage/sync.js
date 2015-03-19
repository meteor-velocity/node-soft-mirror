/*jshint -W030 */
/* global
 DEBUG:true,
 VelocityTestFiles: true,
 VelocityFixtureFiles: true
 */

DEBUG = !!process.env.VELOCITY_DEBUG;

Velocity.ProxyPackageSync = {};

(function () {
  'use strict';

  if (process.env.NODE_ENV !== 'development' || process.env.IS_MIRROR || process.env.VELOCITY === '0') {
    DEBUG && console.log('[proxy-package-sync] ' + (process.env.IS_MIRROR ? 'Mirror detected - ' : '') + 'Not adding code');
    return;
  }

  var path = Npm.require('path'),
      fs = Npm.require('fs'),
      mkdirp = Npm.require('mkdirp');

  Velocity.startup(function () {
    var _regeneratePackageJsDebounced = _.debounce(Meteor.bindEnvironment(Velocity.ProxyPackageSync.regeneratePackageJs), 200);
    VelocityTestFiles.find({}).observe({
      added: function(f) {
        DEBUG && console.log('[proxy-package-sync]', 'Test file added', f.relativePath);
        _regeneratePackageJsDebounced();
      }
    });
    VelocityFixtureFiles.find({}).observe({
      added: function(f) {
        DEBUG && console.log('[proxy-package-sync]', 'Fixture added', f.relativePath);
        _regeneratePackageJsDebounced();
      }
    });
  });


//////////////////////////////////////////////////////////////////////////////////////////////////
// Public Methods
//

  _.extend(Velocity.ProxyPackageSync, {
    regeneratePackageJs: function () {

      DEBUG && console.log('[proxy-package-sync]', 'Checking if a new package.js needs to be written because', arguments, this);

      var generatedPackageJsContent = _generatePackageJsContent();
      if (_generatedPackageContentIdenticalToCurrentPackageJS(generatedPackageJsContent)) {
        DEBUG && console.log('[proxy-package-sync]', 'No changes to package.js file required');
        return;
      }

      DEBUG && console.log('[proxy-package-sync]', 'Changes detected. Clearing package.js file and restarting');

      _createProxyPackageDirectory();
      _createSymlink('tests', Velocity.getTestsPath());
      // TODO: Upgrade velocity:core dependency when this is available
      //       and activate the next line
      //_createSymlink('packages', Velocity.getPackagesPath());
      _writePackageJsFile(generatedPackageJsContent);
    }
  });

//////////////////////////////////////////////////////////////////////////////////////////////////
// Private Methods
//

  function _generatedPackageContentIdenticalToCurrentPackageJS (generatedPackageJsContent) {
    if (!fs.existsSync(_getPackageJsFilePath())) {
      DEBUG && console.log('[proxy-package-sync]', 'package.js file does not exist');
      return false;
    }
    var currentPackageJS = fs.readFileSync(_getPackageJsFilePath()).toString();

    DEBUG && console.log('[proxy-package-sync] Comparing:');
    DEBUG && console.log('[proxy-package-sync] - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');
    DEBUG && console.log('[proxy-package-sync] - - - - - - - - - currentPackageJS: - - - - - - - - - - - - -');
    DEBUG && console.log(currentPackageJS);
    DEBUG && console.log('[proxy-package-sync] - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');
    DEBUG && console.log('[proxy-package-sync] - - - - - - - - - generatedPackageJsContent - - - - - - - - -');
    DEBUG && console.log(generatedPackageJsContent);
    DEBUG && console.log('[proxy-package-sync] - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -');

    return generatedPackageJsContent === currentPackageJS;
  }

  function _getPackageJsFilePath () {
    var testProxyPackageDir = path.join(Velocity.getAppPath(), 'packages', 'tests-proxy');
    return path.join(testProxyPackageDir, 'package.js');
  }

  function _writePackageJsFile (packageJsContent) {
    DEBUG && console.log('[proxy-package-sync]', 'writing package.js file');
    fs.writeFileSync(_getPackageJsFilePath(), packageJsContent);
  }

  function _createSymlink (directory, fullpath) {
    var testProxyPackageDir = path.join(Velocity.getAppPath(), 'packages', 'tests-proxy'),
      testProxyPackageTestsDir = path.join(testProxyPackageDir, directory),
      relativeTestsPath = path.relative(testProxyPackageDir, fullpath);

    if (!fs.existsSync(testProxyPackageTestsDir)) {
      DEBUG && console.log('[proxy-package-sync]', 'creating symlink to tests directory');
      fs.symlinkSync(relativeTestsPath, testProxyPackageTestsDir, 'dir');
    }
  }

  function _createProxyPackageDirectory () {
    var testProxyPackageDir = path.join(Velocity.getAppPath(), 'packages', 'tests-proxy');
    mkdirp.sync(testProxyPackageDir);
  }

  function _generatePackageJsContent () {
    DEBUG && console.log('[proxy-package-sync] Generating in-memory package.js');
    var content = '' +
      'Package.describe({' + '\n' +
      '\t' + 'name: "velocity:test-proxy",' + '\n' +
      '\t' + 'summary: "Dynamically created package to expose test files to mirrors",' + '\n' +
      '\t' + 'version: "0.0.4",' + '\n' +
      '\t' + 'debugOnly: true' + '\n' +
      '});' + '\n' +
      '\n' +
      'Package.onUse(function (api) {' + '\n' +
      '\t' + 'api.use("coffeescript", ["client", "server"]);' + '\n';

    // This is a hardcoded list because tests-proxy will be removed soon anyway.
    var testingFrameworks = [
      'sanjo:jasmine',
      'mike:mocha',
      'xolvio:cucumber',
      'clinical:nightwatch',
      'nblazer:casperjs',
      'rsbatech:robotframework'
    ]

    // Depending weakly on the testing frameworks makes sure that
    // the frameworks are loaded before the testing-proxy
    testingFrameworks.forEach(function (testingFramework) {
      content += '\t' + 'api.use("' + testingFramework + '", {weak: true});' + '\n';
    });

    content +=
      _getFixtureFiles() +
      _getTestFiles() +
      '});';

    return content;
  }

  /**
   * Sort case-insensitive by absoluteUrl
   * @param files
   * @returns {Array}
   * @private
   */
  function _sortFiles (files) {
    return _.sortBy(files, function (file) {
      return file.absolutePath && file.absolutePath.toLowerCase();
    });
  }

  function _getTestFiles () {
    var packageJsTestFileEntries = '';
    var testFiles = _sortFiles(VelocityTestFiles.find({}).fetch());
    DEBUG && console.log('[proxy-package-sync] Test files list length: ', testFiles.length);
    _.each(testFiles, function (testFile) {
      if (_shouldIncludeInMirror(testFile)) {
        DEBUG && console.log('[proxy-package-sync] Test file will be included in mirror', testFile.relativePath);
        packageJsTestFileEntries += '\t' + 'api.add_files("' + testFile.relativePath + '",' + _getTarget(testFile) + ');' + '\n';
      } else {
        DEBUG && console.log('[proxy-package-sync] Test file will not be included in mirror', testFile.relativePath);
      }
    });
    return packageJsTestFileEntries;
  }

  function _getFixtureFiles () {
    var packageJsFixtureFileEntries = '';
    var fixtureFiles = _sortFiles(VelocityFixtureFiles.find({}).fetch());
    DEBUG && console.log('[proxy-package-sync] Fixture files list length: ', fixtureFiles.length);
    _.each(fixtureFiles, function (fixtureFile) {
      DEBUG && console.log('[proxy-package-sync] Fixture file will be included in mirror', fixtureFile.relativePath);
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
    return !_inUnitFolder(file) && !_inFeaturesFolder(file);
  }

  function _inUnitFolder (file) {
    var integrationTestFragment = path.join(path.sep, 'unit', path.sep);
    return file.relativePath.indexOf(integrationTestFragment) !== -1;
  }

  function _inFeaturesFolder (file) {
    var integrationTestFragment = path.join(path.sep, 'features', path.sep);
    return file.relativePath.indexOf(integrationTestFragment) !== -1;
  }


})();

