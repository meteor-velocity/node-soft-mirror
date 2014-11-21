/*jshint -W030 */
/* global
 Velocity:true,
 DEBUG:true
 */

DEBUG = !!process.env.VELOCITY_DEBUG;

(function () {
  'use strict';

  if (process.env.NODE_ENV !== 'development' ||
    process.env.IS_MIRROR) {
    return;
  }

  var _ = Npm.require('lodash'),
      child_process = Npm.require('child_process'),
      path = Npm.require('path'),
      MIRROR_TYPE = 'node-soft-mirror';

  // init
  Meteor.startup(function initializeVelocity () {
    _killKnownMirrors();
  });

  _.extend(Velocity.Mirror, {
    /**
     * Starts a mirror and copies any specified fixture files into the mirror.
     *
     * @method start
     * @param {Object} options not used in this mirror
     * @param {Object} environment Required fields:
     *                   ROOT_URL
     *                   NODE_ENV
     *                   MIRROR_ID
     *                   PORT
     *                   MONGO_URL
     *                   ROOT_URL
     *
     * @private
     */
    start: function (options, environment) {

      environment.PWD = process.env.PWD;
      var opts = {
        silent: true,
        cwd: process.env.PWD,
        env: environment
      };

      var mainJs = path.join(process.env.PWD, '.meteor', 'local', 'build', 'main.js');
      DEBUG && console.log('[velocity-node-mirror] Forking mirror at', opts.env.ROOT_URL);
      var meteorProcess = child_process.fork(mainJs, opts);
      DEBUG && console.log('[velocity-node-mirror] Mirror process forked with pid', meteorProcess.pid);

      meteorProcess.stdout.on('data', function (data) {
        console.log('[velocity-node-mirror]', data.toString());
      });
      meteorProcess.stderr.on('data', function (data) {
        console.error('[velocity-node-mirror]', data.toString());
      });

      Meteor.call('velocity/mirrors/init', {
        mirrorId: opts.env.MIRROR_ID,
        port: opts.env.PORT,
        mongoUrl: opts.env.MONGO_URL,
        rootUrl: opts.env.ROOT_URL,
        type: MIRROR_TYPE
      }, {
        pid: meteorProcess.pid
      });


    } // end velocityStartMirror
  });

  Meteor.methods({
    'velocity/mirrors/node-mirror/mirror-client-restarted': function() {
      DEBUG && console.log('[node-mirror] Mirror client restarted.');
      // perhaps here we should let client based frameworks to re-run?
    }
  });



  /**
   * Iterates through the mirrors collection and kills all processes if they are running
   * @private
   */
  function _killKnownMirrors () {
    DEBUG && console.log('[velocity-node-mirror] Killing all mirrors');
    VelocityMirrors.find({type: MIRROR_TYPE}).forEach(function (mirror) {
      // if for whatever reason PID is undefined, this kills the main meteor app
      if (mirror.pid) {
        try {
          DEBUG && console.log('[velocity-node-mirror] Checking if mirror with pid', mirror.pid, 'is running');
          process.kill(mirror.pid, 0);
          DEBUG && console.log('[velocity-node-mirror] Mirror with pid', mirror.pid, 'is running. Killing...');
          process.kill(mirror.pid, 'SIGTERM');
        } catch (e) {
          DEBUG && console.log('[velocity-node-mirror] Mirror with pid', mirror.pid, 'is not running. Ignoring', e.message);
        }
      }
    });
    VelocityMirrors.remove({});
  }


})();
