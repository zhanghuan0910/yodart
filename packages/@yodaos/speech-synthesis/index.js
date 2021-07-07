/**
 * @module @yodaos/speech-synthesis
 */

var EventEmitter = require('events')
var SpeechSynthesizer = require('./out/speech-synthesis.node').SpeechSynthesizer
var logger = require('logger')('speech-synthesis')

var symbol = require('./symbol')

var SpeechSynthesisEffectUri = 'system://setSpeaking.js'

var Status = {
  none: 0,
  pending: 0b001,
  paused: 0b010,
  speaking: 0b100
}

var Events = ['start', 'end', 'cancel']

var endoscope = require('@yoda/endoscope')
var synthesizerEventMetric = new endoscope.Enum(
  'yodaos:speech-synthesis:event',
  { labels: [ 'id', 'text' ], states: Events.concat('error') }
)

/**
 * @hideconstructor
 * @example
 * var speechSynthesis = require('@yodaos/speech-synthesis').speechSynthesis
 * speechSynthesis.speak('foo')
 *   .on('end', () => {
 *     console.log('speech ended')
 *   })
 */
class SpeechSynthesis {
  constructor (api) {
    api = api || global[Symbol.for('yoda#api')]
    this[symbol.label] = api.appId
    this[symbol.effect] = api.effect
    this[symbol.queue] = []
    this[symbol.native] = new SpeechSynthesizer()
    this[symbol.native].setup(this.onevent.bind(this))

    this[symbol.utter] = null
    this[symbol.status] = Status.none
  }

  get paused () {
    return (this[symbol.status] & Status.paused) > 0
  }

  get pending () {
    return (this[symbol.status] & Status.pending) > 0
  }

  get speaking () {
    return (this[symbol.status] & Status.speaking) > 0
  }

  /**
   * The `speak()` method of the `SpeechSynthesis` interface adds an utterance
   * to the utterance queue; it will be spoken when any other utterances queued
   * before it have been spoken.
   *
   * @param {string|SpeechSynthesisUtterance} utterance
   * @returns {SpeechSynthesisUtterance} the utterance
   */
  speak (utterance) {
    if (typeof utterance === 'string') {
      utterance = new SpeechSynthesisUtterance(utterance)
    }
    logger.verbose(`request speaking utterance(${utterance.text})`)
    if (!(utterance instanceof SpeechSynthesisUtterance)) {
      throw TypeError('Expect a string or SpeechSynthesisUtterance on SpeechSynthesis.speak')
    }
    var idx = this[symbol.queue].indexOf(utterance)
    if (idx < 0) {
      utterance.setId(this[symbol.label])
      this[symbol.queue].push(utterance)
    }
    if (this[symbol.status] === Status.none) {
      this[symbol.status] = Status.pending
    }
    this.go()
    return utterance
  }

  /**
   * The `cancel()` method of the `SpeechSynthesis` interface removes all
   * utterances from the utterance queue.
   *
   * If an utterance is currently being spoken, speaking will stop immediately.
   */
  cancel () {
    this[symbol.native].cancel()
    var queue = this[symbol.queue]
    this[symbol.queue] = []
    queue.forEach(it => {
      it.emit('cancel')
    })
  }

  /**
   * @private
   * @param {string} [hint]
   */
  playStream (hint) {
    logger.verbose(`request playing stream`)
    var utterance = new SpeechSynthesisUtterance()
    utterance.setId(this[symbol.label])
    utterance[symbol.hint] = hint
    this[symbol.queue].push(utterance)
    if (this[symbol.status] === Status.none) {
      this[symbol.status] = Status.pending
    }
    this.go()
    return utterance
  }

  onevent (eve, errCode) {
    var utter = this[symbol.utter]
    if (eve === 0) {
      this[symbol.status] = Status.speaking
      this[symbol.effect].play(SpeechSynthesisEffectUri, undefined, { shouldResume: true })
    } else if (eve > 0) {
      this[symbol.status] = Status.none
      this[symbol.utter] = null
      this[symbol.effect].stop(SpeechSynthesisEffectUri)
    }
    if (utter == null) {
      logger.verbose(`no active utterance, ignoring synthesis event.`)
      return
    }
    var name = Events[eve]
    if (this[symbol.hook]) {
      this[symbol.hook](name, utter)
    }
    if (name === 'cancel' && errCode !== 0) {
      var err = new Error(`SpeechSynthesisError: code(${errCode})`)
      err.code = errCode
      synthesizerEventMetric.state(utter, 'error')
      utter.emit('error', err)
    } else {
      synthesizerEventMetric.state(utter, name)
      utter.emit(name)
    }
    this.go()
  }

  go () {
    if (this[symbol.utter]) {
      logger.verbose(`active utterance synthesizing, skip activating queue.`)
      return
    }
    if (this[symbol.queue].length <= 0) {
      logger.verbose(`no more queued utterance to be synthesized.`)
      return
    }
    var utter = this[symbol.queue].shift()
    this[symbol.utter] = utter
    if (utter[symbol.text]) {
      if (this[symbol.hook]) {
        this[symbol.hook]('speak', utter)
      }
      this[symbol.native].speak(utter)
    } else {
      if (this[symbol.hook]) {
        this[symbol.hook]('playStream', utter)
      }
      this[symbol.native].playStream(utter)
    }
  }
}

/**
 * The `SpeechSynthesisUtterance` interface of the Speech API represents a speech
 * request. It contains the content the speech service should read and information
 * about how to read it (e.g. language, pitch and volume.)
 *
 * @param {string} text
 */
class SpeechSynthesisUtterance extends EventEmitter {
  constructor (text) {
    super()
    this[symbol.text] = text
  }

  get text () {
    if (this[symbol.text]) {
      return this[symbol.text]
    }
    if (this[symbol.hint]) {
      return this[symbol.hint]
    }
  }

  setId (label) {
    Object.defineProperty(this, 'id', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: `yodaos.speech-synthesis.${label}.${Date.now()}`
    })
  }
}

module.exports.SpeechSynthesis = SpeechSynthesis
module.exports.SpeechSynthesisUtterance = SpeechSynthesisUtterance

var defaultInstance = null
Object.defineProperty(module.exports, 'speechSynthesis', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (defaultInstance == null) {
      defaultInstance = new SpeechSynthesis(global[Symbol.for('yoda#api')])
    }
    return defaultInstance
  }
})
