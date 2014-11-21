(function () {
  'use strict';

  Meteor.startup(function() {
    Meteor.call('velocity/isMirror', function() {
      Meteor.call('velocity/mirrors/node-mirror/mirror-client-restarted');
    })
  });

})();
