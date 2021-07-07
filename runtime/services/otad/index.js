'use strict'

var ota = require('@yoda/ota')
var Delegation = require('./delegation')
var step = require('./step')
var system = require('@yoda/system')
var logger = require('logger')('otad/index')
var flora = require('@yoda/flora')

require('@yoda/oh-my-little-pony').catchUncaughtError(() => {
  logger.error('terminating ota for unexpected error')
  process.exit(1)
})
main(function onDone (err) {
  if (err) {
    logger.error('unexpected error', err.stack)
    return process.exit(1)
  }
  process.exit()
})

function main (done) {
  // clean the recovery state if it is ok or error.
  var recoveryState = system.getRecoveryState().recovery_state
  if (recoveryState === 'recovery_ok' ||
    recoveryState === 'recovery_error') {
    system.onRecoveryComplete()
  }
  var delegate = new Delegation(process.argv.slice(2))
  step.runInCurrentContext(delegate, onOTA)

  function onOTA (err, info) {
    logger.info('ota ran')
    /**
     * prevent interruption during finalization.
     */
    disableSigInt()
    if (err) {
      logger.error(err.message, err.stack)
      if (err.code === 'EEXIST') {
        return done()
      }
      /** not errored for locking, shall retry in a short sleep */
      return ota.resetOta(() => delegate.notify(null, null, () => done(err)))
    }
    var imagePath = info && info.imagePath
    if (typeof imagePath !== 'string') {
      logger.info('No updates found, exiting.')
      return ota.resetOta(done)
    }

    var agent = new flora.Agent('unix:/var/run/flora.sock')
    agent.start()
    agent.post('yodaos.otad.event', [ 'prepared', JSON.stringify(info) ])
    agent.close()
    delegate.notify(info.version, info.imagePath, done)
  }
}

function disableSigInt () {
  process.on('SIGINT', () => {})
}
