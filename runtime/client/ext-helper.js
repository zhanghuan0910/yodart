'use strict'

var path = require('path')
var logger = require('logger')('ext-app-client')
var translator = require('./translator-ipc')
var flora = require('@yoda/flora')
var endoscope = require('@yoda/endoscope')
var FloraExporter = require('@yoda/endoscope/exporter/flora')
var pony = require('@yoda/oh-my-little-pony')
var mkdirpSync = require('@yoda/util/fs').mkdirpSync

var apiSymbol = Symbol.for('yoda#api')

module.exports = {
  main: main,
  launchApp: launchApp,
  keepAlive: keepAlive
}

function terminate () {
  /**
   * FIXME: https://github.com/yodaos-project/ShadowNode/issues/373
   * force process to exit without any proceeding.
   */
  process.kill(process.pid, 'SIGKILL')
}

process.once('disconnect', () => {
  logger.info('IPC disconnected, exiting self.')
  terminate()
})

function safeCall (agent, name, msg, target) {
  return agent.call(name, msg, target, 10 * 1000)
    .catch(err => logger.error(`unexpected error on invoking ${target}#${name}`, err.stack))
}

function main (target, descriptorPath, runner) {
  if (!target) {
    logger.error('Target is required.')
    terminate()
  }
  if (runner == null) {
    runner = noopRunner
  }
  process.title = `${process.argv[0]} yoda-app ${target}`
  var pkg = require(`${target}/package.json`)
  logger.log(`load target: ${target}/package.json`)
  var appId = pkg.name
  logger = require('logger')(`entry-${appId}`)
  endoscope.addExporter(new FloraExporter('yodaos.endoscope.export'))

  var main = `${target}/${pkg.main || 'app.js'}`

  var agent = new flora.Agent(`unix:/var/run/flora.sock#${appId}:${process.pid}`)
  agent.start()

  keepAlive(agent, appId)
  var descriptor = require(descriptorPath)

  // FIXME: unref should be enabled on https://github.com/yodaos-project/ShadowNode/issues/517 got fixed.
  // aliveInterval.unref()
  translator.setLogger(require('logger')(`@ipc-${process.pid}`))
  var api = translator.translate(descriptor, agent)
  api.appId = appId
  api.appHome = target
  api.appDataDir = path.join('/data/AppData', appId)
  api.agent = agent
  global[apiSymbol] = api

  mkdirpSync(api.appDataDir)
  pony.catchUncaughtError(path.join(api.appDataDir, 'exception.stack'), () => {
    process.exit(1)
  })

  try {
    /**
     * Executes app's main function
     */
    launchApp(main, api)
  } catch (error) {
    logger.error('fatal error:', error.stack)
    return safeCall(agent, 'yodaos.fauna.status-report', ['error', error.stack], 'runtime')
      .then(terminate)
  }

  agent.call('yodaos.fauna.status-report', ['ready'], 'runtime', 10 * 1000)

  /**
   * Force await on app initialization.
   */
  Promise.resolve()
    .then(() => onceAppCreated(api))
    .then(() => runner(appId, pkg))
    .catch(error => {
      logger.error('fatal error:', error.stack)
      return safeCall(agent, 'yodaos.fauna.status-report', ['error', error.stack], 'runtime')
        .then(terminate)
    })
}

function onceAppCreated (api) {
  return new Promise(resolve => {
    api.once('created', resolve)
  })
}

function launchApp (main, activity) {
  logger.log(`loading app: '${main}'`)
  var handle = require(main)
  /** start a new clean context */
  if (typeof handle === 'function') {
    handle(activity)
  }
}

var aliveInterval
function keepAlive (agent) {
  if (aliveInterval) {
    clearInterval(aliveInterval)
  }
  setAlive(agent)
  aliveInterval = setInterval(() => {
    setAlive(agent)
  }, 5 * 1000)
}

function setAlive (agent) {
  safeCall(agent, 'yodaos.fauna.status-report', ['alive'], 'runtime')
}

function noopRunner () {

}
