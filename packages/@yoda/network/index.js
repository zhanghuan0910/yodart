'use strict'

/**
 * @module @yoda/network
 * @description Provides classes to manage network functions on the device.
 */

var EventEmitter = require('events').EventEmitter
var flora = require('@yoda/flora')

/**
 * @class
 * @auguments EventEmitter
 * @param {boolean} subscribe - subscribe network.status or not
 * @memberof module:@yoda/network
 */
class NetworkAgent extends EventEmitter {
  constructor () {
    super()

    this._callTarget = 'net_manager'
    this._callCommand = 'network.command'
    this._callTimeout = 60 * 1000

    this._flora = new flora.Agent('unix:/var/run/flora.sock')
    this._flora.start()
  }

  /**
   * Destructor, release all resources.
   *
   * @function deinit
   */
  deinit () {
    this._flora.close()
    this._flora = null
  }

  /**
   * @private
   */
  _call (device, command, params) {
    var data = {
      device: device,
      command: command
    }
    if (params) { data.params = params }

    return this._flora.call(
      this._callCommand,
      [JSON.stringify(data)],
      this._callTarget,
      this._callTimeout
    ).then(reply => {
      if (reply && reply.msg) {
        return JSON.parse(reply.msg[0])
      } else {
        throw reply
      }
    })
  }

  /**
   * start subscribing network status
   *
   * @function subscribeNetworkStatus
   */
  subscribeNetworkStatus () {
    this._flora.subscribe('network.status', (caps, type) => {
      var msg = JSON.parse(caps[0])

      if (msg.network) {
        this.emit('network.status', msg.network)
      } else if (msg.wifi) {
        this.emit('wifi.status', msg.wifi)
      } else if (msg.ethernet) {
        this.emit('ethernet.status', msg.ethernet)
      } else if (msg.modem) {
        this.emit('modem.status', msg.modem)
      }
    })
  }

  /**
   * stop subscribing network status
   *
   * @function unsubscribeNetworkStatus
   */
  unsubscribeNetworkStatus () {
    this._flora.unsubscribe('network.status')
  }

  /**
   * Trigger network service to send command.status immediately.
   *
   * @function triggerStatus
   */
  triggerStatus () {
    return this._call('NETWORK', 'TRIGGER_STATUS')
  }

  /**
   * Get capacities of network service.
   *
   * @function getCapacities
   * @returns {PROMISE} - {
   *   "result": "OK|NOK",
   *   "reason": "...",
   *   "net_capacities": ["modem", "wifi", "ethernet"]
   * }
   */
  getCapacities () {
    return this._call('NETWORK', 'GET_CAPACITY')
  }

  /**
   * Get current network status.
   *
   * @function getNetworkStatus
   * @returns {PROMISE} - {
   *   "result": "OK|NOK",
   *   "reason": "...",
   *   "network": {
   *     "state": "CONNECTED|DISCONNECTED",
   *   }
   * }
   * @example
   * var network = require('@yoda/network')
   * var networkAgent = new network.NetworkAgent()
   * networkAgent.getNetworkStatus().then((reply) => {
   *   if (reply.network.state === network.CONNECTED) {
   *     console.log('Network is connected')
   *   }
   * })
   */
  getNetworkStatus () {
    return this._call('NETWORK', 'GET_STATUS')
  }

  /**
   * Sends the command to network service to reset dns.
   *
   * @function resetDns
   */
  resetDns () {
    return this._call('NETWORK', 'RESET_DNS')
  }

  /**
   * Get current wifi status.
   *
   * @function getWifiStatus
   * @returns {PROMISE} - {
   *   "result": "OK|NOK",
   *   "reason": "...",
   *   "wifi": {
   *     "state": "CONNECTED|DISCONNECTED",
   *   }
   * }
   * @example
   * var network = require('@yoda/network')
   * var networkAgent = new network.NetworkAgent()
   * networkAgent.getWifiStatus().then((reply) => {
   *   if (reply.wifi.state === network.CONNECTED) {
   *     console.log('Wifi is connected')
   *   }
   * })
   */
  getWifiStatus () {
    return this._call('WIFI', 'GET_STATUS')
  }

  /**
   * Sends the WI-FI config to network service, which would try to join immediately.
   * You may need to wait on event of 'network.status' or `getNetworkState()` to
   * get if the network is connected.
   *
   * @function connectWifi
   * @param {string} ssid - the wifi name
   * @param {string} [psk] - the wifi psk, an empty string or blanks would be ignored.
   * @param {string} [method=WPA2PSK] (not implement at present) -
   *   the key method, available methods are: "WPA2PSK", "WPAPSK", "WEP", "NONE".
   */
  connectWifi (ssid, passwd) {
    return this._call('WIFI', 'CONNECT', {'SSID': ssid, 'PASSWD': passwd})
  }

  /**
   * Sends the command to network service to make it disconnect wifi.
   * You may need to wait on event of 'network.status' or `getNetworkState()` to
   * get if the network is disconnected.
   *
   * @function disconnectWifi
   */
  disconnectWifi () {
    return this._call('WIFI', 'DISCONNECT')
  }

  /**
   * Sends the command to network service to make it start scan wifi.
   *
   * @function startScanWifi
   */
  startScanWifi () {
    return this._call('WIFI', 'START_SCAN')
  }

  /**
   * Sends the command to network service to make it stop scan wifi.
   *
   * @function stopScanWifi
   */
  stopScanWifi () {
    return this._call('WIFI', 'STOP_SCAN')
  }

  /**
   * Get scanning result of the WI-FI
   *
   * @function getListOfWifi
   * @returns {PROMISE} - {
   *   "result": "OK|NOK",
   *   "reason": "...",
   *   "wifilist": {
   *     {"SSID": "xxxx", "SIGNAL": "xxxx"},
   *     {"SSID": "xxxx", "SIGNAL": "xxxx"}
   *   }
   * }
   */
  getListOfWifi () {
    return this._call('WIFI', 'GET_WIFILIST')
  }

  /**
   * Remove item(s) of the WI-FI configuration according to ssid and passwd
   *
   * @function removeWifi
   * @param {string} ssid - the wifi name
   * @param {string} [psk] - the wifi psk, an empty string or blanks would be ignored.
   */
  removeWifi (ssid, passwd) {
    return this._call('WIFI', 'REMOVE', {'SSID': ssid, 'PASSWD': passwd})
  }

  /**
   * Remove all item(s) of the WI-FI configuration according to ssid and passwd
   *
   * @function removeAllOfWifi
   */
  removeAllOfWifi () {
    return this._call('WIFI', 'REMOVE_ALL')
  }

  /**
   * Get the number of items of wifi configuration
   *
   * @function getConfigNumOfWifi
   * @returns {PROMISE} - {
   *   "result": "OK|NOK",
   *   "reason": "...",
   *   "wifi_config": 0|1|2|...
   * }
   */
  getConfigNumOfWifi () {
    return this._call('WIFI', 'GET_CFG_NUM')
  }

  /**
   * Sends the command to network service to make it enable function of the WI-FI.
   *
   * @function enableWifi
   */
  enableWifi () {
    return this._call('WIFI', 'ENABLE')
  }

  /**
   * Sends the command to network service to make it disable function of the WI-FI.
   *
   * @function disableWifi
   */
  disableWifi () {
    return this._call('WIFI', 'DISABLE')
  }

  /**
   * Sends the WI-FI AP config to network service,
   * which would make wifi switch to AP mode
   *
   * @function openWifiAP
   */
  openWifiAP (ssid, passwd, ip, timeout) {
    return this._call('WIFI_AP', 'CONNECT', {
      SSID: ssid,
      PASSWD: passwd,
      IP: ip,
      TIMEOUT: timeout
    })
  }

  /**
   * Sends the command to network service which would make wifi quit AP mode
   * and switch back to STD mode
   *
   * @function closeWifiAP
   */
  closeWifiAP () {
    return this._call('WIFI_AP', 'DISCONNECT')
  }

  /**
   * Sends the command to network service to open Modem
   *
   * @function openModem
   */
  openModem () {
    return this._call('MODEM', 'CONNECT')
  }

  /**
   * Sends the command to network service to close Modem
   *
   * @function closeModem
   */
  closeModem () {
    return this._call('MODEM', 'DISCONNECT')
  }
}

module.exports = {
  /**
   * @typedef CONNECTED {string} - state of network/wifi is connected.
   */
  CONNECTED: 'CONNECTED',

  /**
   * @typedef DISCONNECTED {string} - state of network/wifi is disconnected.
   */
  DISCONNECTED: 'DISCONNECTED',

  NetworkAgent: NetworkAgent
}
