(function () {
  'use strict';

  Meteor.startup(function () {
    Meteor.call('velocity/isMirror', function (err, isMirror) {
      console.log('velocity/isMirror', isMirror);
      if (!isMirror) {
        console.log('calling velocity/mirrors/node-mirror/restart-mirror-clients');
        Meteor.call('velocity/mirrors/node-mirror/restart-mirror-clients');
      }
    });
  });

})();
