var test = require('tape')
var path = require('path')

var _ = require('@yoda/util')._
var helper = require('../../helper')
var AppLoader = require(`${helper.paths.runtime}/component/app-loader`)
var mock = require('./mock')

test('should load path', t => {
  var fakeRuntime = mock.mockRuntime()
  var loader = new AppLoader(fakeRuntime)

  loader.loadPath(helper.paths.fixture)
    .then(() => {
      t.assert(Object.keys(loader.appManifests).length > 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should skip path if not exist', t => {
  var fakeRuntime = mock.mockRuntime()
  var loader = new AppLoader(fakeRuntime)

  loader.loadPath(helper.paths.fixture + 'foobar')
    .then(() => {
      t.pass()
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should load paths', t => {
  var fakeRuntime = mock.mockRuntime()
  var loader = new AppLoader(fakeRuntime)

  loader.loadPaths([ helper.paths.fixture ])
    .then(() => {
      t.assert(Object.keys(loader.appManifests).length > 0)
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})

test('should load app', t => {
  var fakeRuntime = mock.mockRuntime()
  var loader = new AppLoader(fakeRuntime)

  var appPath = path.join(helper.paths.fixture, 'simple-app')
  loader.loadApp(appPath)
    .then(() => {
      var packagePath = path.join(appPath, 'package.json')
      var pkgInfo = require(packagePath)
      var appId = pkgInfo.name
      var permissions = _.get(pkgInfo, 'metadata.permission', [])
      var hosts = _.get(pkgInfo, 'metadata.hosts', [])

      hosts.forEach(it => {
        t.strictEqual(loader.hostAppIdMap[it.name], it.appId)
      })
      t.deepEqual(fakeRuntime.component.permission.map[appId], permissions)

      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
