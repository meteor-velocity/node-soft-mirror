(function () {
  'use strict';

  Meteor.startup(function() {
    Meteor.call('velocity/mirrors/node-mirror/client-restarted');
  });

})();
