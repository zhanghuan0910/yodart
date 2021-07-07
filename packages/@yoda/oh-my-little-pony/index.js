var fs = require('fs')
var path = require('path')
var logger = require('logger')('pony')
var yodaUtil = require('@yoda/util')

var HealthReporter = require('./health-reporter')

module.exports.catchUncaughtError = catchUncaughtError
module.exports.HealthReporter = HealthReporter
module.exports.healthReport = healthReport

var profiling = false
process.on('SIGUSR1', function () {
  var profiler = require('profiler')
  if (profiling) {
    logger.debug('stop profiling')
    profiler.stopProfiling()
    return
  }
  var timestamp = Math.floor(Date.now())
  var filename = `/data/cpu-profile-${process.pid}-${timestamp}.txt`
  profiler.startProfiling(filename)
  logger.debug(`start profiling, target ${filename}`)
  profiling = true
})
process.on('SIGUSR2', function () {
  var profiler = require('profiler')
  var timestamp = Math.floor(Date.now())
  var filename = `/data/heapdump-${process.pid}-${timestamp}.json`
  profiler.takeSnapshot(filename)
  logger.debug(`dump the heap profile at ${filename}`)
  logger.debug('memory usage is at', process.memoryUsage())
})

function catchUncaughtError (logfile, callback) {
  if (typeof logfile === 'function') {
    callback = logfile
    logfile = undefined
  }
  if (logfile) {
    yodaUtil.fs.mkdirpSync(path.dirname(logfile))
  }

  process.on('uncaughtException', err => {
    logger.error('Uncaught Exception', err)
    if (logfile) {
      fs.writeFileSync(logfile, `[${new Date().toISOString()}] <${process.title}> Uncaught Exception: ${err.stack}\n`)
    }
    callback && callback(err)
  })

  process.on('unhandledRejection', err => {
    logger.error('Unhandled Rejection', err)
    if (logfile) {
      fs.writeFileSync(logfile, `[${new Date().toISOString()}] <${process.title}> Unhandled Rejection: ${err.stack}\n`)
    }
    callback && callback(err)
  })

  return module.exports
}

function healthReport (name) {
  var reporter = new HealthReporter(name)
  reporter.start()

  return module.exports
}
