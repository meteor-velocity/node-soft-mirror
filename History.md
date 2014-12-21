## v0.2.2

* Fixed infinite reload loop: https://github.com/mad-eye/meteor-mocha-web/issues/114

## v0.2.0

* Shiny new mirror updater

## v0.1.0

* CoffeeScript support
* Fixtures are loaded before tests. Both are sorted ascending by path. (#7)
* Symlink to tests folder is now relative (#5)

## v0.0.9

* Removed pacakge.js regeneration on testfile/fixture removal
* Added lots of debug logging
* Using Velocity.startup instead of Meteor.startup

## v0.0.4 - v0.0.8

Lots of release attempts trying to figure out issue with meteor packages and semvars. See:
https://github.com/meteor/meteor/issues/3147

## v0.0.3

* Improved test-proxy stability
* Client-restart detection no longer restarts tests and leaves this to frameworks
* Improved logging

## v0.0.2

Added the test proxy package into the mix. Tests are no longer copied into the mirror, they are
symlinked from within a package

## v0.0.1

Initial commit.
