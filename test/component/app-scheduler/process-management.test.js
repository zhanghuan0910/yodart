var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var mock = require('./mock')
var Scheduler = require(`${helper.paths.runtime}/lib/component/app-scheduler`)

require('@yoda/oh-my-little-pony')

test('shall create child process', t => {
  var target = path.join(helper.paths.fixture, 'noop-app')
  t.plan(5)
  var appId = '@test'
  var runtime = {
    appGC: function () {},
    component: {
      appLoader: mock.getLoader({
        '@test': {
          appHome: target
        }
      })
    }
  }
  var scheduler = new Scheduler(runtime)
  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  setTimeout(() => { /** FIXME: child_process.fork doesn't trigger next tick */ }, 1000)
  promise
    .then(app => {
      t.notLooseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'running')

      app.once('exit', () => {
        t.looseEqual(scheduler.appStatus[appId], 'exited')
      })
      scheduler.suspendApp(appId)
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('app exits on start up', t => {
  var target = path.join(helper.paths.fixture, 'crash-on-start-up-app')
  t.plan(5)
  var appId = '@test'
  var runtime = {
    appGC: function () {},
    component: {
      appLoader: mock.getLoader({
        '@test': {
          appHome: target
        }
      })
    }
  }
  var scheduler = new Scheduler(runtime)
  t.looseEqual(scheduler.appStatus[appId], null)
  var promise = scheduler.createApp(appId)
  t.strictEqual(scheduler.appStatus[appId], 'creating')

  setTimeout(() => { /** FIXME: child_process.fork doesn't trigger next tick */ }, 1000)
  promise
    .then(() => {
      t.fail('unreachable path')
      t.end()
    }, err => {
      t.throws(() => {
        throw err
      }, 'App exits on startup')

      t.looseEqual(scheduler.appMap[appId], null)
      t.strictEqual(scheduler.appStatus[appId], 'exited')

      t.end()
    })
})
