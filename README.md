Node Soft Mirror
================

For use by Velocity framework authors. This package creates a mirror using a node form from within
the running meteor process and runs `.meteor/local/build/main.js`. This approach has an extremely
fast startup time, but it currently has no way of running files within the `/tests` directory.

Any frameworks that require test files to be run within the mirror, the current workaround is to
symlink the /tests directory to something like /testsTemp so that meteor will watch the files
under that directory.

To use this mirror in your framework, just reference it in the packages directory and then use
something like this:

```javascript
var mirrorId = Meteor.call('velocity/mirrors/request', {
  framework: 'myFramework'
});

VelocityMirrors.find({_id: mirrorId, state: 'ready'}).observe({
  added: watch,
  changed: watch
});

var watch = function (mirror) {
  VelocityTestFiles.find({targetFramework: FRAMEWORK_NAME}).observe({
    added: _doSomething,
    removed: _doSomething,
    changed: _doSomething
  });
};
```