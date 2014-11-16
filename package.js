/*jshint -W117, -W097 */
'use strict';

Package.describe({
  name: 'velocity:node-soft-mirror',
  summary: 'A Node based soft-mirror for use by Velocity compatible test frameworks',
  version: '0.0.1',
  git: 'https://github.com/meteor-velocity/node-soft-mirror.git',
  debugOnly: true
});

Npm.depends({
  'lodash': '2.4.1'
});

Package.on_use(function (api) {

  var SERVER = 'server',
      CLIENT = 'client';
    //  BOTH = [CLIENT, SERVER];

  api.versionsFrom('METEOR@1.0');

  api.use([
    'velocity:core@1.0.0-rc.4',
    'velocity:shim@0.0.3'
  ]);

  api.add_files('nodeMirror.js', SERVER);
  api.add_files('mirrorClientCode.js', CLIENT);

});
