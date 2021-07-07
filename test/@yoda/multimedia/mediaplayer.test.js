'use strict'

var test = require('tape')
var path = require('path')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var helper = require('../../helper')

var events = [
  'prepared',
  'playbackcomplete',
  'bufferingupdate',
  'seekcomplete',
  'position',
  'pause',
  'playing',
  'blockpausemode',
  'playingstatus',
  'error'
]

var dataSource = path.join(helper.paths.fixture, 'audio', 'hibernate.wav')

test('should play media', (t) => {
  t.plan(4)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  player.on('prepared', () => {
    t.strictEqual(player.playing, false)
  })
  player.on('playing', () => {
    t.strictEqual(player.playing, true)
  })
  player.on('playbackcomplete', () => {
    t.skip(player.playing, true/** FIXME: should player be not playing on playbackcomplete? */)
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.setDataSource(dataSource)
  player.prepare()
  player.start()
})

test('delayed start should be suppressed on stop', (t) => {
  t.plan(2)
  var player = new MediaPlayer()
  player.setDataSource(dataSource)
  player.prepare()
  player.on('prepared', () => {
    t.strictEqual(player.playing, false)
    player.stop()
  })
  player.start()
  player.on('prepared', () => {
    t.throws(() => player.start(), /MediaPlayerWrap has not been set up/)
    t.end()
  })
})

test('pause and resume player', t => {
  t.plan(5)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  player.on('playing', () => {
    t.strictEqual(player.playing, true)
    player.pause()
    t.strictEqual(player.playing, false)
    player.start()
    t.strictEqual(player.playing, true)
  })
  player.on('playbackcomplete', () => {
    t.skip(player.playing, true/** FIXME: should player be not playing on playbackcomplete? */)
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.setDataSource(dataSource)
  player.prepare()
  player.start()
})

test('reset player', t => {
  t.plan(1)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  player.on('playing', () => {
    player.reset()
    player.start()
  })
  player.on('playbackcomplete', () => {
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.setDataSource(dataSource)
  player.prepare()
  player.start()
})

test('seek player', t => {
  t.plan(1)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'playbackcomplete', 'seekcomplete', 'playbackcomplete', 'seekcomplete', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  var times = 2
  player.on('playbackcomplete', () => {
    if (times !== 0) {
      --times
      player.seekTo(0)
      return
    }
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.setDataSource(dataSource)
  player.prepare()
  player.start()
})

test('looping player', t => {
  t.plan(1)
  var player = new MediaPlayer()
  var actual = []
  var expected = ['prepared', 'playing', 'seekcomplete', 'seekcomplete', 'seekcomplete', 'playbackcomplete']
  events.forEach(it => player.on(it, () => actual.push(it)))
  var times = 2
  player.on('seekcomplete', () => {
    if (times !== 0) {
      --times
      return
    }
    player.setLooping(false)
  })
  player.on('playbackcomplete', () => {
    t.deepEqual(actual, expected)
    player.stop()
  })
  player.setDataSource(dataSource)
  player.prepare()
  player.setLooping(true)
  player.start()
})

test('set/get player volume', (t) => {
  t.plan(3)
  var player = new MediaPlayer()
  player.setDataSource(dataSource)
  player.setVolume(50)
  t.strictEqual(player.getVolume(), 50)
  player.setVolume(-1)
  t.strictEqual(player.getVolume(), 50)
  player.setVolume(101)
  t.strictEqual(player.getVolume(), 100)
})

test('should emit error', (t) => {
  t.plan(1)
  var player = new MediaPlayer()
  player.on('prepared', () => {
    t.fail('unreachable prepared')
  })
  player.on('playing', () => {
    t.fail('unreachable playing')
  })
  player.on('playbackcomplete', () => {
    t.fail('unreachable unreachable')
  })
  player.on('error', err => {
    t.throws(() => {
      throw err
    }, 'player error')
    t.end()
  })
  player.setDataSource('/opt/definitely-unreachable.media')
  player.prepare()
})

test('should emit uncaught exception', (t) => {
  t.plan(1)
  var player = new MediaPlayer()
  function uncaughtException (err) {
    t.throws(() => {
      throw err
    }, 'player error')
    t.end()
    process.removeListener('uncaughtException', uncaughtException)
  }
  process.on('uncaughtException', uncaughtException)
  player.setDataSource('/opt/definitely-unreachable.media')
  player.prepare()
})
