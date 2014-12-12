/*jshint -W030, -W117 */
/* global
 */

NodeSoftMirrorVars = new Meteor.Collection('nodeSoftMirrorVars');

(function () {
  'use strict';


  Meteor.call('velocity/isMirror', function (err, isMirror) {

    console.log(err, isMirror);

    if (isMirror) {

      if (Meteor.isServer) {
        Meteor.methods({
          'velocity/mirrors/node-soft-mirror/reloadClient': function () {
            console.log('[mirror] reloadClient');
            NodeSoftMirrorVars.upsert({command: 'reloadClient'}, {$set: {command: 'reloadClient'}});
            console.log(NodeSoftMirrorVars.find().fetch());
          }
        });
      }

      if (Meteor.isClient) {
        var reload = function () {
          console.log(NodeSoftMirrorVars.find().fetch());
          var reloadCommand = NodeSoftMirrorVars.findOne({command: 'reloadClient'});
          if (reloadCommand) {
            NodeSoftMirrorVars.remove(reloadCommand._id, function () {
              console.log('refreshing client');
              document.location.href = document.location.href;
            });
          }
        };
        NodeSoftMirrorVars.find().observe({
          added: reload,
          changed: reload
        });
      }

    } else {

      if (Meteor.isServer) {
        // listen to client restarts on the main process and signal all mirrors to reload the client
        // using DDP
        process.on('SIGUSR2', Meteor.bindEnvironment(function () {
          VelocityMirrors.find().forEach(function (mirror) {
            var mirrorConnection = DDP.connect(mirror.host);
            mirrorConnection.call('velocity/mirrors/node-soft-mirror/reloadClient');
            mirrorConnection.disconnect();
          });
        }));
      }

    }
  });



})();