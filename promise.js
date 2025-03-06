'use strict'

async function testPromise(name, doReject) {
  return new Promise((resolve, reject) => {
    if (doReject) {
      const err = new Error('prom failed')
      reject(err)
    } else {
      const data = {res: 'test', foo: 'bar', name }
      resolve(data)
    }
  })

}

module.exports = {
  testPromise
}
