var _ = require('@yoda/util')._
var defaultRegistry = require('../index')

class Metric {
  constructor (name, opts) {
    this.name = name
    if (typeof opts !== 'object') {
      return
    }
    if (Array.isArray(opts)) {
      opts = { labels: opts }
    }
    this.description = opts.description
    this.labels = opts.labels || []
    this.registry = defaultRegistry
  }

  _record (labels, value, extras) {
    if (Array.isArray(this.labels)) {
      labels = _.pick(labels, this.labels)
    }
    if (typeof labels !== 'object' || labels == null) {
      labels = {}
    }
    if (extras != null) {
      Object.assign(labels, extras)
    }
    this.registry.export({ name: this.name, description: this.description, labels: labels, value: value })
  }
}

module.exports = Metric
