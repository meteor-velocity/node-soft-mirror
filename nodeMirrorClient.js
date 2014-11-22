(function () {
  'use strict';

  Meteor.startup(function () {
    Meteor.call('velocity/isMirror', function (err, isMirror) {
      if (!isMirror) {
        Meteor.call('velocity/mirrors/node-mirror/restart-mirror-clients');
      }
    });
  });

})();
