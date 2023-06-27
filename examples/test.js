// const data = {
//   a: 1
// }

const { resolve } = require("dns");

 

// const dep = []
// let Target = null
// Object.defineProperty(data, 'a', {
//   set () {
//     console.log('设置了属性 a')
//     dep.forEach(fn => fn())
//   },
//   get () {
//     console.log('读取了属性 a')
//     dep.push(Target)
//   }
// })


// function $watch(exp,fn){
//   console.log('修改了 a', data[exp],'weee',Target,'a',exp)
//   Target = fn
//   data[exp]
// }
// $watch('a', () => {
//   console.log('第一个依赖')
// })
// $watch('a', () => {
//   console.log('第二个依赖')
// })

// function walk(data){
//   for(let key in data){
//     const dep = []
//     let val = dat[key]
//     const nativeString = Object.prototype.toString.call(val)
//     if(nativeString === "[object object]"){
//       walk(val)
//     }
//     Object.defineProperty(data,key,{
//       set(newval){
//         if(newval === val) return
//         val = newval
//         dep.forEach(fn => fn())
//       },
//       get(){
//         dep.push(Target)
//         return val
//       }
//     })
//   }
// }

// class Person(override){
//   this.foo = "foo"
//   if(override){
//     return {ba:"ba"}
//   }
// }
// let p1 = new Person()
// let p2 = new Person("whtat")
// console.log(p1,p1 instanceof Person)
// console.log(p2,p2 instanceof Person)



// function newOperator(ctor){
//   console.log('typeof ctor',typeof ctor)
//   if(typeof ctor != "function"){
//     throw "不是个函数"
//   }
//   let newObj = Object.create(ctor.prototype)
//   const argsArr = [...arguments]
//   const ctorResult = ctor.apply(newObj,argsArr)
  
//   const isObject = typeof ctorResult !== "object" && ctorResult !== null
//   const isFunction = typeof ctorResult == "function"
//   console.log(ctorResult,'CCCTTT',typeof ctorResult)
//   if(isFunction || isObject) {
//     return ctorResult
//   } else {
//     return newObj
//   }
// }
// let p1 = newOperator(Person)
// // let p2 = newOperator(Person("TEST"))
// console.log(p1,p1 instanceof Person)
// // console.log(p2,p2 instanceof Person)

// class Person{
//   constructor(){
//     this.name = ["ljj","dzw","jay"]
//   }
//   locate(){
//     console.log("prototype",this)
//   }
//   static locate(){
//     console.log("定义在类本身",this)
//   }
//   *[Symbol.iterator]() {
//     yield * this.name.entries()
//   }
// }
// class p1 extends Person{
//   constructor(){
//     // return
//   }
// }
// console.log(new p1(),'pppp')

// const target = {};
// Object.defineProperty(target,'foo',{
// 	configurable:false,
// 	writable:false,
// 	value:'bar'
// });
// const handler = {
// 	get(){
// 		return 'bar';
// 	}
// }
// const proxy = new Proxy(target,handler);
// console.log(proxy.foo);//'get' on proxy: property 'foo' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value (expected 'bar' but got 'qux')

// const wm = new WeakMap();

// class User{
// 	constructor(userId){
// 		wm.set(this,userId);
// 	}
	
// 	set id(userId){
// 		wm.set(this,userId);
// 	}

// 	get id(){
// 		return wm.get(this);
// 	}
// }

// const user = new User(123);
// console.log(user.id);//123

// const userInstanceProxy = new Proxy(user,{});
// userInstanceProxy.id = 567
// console.log(userInstanceProxy.id);//undefined


// function MyObject(){
// 	let privateVariable = 10;
// 	function privateFunction(){
// 		return false;
// 	}
// 	this.publicMethod = function(){
// 		privateVariable++;
// 		return privateFunction();
// 	};
// }

// let p = new MyObject()
// console.log(MyObject.prototype)

// const PENDING = "pending"
// const FULFILED = "fulfiled"
// const REJECT = "rejected"
// class myPromise {
//   constructor(executor){
//     try {
//       executor(this.resolve,this.reject)
//     } catch (error) {
//       this.reject(error)
//     }
    
//   }
//   // promise状态，默认是等待状态
//   status = PENDING
//   // 成功的值
//   value = undefined
//   // 失败的值
//   reason = undefined
//   // 保存两组回调
//   fulfilledCbs = []
//   rejectedCbs = []

//   resolve = (value)=>{
//     // 状态改为成功
//     this.status = FULFILED
//     // 保存成功时的函数传参
//     this.value = value
//   }
//   reject = (reason)=>{
//     // 如果状态不是pending状态，直接return
//     if(this.status !== PENDING) return
//     // 状态改为失败
//     this.status = REJECT
//     // 保存失败时的函数传参
//     this.reason = reason
//   }
//   // 原型方法在多个实例中共享
//   then(successCallbal,failCallback){
    
//     if(typeof successCallbal !== "function"){
//       successCallbal = ()=>{}
//     }
//     if(typeof failCallback !== "function"){
//       failCallback = ()=>{}
//     }
//     if(this.status === PENDING){
//       this.fulfilledCbs.push(successCallbal)
//       this.rejectedCbs.push(failCallback)
//     }else if(this.status === FULFILED){
//       try {
//         successCallbal(this.value)
//       } catch (error) {
//         this.reject(error)
//       }
     
      
//     }else{
//       try {
//         failCallback(this.reason)
//       } catch (error) {
//         this.reject(error)
//       }
//     }
//   }
// }
// const pro = new myPromise((resolve,reject)=>{
//   // resolve("成功ljj")
//   reject("失败344")
// }).then((resolve)=>{
//   console.log(resolve,'resolve')
// },(reject)=>{
//   console.log(wht,'reject')
// })
// console.log(pro)
// new Promise((resolve, reject) => {
//   reject(1) //失败状态
// })
// .then(value => {
//   console.log('成功', value);
// }, reason => {
//   console.log('失败', reason); //失败 1；无返回值、默认返回成功状态，状态值为undefined
//   return 'why'
// })
// .then(value => {
//   console.log('成功', value); //成功 undefined
// }, reason => {
//   console.log('失败', reason);
// })


// new Promise((resolve, reject)=>{
// 	// resolve(2),
// 	reject(1)
// }).then(
// 	value=>{console.log('onResoled1()'+ value)},
// 	reason=>{throw reason}
// ).then(
// 	value=>{console.log('onResoled2()'+ value)},
// 	reason=>{throw reason}//或return Promise.reject(reason) 不能reason=>throw reason 、reason=> reason
// ).catch(
//     reason=>{console.log('onReject1()'+ reason)//会执行下面的then 结果是onResoled3()undefined 如果想中断后面的then可以返回一个空的promise
//     return new Promise(()=>{})  //返回一个pending的promise，一直处于pending没有结果就会中断
// }
// ).then(
// 	value=>{console.log('onResoled3()'+ value)},
// 	reason=>{console.log('onReject2()'+ reason)}
// )
var _name = "global"
var obj = {
  _name : "local",
  func(){
    const innerFunc = ()=> {
      console.log(this._name)
    }
    return innerFunc
  }
}

obj.func.bind()()()

// Promise.resolve().then(()=>{
//   console.log(0)
//   return Promise.resolve(4)
// }).then(res=>{
//   console.log(res)
// })

// Promise.resolve().then(()=>{
//   console.log(0)
//   return 4
// }).then(res=>{
//   console.log(res)
// })
Promise.resolve().then(()=>{
  console.log(0)
  return {then: f=>f(4)}
}).then(res=>{
  console.log(res)
})

Promise.resolve().then(()=>{
  console.log(1)
}).then(()=>{
  console.log(2)
}).then(()=>{
  console.log(3)
}).then(()=>{
  console.log(5)
}).then(()=>{
  console.log(6)
})



