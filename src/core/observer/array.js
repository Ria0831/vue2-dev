/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

//arrayMethods就是基于数组的原型对象创建一个新的对象
//复写array原型方法，使其具有依赖通知更新的能力
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 遍历这7个方法
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  //以push方法为例，获取arrayProto.push的原生方法
  const original = arrayProto[method]
  //分别在arrayMethods对象上定义那7个方法
  //比如后续执行arr.push时就是执行以下方法，而不是执行原生的方法
  def(arrayMethods, method, function mutator (...args) {
    //先执行原生的方法，往数组中放置新的数据
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    //如果是插入操作，还需要额外响应化处理
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    //如果执行的是push，unshift，splice方法进行响应式处理
    if (inserted) ob.observeArray(inserted)
    // notify change
    //执行dep.notify()进行依赖通知更新
    ob.dep.notify()
    return result
  })
})
