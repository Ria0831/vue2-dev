/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
  invokeWithErrorHandling
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}
//将key代理到vue实例上
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    //this._props.key
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  //拦截对this.key 的访问
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
//响应式原理的入口
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  //对props配置做响应式处理
  //代理props配置上的key到vue实例中，支持this.propKey的方式访问
  if (opts.props) initProps(vm, opts.props)
  //判重处理，methods中定义的属性不能和props定义的属性重复，props优先级大于methods
  //将methods中的配置赋值到vue实例上，支持通过this.methodsKey的方式访问方法
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    //判重处理，data中的属性不能和props和methods的属性重复
    //代理，将data中的属性代理到vue实例，支持通过this.key的方式访问data
    //响应式处理
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  /**
   * computed 是通过Watcher来实现对每个computedkey实例化的一个watcher,默认懒执行
   * 将computedKey代理到Vue实例中，支持通过this.computedKey的方式访问computed.key
   * 注意理解computed缓存的实现原理(watcher.dirty)
   */
  if (opts.computed) initComputed(vm, opts.computed)
  //核心：实例化一个watcher实例，并返回一个unwatch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
  /**
   * computed和watch有什么区别
   * computed默认懒执行，且不可更改，但是watch可配置
   * 使用场景不同，watch可以异步操作
   */
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      //对props数据做响应式处理
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    //在vue.extend()期间，静态props已经在组件属性中代理。我们只需要在实例化这里定义要代理的props
    //
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  let data = vm.$options.data
  /**vm.$options.data在mergeOptions的时候被处理成一个函数，而且这个函数的执行结果才是真正的数据
  既然已经是一个函数了为什么还要typeof data === 'function'判断？
   beforeCreate 生命周期钩子函数是在 mergeOptions 函数之后 initData 之前被调用的，
  如果在 beforeCreate 生命周期钩子函数中修改了 vm.$options.data 的值
  那么在 initData 函数中对于 vm.$options.data 类型的判断就是必要的了。
  */
  //保证后续处理的data是一个对象
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  //代理这些数据到实例上
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  /**
   * 判重处理
   * 1.data中的属性不能和props、methods中的属性重复
   * 2.不能以$和_开头
   */
  
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // isReserved(key)，该条件的意思是判断定义在 data 中的 key 是否是保留键
      //代理，代理data中的属性到vue实例，支持通过this.key的方式访问
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  //响应式处理
  observe(data, true /* asRootData */)
}

/**
 * getData函数的作用：获取真正的数据对象并返回
 * @param {*} data 是一个函数
 * @param {*} vm 是vue的实例对象
 * @returns 
 */
export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  // 调用了 pushTarget() 函数，并且在 finally 语句块中调用了 popTarget()
  // 防止使用props数据初始化data数据时收集冗余依赖
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  //是否是服务端渲染
  const isSSR = isServerRendering()
  //遍历computed对象
  for (const key in computed) {
    //获取key对应的值
    const userDef = computed[key]
    /**
     * 
     * {
        computed:{
          //是一个对象的形式
          msg:function(){
            
          },
          //默认提供一个getter方法，所以会有一个get选项
          fullName:{
            //getter
            get:function(){

            },
            set:function(){

            }
          }
        }
      }
     */
    
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      //实例化一个watcher，所以computed的原理就是通过watcher来实现的
      watchers[key] = new Watcher(
        vm,   //vue实例
        getter || noop, //get函数
        noop, //空
        computedWatcherOptions  //配置对象，默认配置是懒执行
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(`The computed property "${key}" is already defined as a method.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  //将computed配置项中的key代理到vue实例上，支持通过this.computedKey的方式访问computed中的属性
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    //拿到watcher
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      //watcher.dirty = this.lazy // for lazy watchers
      //如果是懒加载，就是脏的，需要使用的时候要重新取值，这样才能保证是最新的
      //执行computed[key]的值（函数）得到函数的执行结果，赋值给watcher.value
        //将watcher.dirty 置为false
        /**
         * computed和methods的区别？
         * watcher.dirty就是computed计算结果会缓存的原理
         *  <template>
              <div>{{ computedProperty }}</div>
              <div>{{ computedProperty }}</div>
            </template>
         * 在一次渲染当中，computed只执行一次，后续的访问就不会再执行了，直到下一次更新之后才会再次执行
         * 在watcher的update()方中watcher.dirty才会被重新置为true
         */
      if (watcher.dirty) {
        watcher.evaluate()
        /**
         *  evaluate () {
              this.value = this.get()
              this.dirty = false
            }
         */
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  /**
   * 判重处理
   * 1.methods[key]必须是个function,typeof判断
   * 2.methods的key不能和props的key重复,props优先级大于methods
   * 3.检查methods的key是否重复，不能以_或$开头
   */
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    //将methods中的所有方法赋值到vue实例上，所以才能通过this.methodKey去访问定义的方法
    //noop返回了空，不执行任何操作
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

function initWatch (vm: Component, watch: Object) {
  //遍历watcher配置项
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  //如果是对象，从handler属性中获取函数
  /**
   * watch:{
   *    c: {
          handler: function (val, oldVal) {  },
          deep: true
        },
      }
   */
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  //如果是字符串，表示的是一个methods方法，直接通过this.methodsKey的方式拿到这个函数
  /**
   * watch:{
   *    // 方法名
        b: 'someMethod',
      }
   */
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del
  /**
   * 创建 watcher，返回 unwatch，共完成如下 5 件事：
   *   1、兼容性处理，保证最后 new Watcher 时的 cb 为函数
   *   2、标示用户 watcher
   *   3、创建 watcher 实例
   *   4、如果设置了 immediate，则立即执行一次 cb
   *   5、返回 unwatch
   * @param {*} expOrFn key
   * @param {*} cb 回调函数
   * @param {*} options 配置项，用户直接调用 this.$watch 时可能会传递一个 配置项
   * @returns 返回 unwatch 函数，用于取消 watch 监听
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this

    //处理cb是对象的方法，保证后续处理中cb肯定是一个函数,兼容this.$watch()的写法
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    //标记，这是一个用户watcher
    options.user = true
    //实例化watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)
    //存在immediate：true,立即执行回调函数
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    //返回一个unwatch
    return function unwatchFn () {
      //取消watch监听
      watcher.teardown()
    }
  }
}
