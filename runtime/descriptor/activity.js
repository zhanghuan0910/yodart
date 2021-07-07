'use strict'

/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')

/**
 * @memberof yodaRT.activity
 * @classdesc The `Activity` is the APIs for apps developer.
 * ```js
 * module.exports = activity => {
 *   activity.on('create', () => {
 *     console.log('app is created')
 *   })
 *   activity.on('destroy', () => {
 *     console.log('app is destroyed')
 *   })
 * }
 * ```
 * @class Activity
 * @hideconstructor
 */
class ActivityDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'activity')
  }

  exit (ctx) {
    var appId = ctx.appId
    var options = ctx.args[0]
    return this.runtime.exitAppById(appId, Object.assign({}, options, { ignoreKeptAlive: true }))
  }

  openUrl (ctx) {
    var url = ctx.args[0]
    var options = ctx.args[1]
    if (typeof options === 'string') {
      options = { form: options }
    }
    return this.runtime.openUrl(url, options)
  }

  startMonologue (ctx) {
    return this.runtime.startMonologue(ctx.appId)
  }

  stopMonologue (ctx) {
    return this.runtime.stopMonologue(ctx.appId)
  }
}

ActivityDescriptor.values = {
  /**
   * Get current `appId`.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {string} appId - appId of current app.
   */
  appId: {},
  /**
   * Get home directory of current app.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @member {string} appHome - home directory of current app.
   */
  appHome: {}
}

ActivityDescriptor.events = {
  /**
   * When an activity is created.
   * @event yodaRT.activity.Activity#created
   */
  created: {},
  /**
   * When an activity is about been paused.
   * @event yodaRT.activity.Activity#paused
   */
  paused: {},
  /**
   * When an activity is resumed.
   * @event yodaRT.activity.Activity#resumed
   */
  resumed: {},
  /**
   * When an activity is about been destroyed.
   * @event yodaRT.activity.Activity#destroyed
   */
  destroyed: {},
  /**
   * Fires on url requests.
   *
   * > URL offer a potential attack vector into your app, so make
   * > sure to validate all URL parameters and discard any malformed
   * > URLs. In addition, limit the available actions to those that
   * > do not risk the user’s data. For example, do not allow other
   * > apps to directly delete content or access sensitive information
   * > about the user. When testing your URL-handling code, make sure
   * > your test cases include improperly formatted URLs.
   *
   * @event yodaRT.activity.Activity#url
   * @param {module:url~UrlWithParsedQuery} url
   */
  url: {},
  /**
   * Fires on oppressing of other apps in monologue mode.
   *
   * > Only fires to apps in monologue mode.
   *
   * @event yodaRT.activity.Activity#oppressing
   * @param {string} event - the event of oppressed app which would had
   * activated the app if not in monologue mode.
   */
  oppressing: {}
}
ActivityDescriptor.methods = {
  /**
   * Exits the current application.
   * @memberof yodaRT.activity.Activity
   * @instance
   * @function exit
   * @param {object} [options] -
   * @param {boolean} [options.clearContext] - also clears contexts
   * @returns {Promise<void>}
   */
  exit: {
    returns: 'promise'
  },
  /**
   * Use this method to open the specified resource. If the specified URL could
   * be handled by another app, YodaOS launches that app and passes the URL to it.
   * (Launching the app brings the other app to the foreground.) If no app is
   * capable of handling the specified scheme, the returning promise is resolved
   * with false.
   *
   * @memberof yodaRT.activity.Activity
   * @instance
   * @function openUrl
   * @param {string} url - the YodaOS url to open.
   * @returns {Promise<boolean>}
   */
  openUrl: {
    returns: 'promise'
  },
  /**
   * Set context options to current context.
   *
   * Options would be merged to current options so that it's not required
   *  to provide a full set of options each time.
   *
   * @memberof yodaRT.activity.Activity
   * @instance
   * @function setContextOptions
   * @param {object} options - context options to be set.
   * @returns {Promise<object>}
   */
  setContextOptions: {
    returns: 'promise'
  },
  /**
   * Get current context options previously set.
   *
   * @memberof yodaRT.activity.Activity
   * @instance
   * @function getContextOptions
   * @returns {Promise<object>}
   */
  getContextOptions: {
    returns: 'promise'
  },
  /**
   * Start a session of monologue. In session of monologue, no other apps could preempt top of stack.
   *
   * It requires the permission `ACCESS_MONOPOLIZATION`.
   *
   * @memberof yodaRT.activity.Activity
   * @instance
   * @function startMonologue
   * @returns {Promise<void>}
   */
  startMonologue: {
    returns: 'promise',
    permissions: ['ACCESS_MONOPOLIZATION']
  },
  /**
   * Stop a session of monologue started previously.
   *
   * It requires the permission `ACCESS_MONOPOLIZATION`.
   *
   * @memberof yodaRT.activity.Activity
   * @instance
   * @function stopMonologue
   * @returns {Promise<void>}
   */
  stopMonologue: {
    returns: 'promise'
  }
}

module.exports = ActivityDescriptor
