import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // Vue.prototype._init方法,初始化
  this._init(options)
}

initMixin(Vue)  //通过该方法给vue添加_init()方法
stateMixin(Vue)  //$set,$delete,$watch
eventsMixin(Vue)  //$emit,$on,$off,$once
lifecycleMixin(Vue) //生命周期,_update(),$forceUpdate(),$destroy()
renderMixin(Vue)  //和渲染相关，$nextTick,_render()

export default Vue
