/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    //每个组件都有一个uid,且uid是递增的
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options，合并选项
    //子组件
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      //优化组件内部实例化
      //动态选择合并是非常慢的，并且没有一个内部组件选项需要特殊处理
      // 子组件：性能优化，减少对原型链的动态查找，提高执行效率
      initInternalComponent(vm, options)
    } else {
      //根组件：选项合并，讲全局配置选项合并到根组件的局部配置，比如Vue.component注册的全局组件会合并到根实例的components选项中
      /*
      组件的选项合并，会发生在三个地方
      1.Vue.component方法注册的全局组件在注册时做了选项合并
      2.{components:{ xx }}方式注册的局部组件在执行编译器生成的render函数时做了选项合并，会合并全局配置项到组件局部配置项上
      3.这里的根组件的情况
      */
      

      vm.$options = mergeOptions(
        //解析构造函数的配置
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    //整个初始化最重要的部分也是核心
    //组件关系属性的初始化，比如$parent,$root,$children
    initLifecycle(vm)
    //初始化自定义事件
    //<comp @click='handleClick'></comp>，是谁在监听这个点击事件？
    //是子组件在监听，谁触发谁监听
    //最终会编译成this.$emit('click'),this.$on('click',function handleClick() {})的形式
    initEvents(vm)
    //初始化插槽，获取this.$slot，定义this._c (也就是createElement方法，平时使用的h函数)
    initRender(vm)
    //执行 beforeCreate声明周期函数
    callHook(vm, 'beforeCreate')
    //初始化inject选项，得到{key:value}形式的配置对象，并作响应式处理
    initInjections(vm) // resolve injections before data/props
    //响应式原理的核心，处理props,methods,computed,data,watch等选项
    initState(vm)
    //处理 provide选项
    //总结provide,inject的实现原理：并没有自己去注入，而是子组件inject自己去父组件中找到相应的key值,得到{key:value}形式的配置对象
    initProvide(vm) // resolve provide after data/props
    //调用created生命周期钩子函数
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    //如果存在$el选项，自动执行$mount
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
//性能优化，打平配置对象上的属性，减少运行时对原型链的查找，提高执行效率
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  //基于构造函数上的配置对象创建vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  // 把配置项的属性都拿出来赋值到$options,这样做避免了原型链的查找
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag
  // 如果有render函数的话将其赋值到$options
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
//从构造函数上解析配置项
export function resolveConstructorOptions (Ctor: Class<Component>) {
  //从实例的构造函数上获取配置选项
  let options = Ctor.options
  // 如果实例上有父类
  if (Ctor.super) {
    //获取到父类的配置
    const superOptions = resolveConstructorOptions(Ctor.super)
    //缓存父类的配置选项
    const cachedSuperOptions = Ctor.superOptions
    //如果父类的配置选项和新的配置不一致
    if (superOptions !== cachedSuperOptions) {
      //说明父类的配置选项发生了更改，需要重新设置
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      //找到更改的选项
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        //将更改的选项和extend选项合并
        extend(Ctor.extendOptions, modifiedOptions)
      }
      //将心的选项赋值给options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
//解析构造函数中被修改活增加的选项
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  //构造函数选项
  const latest = Ctor.options
  //密封的构造函数选项，北方
  const sealed = Ctor.sealedOptions
  //遍历构造函数选项，记录不一样的存入modified
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
