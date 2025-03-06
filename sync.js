'use strict'

function testSync(name, err) {
  if (err) {
    throw new Error('sync failed')
  }
  return name
}

module.exports = {
  testSync
}
