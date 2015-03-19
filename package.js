/*jshint -W117, -W097 */
'use strict';

Package.describe({
  name: 'velocity:node-soft-mirror',
  summary: 'A Node based soft-mirror for use by Velocity compatible test frameworks',
  version: '0.3.1',
  git: 'https://github.com/meteor-velocity/node-soft-mirror.git',
  debugOnly: true
});

Npm.depends({
  'mkdirp': '0.5.0',
  'fs-extra': '0.12.0'
});

var fs   = Npm.require('fs'),
    path = Npm.require('path');

Package.on_use(function (api) {

  var SERVER = 'server',
      CLIENT = 'client',
      BOTH = [CLIENT, SERVER];

  api.versionsFrom('METEOR@1.0.3.2');

  api.use([
    'mongo@1.0.9',
    'coffeescript@1.0.4',
    'underscore',
    'velocity:core@0.4.5',
    'velocity:shim@0.1.0'
  ]);
  api.use('practicalmeteor:loglevel@1.1.0_2', 'server');
  api.use('sanjo:meteor-version@1.0.0', 'server')
  api.use('package-version-parser', 'server')

  api.addFiles(['lib/meteor/files.js', 'lib/LongRunningChildProcess.coffee'], SERVER);
  api.addFiles(['lib/spawnScript.js'], 'server', {isAsset: true});
  api.addFiles('mirrorClientUpdater.js', BOTH);
  api.addFiles('nodeMirrorServer.js', SERVER);

  api.addFiles('testProxyPackage/sync.js', SERVER);
  _initializeTestProxy();

});

function _initializeTestProxy () {

  if (!fs.existsSync(_getProxyPackagePath())) {
    return;
  }

  var currentPackageJS = fs.readFileSync(_getPackageJsFilePath()).toString();
  if (_allFilesPresent(currentPackageJS)) {
    return;
  }
  console.log('[proxy-package-sync-pre] Resetting test-proxy package.js as files have been removed from the tests directory.');
  fs.unlinkSync(_getPackageJsFilePath());
  fs.writeFileSync(_getPackageJsFilePath(), _getBlankPackageJsFile());
}

function _allFilesPresent (currentPackageJS) {
  var result = true;
  var files = _getFilesFromPackageJs(currentPackageJS);
  files.forEach(function (file) {
    if (!fs.existsSync(file)) {
      console.log('[proxy-package-sync-pre] Detected file removal', file);
      result = false;
    }
  });
  return result;
}

function _getFilesFromPackageJs (currentPackageJS) {
  var absolutePaths = [];
  currentPackageJS.split('\n').forEach(function (line) {
    if (line.indexOf('api.add_files') !== -1) {
      var relativePath = line.substring(line.indexOf('"') + 1, line.length);
      relativePath = relativePath.substring(0, relativePath.indexOf('"'));
      absolutePaths.push(path.join(process.env.PWD, relativePath));
    }
  });
  return absolutePaths;
}

function _getPackageJsFilePath () {
  return path.join(_getProxyPackagePath(), 'package.js');
}

function _getProxyPackagePath () {
  return path.join(_getPackagesPath(), 'tests-proxy');
}

function _getPackagesPath () {
  return path.join(process.env.PWD, 'packages');
}

function _getBlankPackageJsFile () {
  return 'Package.describe({ name: "velocity:test-proxy", version: "0.0.4", debugOnly: true });\n' +
    '\n' +
    'Package.on_use(function (api) {\n' +
    '});';
}
