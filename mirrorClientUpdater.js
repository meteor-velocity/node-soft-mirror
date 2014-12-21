/*jshint -W030, -W117 */

NodeSoftMirrorVars = new Mongo.Collection('NodeSoftMirrorVars');

DEBUG = typeof process !== 'undefined' ? !!process.env.VELOCITY_DEBUG : false;

(function () {
  'use strict';


  Meteor.call('velocity/isMirror', function (err, isMirror) {

    if (isMirror) {

      if (Meteor.isServer) {

        Meteor.publish('NodeSoftMirrorVars', function () {
          return NodeSoftMirrorVars.find({});
        });

        NodeSoftMirrorVars.allow({
          remove: function() {
            return true;
          }
        });

        Meteor.methods({
          'velocity/mirrors/node-soft-mirror/reloadClient': function () {
            DEBUG && console.log('[node-soft-mirror] reload requested, sending command to clients');
            NodeSoftMirrorVars.upsert({command: 'reloadClient'}, {
              $set: {
                command: 'reloadClient',
                timestamp: new Date().getTime()
              }
            });
          }
        });
      }

      if (Meteor.isClient) {

        if (Meteor.isClient) {
          Meteor.subscribe('NodeSoftMirrorVars');
        }

        window.NodeSortMirrorVars = Package['velocity:node-soft-mirror'].NodeSoftMirrorVars;
        var reload = function () {
          var reloadClient = NodeSoftMirrorVars.findOne({command: 'reloadClient'});
          if (reloadClient) {
            // the remove is adequate for today as most frameworks only have one client connected,
            // but if multiple clients (different browsers maybe) are connected, the solution here
            // needs a bit of love
            NodeSoftMirrorVars.remove(reloadClient._id, function () {
              window.location.reload();
            });
          }
        };
        NodeSoftMirrorVars.find().observe({added: reload, changed: reload});
      }

    } else {

      if (Meteor.isServer) {
        // listen to client restarts on the main process and signal all mirrors to reload the client
        // using DDP
        process.on('SIGUSR2', Meteor.bindEnvironment(function () {
          DEBUG && console.log('[node-soft-mirror] Client restart detected');
          VelocityMirrors.find().forEach(function (mirror) {
            DEBUG && console.log('Signaling mirror to reload on:', mirror.host);
            var mirrorConnection = DDP.connect(mirror.host);
            mirrorConnection.call('velocity/mirrors/node-soft-mirror/reloadClient', function () {
              mirrorConnection.disconnect();
            });
          });
        }));
      }

    }
  });



})();