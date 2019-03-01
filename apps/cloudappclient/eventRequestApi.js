'use strict'

var https = require('https')
var crypto = require('crypto')
var qs = require('querystring')
var logger = require('logger')('cloudAppClient-eventReq')
var env = require('@yoda/env')()

var CONFIG = null
var DEFAULT_HOST = env.cloudgw.restful || 'apigwrest.open.rokid.com'
var DEFAULT_URI = '/v1/skill/dispatch/sendEvent'

function gensigh (data) {
  return crypto.createHash('md5')
    .update(qs.stringify(data))
    .digest('hex')
    .toUpperCase()
}

function getAuth () {
  if (CONFIG === null) {
    logger.error('CONFIG not set yet, please set CONFIG first. in: eventRequestApi.js')
    return ''
  }
  var data = {
    key: CONFIG.key,
    device_type_id: CONFIG.deviceTypeId,
    device_id: CONFIG.deviceId,
    service: 'rest',
    version: '1',
    time: Math.floor(Date.now() / 1000),
    secret: CONFIG.secret
  }
  return [
    `version=${data.version}`,
    `time=${data.time}`,
    `sign=${gensigh(data)}`,
    `key=${data.key}`,
    `device_type_id=${data.device_type_id}`,
    `device_id=${data.device_id}`,
    `service=${data.service}`
  ].join(';')
}

function setConfig (config) {
  CONFIG = config
};

function request (event, appId, options, onaction) {
  var data = {
    event: event,
    appId: appId,
    extra: JSON.stringify(options)
  }

  data = JSON.stringify(data)
  logger.log(`[eventReq-raw](${appId}, ${event}) body(${data})`)
  var req = https.request({
    method: 'POST',
    host: DEFAULT_HOST,
    path: DEFAULT_URI,
    headers: {
      'Authorization': getAuth(),
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': data.length
    }
  }, (res) => {
    var list = []
    res.on('data', (chunk) => list.push(chunk))
    res.on('end', () => {
      var msg = Buffer.concat(list).toString()
      if (res.statusCode !== 200) {
        onaction(new Error(`Error: failed upload ${event} ${data} with ${msg}`))
      } else {
        logger.log(`[eventRes-raw](${appId}, ${event}) raw(${msg})`)
        msg = JSON.parse(msg)
        if (typeof onaction === 'function') {
          onaction(null, msg.response)
        }
      }
    })
  })
  req.on('error', (err) => {
    onaction(err)
  })
  req.write(data)
  req.end()
};

function ttsEvent (name, appId, itemId, cb) {
  request(name, appId, {
    voice: {
      itemId: itemId
    }
  }, cb)
}

function mediaEvent (name, appId, extra, cb) {
  request(name, appId, {
    media: extra
  }, cb)
}

exports.request = request
exports.ttsEvent = ttsEvent
exports.mediaEvent = mediaEvent
exports.setConfig = setConfig
