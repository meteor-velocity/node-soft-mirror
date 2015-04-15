Node Soft Mirror
================

__Deprecated__: This package should no longer be used. It was replaced by a more robust mirror mechanism in velocity:core 0.6.0. Upgrade to the latest versions of your testing framework and delete the `packages/tests-proxy` folder to get the benefit.

For use by Velocity framework authors. This package creates a mirror using a node form from within
the running meteor process and runs `.meteor/local/build/main.js`. This approach has an extremely
fast startup time.

The node process uses the same database as the parent meteor process but under a different
schema.

##Usage
Reference this package in your frameworks package.js and then use something like this on the server:

```javascript
 Meteor.call('velocity/mirrors/request', {
  framework: 'myFramework'
});

VelocityMirrors.find({framework: 'myFramework', state: 'ready'}).observe({
  added: watch,
  changed: watch
});

var watch = function (mirror) {
  VelocityTestFiles.find({targetFramework: 'myFramework'}).observe({
    added: _doSomething,
    removed: _doSomething,
    changed: _doSomething
  });
};
```

##Caveats
This mirror currently has no way of running files within the `/tests` directory.

Any frameworks that require test files to be run within the mirror, the current workaround is to
symlink the /tests directory to something like /testsTemp so that meteor will watch the files
under that directory.
