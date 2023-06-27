/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 * 理解成一个开关
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
// 每一个响应式的对象都有一个ob

export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    //def为value设置一个__ob__的属性，引用当前Observer的实例
    //  def 函数其实就是 Object.defineProperty 函数的简单封装，
    //之所以这里使用 def 函数定义 __ob__ 属性是因为这样可以定义不可枚举的属性，
    //这样后面遍历数据对象的时候就能够防止遍历到 __ob__ 属性
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      //处理数组响应式
      //hasProto，判断__proto__，是不是对象原型
      //因为__proto__不是一个标准属性，在某些浏览器版本不支持，所以需要判断
      if (hasProto) {
        //覆盖原型链
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      //遍历数组的每一项，对其进行响应式处理，如果是数组里面的元素还是对象
      this.observeArray(value)
    } else {
      //处理对象响应式
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    //遍历这个对象，对这个对象的key进行响应式处理
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  //用经过增强的数组原型方法去覆盖默认的原型方法，之后再执行7个数组方法时就具有了依赖通知更新的能力，以实现数组响应式的目的
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * 将增强的那7个方法直接赋值到数组对象上
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 响应式处理入口
 * 接收两个参数，第一个参数是要观测的数据，第二参数是被观测数据是否是根数据
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果要观测的数据不是一个对象或者是 VNode 实例，则直接 return 
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  //ob是观察者，数据变化了要负责更新和通知
  //已经存在ob直接返回，否则创建新的实例
  let ob: Observer | void
  //如果有__ob__说明已经被响应式处理了，避免重复观测一个数据对象
  //__ob__是ob（观察者）的一个实例
  // 使用 hasOwn 函数检测数据对象 value 自身是否含有 __ob__ 属性，
  //并且 __ob__ 属性应该是 Observer 的实例
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    // 满足5个条件
    /**
     * 1.shouldObserve 可以被观测
     * 2.isServerRendering() 函数的返回值是一个布尔值，用来判断是否是服务端渲染,只有不是服务端渲染时才可以
     * 3.只有当数据对象是数组或纯对象的时候，才有必要对其进行观测
     * 4.要被观测的数据对象必须是可扩展的
     * 5.Vue 实例对象拥有 _isVue 属性，所以这个条件用来避免 Vue 实例对象被观测
     */
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    //满足以上条件说明还没有被响应式处理，实例化一个Observer处理
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 处理响应式的核心
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  
  //实例化一个dep,一个key对应一个dep
  
  const dep = new Dep()

  //获取属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  // arguments.length === 2，只传递了2个参数，需要根据 key 主动去对象上获取相应的值
  // (!getter || setter)是一个边界条件，但是不知道为什么要这么写
  // 即使属性是有值的但是由于没有触发取值的动作，所以 val 依然是 undefined,就重新赋值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 通过递归的方式处理val为对象的情况，即处理嵌套对象
  // 只要是对象类型(引用类型)都会返回childOb
  let childOb = !shallow && observe(val)
  //拦截obj[key]的get和set方法
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      //获取obj[key]的值，进行依赖收集已经返回最新的值
      const value = getter ? getter.call(obj) : val
      //dep.target是一个watcher，如果存在依赖
      if (Dep.target) {
        //读取时进行依赖收集，将dep添加watcher中，也将watcher添加到dep中
        dep.depend()
        //如果存在子ob也收集这个依赖
        if (childOb) {
          //对嵌套对象也进行依赖收集
          childOb.dep.depend()
          if (Array.isArray(value)) {
            //处理嵌套为数组的嵌套
            dependArray(value)
          }
        }
      }
      return value
    },
    //拦截obj.key =  value 的操作
    set: function reactiveSetter (newVal) {
      //获取oldvalue
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      //如果新老值相等，直接返回，不处理
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      //如果只有getter没有setter，也不做处理
      if (getter && !setter) return
      //设置新值，用新值替换老值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      //对新值做响应式处理
      childOb = !shallow && observe(newVal)
      //当响应式数据变化时，通知依赖更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 * 处理数组选项为对象的情况，对其进行依赖收集，因为前面的所有处理都没有办法对数组项为对象的元素进行依赖收集
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
