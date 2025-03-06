'use strict'

function testCallback(name, err, cb) {
  if (typeof err === 'function') {
    cb = err
    err = null
  }

  if (err) {
    cb(err)
  } else {
    cb(null, name)
  }
}

module.exports = {
  testCallback
}
