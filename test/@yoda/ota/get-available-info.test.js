'use strict'

var logger = require('logger')
var test = require('tape')
var ota = require('@yoda/ota')
var otaNetwork = require('@yoda/ota/network')
var property = require('@yoda/property')
var mock = require('../../helper/mock')

function mockPropertyGet (noota) {
  var get = property.get
  mock.restore()
  mock.mockReturns(property, 'get', function mockGet (key) {
    if (key === 'persist.sys.rokid.noota') {
      return noota
    }
    return get.call(property, key)
  })
}

test('if cloudgw is not initialized，getAvailableInfo is error', t => {
  t.plan(1)
  ota.getAvailableInfo(err => {
    t.throws(() => { throw err }, 'cloudgw is not initialized.', 'cloudgw is not initialized.')
    t.end()
  })
})

test('getAvailableInfo should be ok', t => {
  t.plan(2)
  mockPropertyGet()
  mock.mockCallback(otaNetwork, 'fetchOtaInfo', null, { code: 'NO_IMAGE' })
  ota.getAvailableInfo((err, info) => {
    if (err) {
      logger.info(err + '=======err=======')
    }
    t.ok(err == null)
    if (info) {
      logger.info(info + '=======info=======')
    }
    t.ok(info == null)
    t.end()
  })
})

test.skip('getAvailableInfo should be ok', t => {
  t.plan(2)
  mockPropertyGet()
  mock.mockCallback(otaNetwork, 'fetchOtaInfo', null, null)
  ota.getAvailableInfo((err, info) => {
    if (err) {
      logger.info(err + '=======err=======')
    }
    t.ok(err == null)
    if (info) {
      logger.info(info + '=======info=======')
    }
    t.ok(info == null)
    t.end()
  })
})
