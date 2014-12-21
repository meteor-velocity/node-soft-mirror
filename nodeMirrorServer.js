/*jshint -W030 */
/* global
 Velocity:true,
 DEBUG:true,
 log: true,
 sanjo:true
 */

DEBUG = !!process.env.VELOCITY_DEBUG;
log = loglevel.createPackageLogger('[node-soft-mirror]', process.env.VELOCITY_DEBUG ? 'DEBUG' : 'info');

(function () {
  'use strict';

  if (process.env.NODE_ENV !== 'development' ||
    process.env.IS_MIRROR) {
    return;
  }

  DEBUG && console.log('[node-soft-mirror] adding server code');

  var path = Npm.require('path'),
      MIRROR_TYPE = 'node-soft-mirror',
      nodeMirrorsCursor = VelocityMirrors.find({type: MIRROR_TYPE}),
      _mirrorChildProcesses = {};

  // init
  Meteor.startup(function initializeVelocity () {
    DEBUG && console.log('[velocity-node-mirror] Server restarted.');

    _restartMirrors();

    if (Package.autoupdate) {
      DEBUG && console.log('[node-soft-mirror] Aggressively reload client');
      Package.autoupdate.Autoupdate.autoupdateVersion = Random.id();
    }
  });

  _.extend(Velocity.Mirror, {
    /**
     * Starts a mirror and copies any specified fixture files into the mirror.
     *
     * @method start
     * @param {Object} options not used in this mirror
     * @param {Object} environment Required fields:
     *                   ROOT_URL
     *                   PORT
     *                   MONGO_URL
     *
     * @private
     */
    start: function (options, environment) {

      var mainJs = path.join(process.env.PWD, '.meteor', 'local', 'build', 'main.js');

      var mirrorChild = _getMirrorChild(environment.FRAMEWORK);
      if (mirrorChild.isRunning()) {
        return;
      }

      mirrorChild.spawn({
        command: 'node',
        args: [mainJs],
        options: {
          silent: true,
          detached: true,
          cwd: process.env.PWD,
          env: _.defaults(environment, process.env)
        }
      });

      DEBUG && console.log('[velocity-node-mirror] Mirror process forked with pid', mirrorChild.getChild().pid);

      Meteor.call('velocity/mirrors/init', {
        framework: environment.FRAMEWORK,
        port: environment.PORT,
        mongoUrl: environment.MONGO_URL,
        host: environment.HOST,
        rootUrl: environment.ROOT_URL,
        rootUrlPath: environment.ROOT_URL_PATH,
        type: MIRROR_TYPE
      }, {
        pid: mirrorChild.pid
      });

      mirrorChild.getChild().stdout.on('data', function (data) {
        console.log('[velocity-mirror]', data.toString());
      });
      mirrorChild.getChild().stderr.on('data', function (data) {
        console.error('[velocity-mirror]', data.toString());
      });

    } // end velocityStartMirror
  });

  /**
   * Iterates through the mirrors collection and kills all processes if they are running
   * @private
   */

  function _restartMirrors () {
    DEBUG && console.log('[velocity-node-mirror] Aggressively restarting all mirrors');
    nodeMirrorsCursor.forEach(function (mirror) {

      var mirrorChild = _getMirrorChild(mirror.framework);

      if (mirrorChild.isRunning()) {
        DEBUG && console.log('[node-soft-mirror] Restarting Mirror for framework ' + mirror.framework);
        mirrorChild.kill();

        Meteor.call('velocity/mirrors/request', {
          framework: mirror.framework,
          port: mirror.port,
          rootUrlPath: mirror.rootUrlPath
        });

      } else {
        DEBUG && console.log('[node-soft-mirror] Mirror for framework ' + mirror.framework + ' is not running');
      }
    });
  }

  function _getMirrorChild (framework) {
    var mirrorChild = _mirrorChildProcesses[framework];
    if (!mirrorChild) {
      mirrorChild = new sanjo.LongRunningChildProcess(framework);
      _mirrorChildProcesses[framework] = mirrorChild;
    }
    return mirrorChild;
  }

})();
