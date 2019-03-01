'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = TurenDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class TurenClient
 * @hideconstructor
 * @extends EventEmitter
 */
function TurenDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
  this._shouldRecoverTuren = false

  this._activityDescriptor.on('destruct', () => {
    if (this._shouldRecoverTuren) {
      this._runtime.component.turen.toggleWakeUpEngine(true)
    }
  })
}
inherits(TurenDescriptor, EventEmitter)
TurenDescriptor.prototype.toJSON = function toJSON () {
  return TurenDescriptor.prototype
}

Object.assign(TurenDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * add an activation word.
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function addVtWord
     * @param {string} activationTxt -
     * @param {string} activationPy -
     * @returns {Promise<void>}
     */
    addVtWord: {
      type: 'method',
      returns: 'promise',
      fn: function addVtWord (activationTxt, activationPy) {
        return this._runtime.component.turen.addVtWord(activationTxt, activationPy)
      }
    },

    /**
     * delete an activation word.
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function deleteVtWord
     * @param {string} activationTxt -
     * @returns {Promise<void>}
     */
    deleteVtWord: {
      type: 'method',
      returns: 'promise',
      fn: function deleteVtWord (activationTxt) {
        return this._runtime.component.turen.deleteVtWord(activationTxt)
      }
    },
    /**
     * Disable wake up processing engine if `enabled` is false, or enable the process if `enabled` is true.
     * Switch enabled state if `enabled` is not set.
     *
     * Turen would be re-enabled on app exits if app did not recover the states.
     *
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function setEnabled
     * @param {boolean} [enabled] - set turen wake up engine as disabled, switch if not given.
     * @returns {Promise<boolean>}
     */
    setEnabled: {
      type: 'method',
      returns: 'promise',
      fn: function setEnabled (enabled) {
        var ret = this._runtime.component.turen.toggleWakeUpEngine(enabled)
        this._shouldRecoverTuren = !ret
        return ret
      }
    },
    /**
     * Get if turen wake up engine is disabled.
     *
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function getEnabled
     * @returns {Promise<boolean>}
     */
    getEnabled: {
      type: 'method',
      returns: 'promise',
      fn: function getEnabled () {
        return Promise.resolve(this._runtime.component.turen.enabled)
      }
    }
  }
)
