'use strict'
const promise = require('./promise')
const cb = require('./callback')
const sync = require('./sync')
const newrelic = require('newrelic')
const diagCh = require('node:diagnostics_channel')
const channels = diagCh.tracingChannel('nr-ch') 
const customRecorder = require('newrelic/lib/metrics/recorders/custom')

channels.start.bindStore(newrelic.agent.tracer._contextManager._asyncLocalStorage, (data) => {
  const ctx = newrelic.agent.tracer.getContext()
  const segment = newrelic.agent.tracer.createSegment({
    name: data.name,
    parent: ctx.segment,
    recorder: customRecorder,
    transaction: ctx.transaction
  })
  const newCtx = ctx.enterSegment({ segment })
  return newCtx
})

channels.subscribe({
  start(message) {
    const ctx = newrelic.agent.tracer.getContext()
    console.log('START segment: %s:%s, parent %s, tx: %s', ctx?.segment?.name, ctx?.segment?.id, ctx?.segment?.parentId, ctx?.transaction?.id)
  },
  end(message) {
    const ctx = newrelic.agent.tracer.getContext()
    console.log('END segment: %s:%s, parent %s, tx: %s', ctx?.segment?.name, ctx?.segment?.id, ctx?.segment?.parentId, ctx?.transaction?.id)
    if (message.name.startsWith('sync')) {
      console.log('ending segment', ctx?.segment?.name)
      ctx.segment.end()
    }
  },
  asyncStart(message) {
    const ctx = newrelic.agent.tracer.getContext()
    console.log('ASYNCSTART segment: %s:%s, parent %s, tx: %s', ctx?.segment?.name, ctx?.segment?.id, ctx?.segment?.parentId, ctx?.transaction?.id)
  },
  asyncEnd(message) {
    const ctx = newrelic.agent.tracer.getContext()
    console.log('ASYNCEND segment: %s:%s, parent %s, tx: %s', ctx?.segment?.name, ctx?.segment?.id, ctx?.segment?.parentId, ctx?.transaction?.id)
    ctx.segment.end()
  },
  error(message) {
    const ctx = newrelic.agent.tracer.getContext()
    console.log('ERROR segment: %s:%s, parent %s, tx: %s', ctx?.segment?.name, ctx?.segment?.id, ctx?.segment?.parentId, ctx?.transaction?.id)
  }
})

const origTestPromise = promise.testPromise

promise.testPromise = function wrappedPromise(...args) {
  const [ name ] = args
  return channels.tracePromise(origTestPromise, { name, key: { foo: 'bar'}}, this, ...arguments)
}

const origCb = cb.testCallback
cb.testCallback = function wrappedCallback(...args) {
  const [ name ] = args
  return channels.traceCallback(origCb, -1, { name }, this, ...arguments)
}

const origSync = sync.testSync
sync.testSync = function wrappedSync(...args) {
  const [ name ] = args
  return channels.traceSync(origSync, { name }, this, ...arguments)
}

async function main() {
  await newrelic.startBackgroundTransaction('bg', async function() {
    const tx = newrelic.getTransaction()
    try {
      sync.testSync('sync1')
      await promise.testPromise('test')
      await promise.testPromise('bob') 
      await new Promise((resolve, reject) => {
        cb.testCallback('first', (err, data) => {
          if (!err) {
            const res = sync.testSync('sync2')
            resolve(res)
          } else {
            reject(err)
          }
        })
      })
      await new Promise((resolve, reject) => {
          cb.testCallback('second', (err, data) => {
            if (!err) {
              const res = sync.testSync('sync3')
              resolve(res)
            } else {
              const err = new Error('second async call failed')
              reject(err)
            }
          })
      })
    } catch(err) {
      console.error(err)
    }


    tx.end()
  })
  
  await new Promise((resolve) => {
    newrelic.shutdown({ collectPendingData: true}, resolve)
  })
}

main()

