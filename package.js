/*jshint -W117, -W097 */
'use strict';

Package.describe({
  name: 'velocity:node-soft-mirror',
  summary: 'A Node based soft-mirror for use by Velocity compatible test frameworks',
  version: '0.0.2',
  git: 'https://github.com/meteor-velocity/node-soft-mirror.git',
  debugOnly: true
});

Npm.depends({
  'lodash': '2.4.1',
  'mkdirp': '0.5.0'
});

var fs   = Npm.require('fs'),
    path = Npm.require('path'),
    _    = Npm.require('lodash');

Package.on_use(function (api) {

  var SERVER = 'server',
      CLIENT = 'client';
  //  BOTH = [CLIENT, SERVER];

  api.versionsFrom('METEOR@1.0');

  api.use([
    'velocity:core@1.0.0-rc.4',
    'velocity:shim@0.0.3',
    'velocity:test-proxy@0.0.1'
  ]);

  api.addFiles('nodeMirror.js', SERVER);
  api.addFiles('mirrorClientCode.js', CLIENT);

  _initializeTestProxy(api);

});

function _initializeTestProxy (api) {

  api.addFiles('proxyPackage/sync.js', 'server');

  if (!fs.existsSync(_getProxyPackage())) {
    return;
  }

  var currentPackageJS = fs.readFileSync(_getPackageJsFilePath()).toString();
  if (_allFilesPresent(currentPackageJS)) {
    return;
  }
  console.log('clearing test-proxy package.js');
  fs.unlinkSync(_getPackageJsFilePath());
  fs.createReadStream(_getBlankPackageJsFilePath()).pipe(fs.createWriteStream(_getPackageJsFilePath()));

}

function _allFilesPresent (currentPackageJS) {
  var result = true;
  var files = _getFilesFromPackageJs(currentPackageJS);
  _.each(files, function (file) {
    if (!fs.existsSync(file)) {
      result = false;
    }
  });
  return result;
}

function _getFilesFromPackageJs (currentPackageJS) {
  var absolutePaths = [];
  _.each(currentPackageJS.split('\n'), function (line) {
    if (line.indexOf('api.add_files') !== -1) {
      var relativePath = line.substring(line.indexOf('"') + 1, line.length);
      relativePath = relativePath.substring(0, relativePath.indexOf('"'));
      absolutePaths.push(path.join(process.env.PWD, relativePath));
    }
  });
  return absolutePaths;
}

function _getPackageJsFilePath () {
  return path.join(_getProxyPackage(), 'package.js');
}

function _getBlankPackageJsFilePath () {
  return path.join(_getProxyPackage(), 'blankPackage.js');
}

function _getProxyPackage () {
  return path.join(_getPackagesPath(), 'tests-proxy');
}

function _getPackagesPath () {
  return path.join(process.env.PWD, 'packages');
}