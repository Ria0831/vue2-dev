Promise.all = function (iterator) {
  const type = Object.prototype.toString.call(iterator).slice(8, -1).toLocaleLowerCase();
  const isIterable = (
    ((typeof iterator === "object" && iterator !== null) ||
      typeof iterator === "string") &&
    typeof iterator[Symbol.iterator] === "function"
  );
  if (isIterable) {
    let resolveCount = 0;
    const promiseResult = [];
    iterator = Array.from(iterator);
    const promiseCount = iterator.length;

    return new Promise((resolve, reject) => {
      if (!iterator.length) {
        resolve([]);
      }
      iterator.forEach((promise, index) => {
        Promise.resolve(promise).then(
          (value) => {
            resolveCount++;
            promiseResult[index] = value;
            if (promiseCount === resolveCount) {
              resolve(promiseResult);
            }
          },
          (reason) => {
            reject(reason);
          }
        );
      });
    });
  } else {
    throw new TypeError(`${type} ${iterator} is not iterable`);
  }
};

Promise.all = function(promiseArr){
  let index = 0,result = []
  return new Promise((resolve,reject) => {
    promiseArr.forEach((p,i)=>{
      Promise.resolve(p).then(value=>{
        index += 1
        result[i] = value
        if(index === promiseArr.length){
          resolve(result)
        }
      },err=>{
        reject(err)
      })
    })
  })
}

const p1 = new Promise((resolve) => {
  setTimeout(resolve.bind(null, 1), 3000);
});
const p2 = new Promise((resolve) => {
  setTimeout(resolve.bind(null, 2), 100);
});
const p3 = new Promise((resolve) => {
  setTimeout(resolve.bind(null, 3), 500);
});
function* gen() {
  yield 1;
  yield 2;
  yield 3;
}
// Promise.all().then((v) => {
//   console.log(v,'传入空');
// });
// Promise.all({}).then((v) => {
//   console.log(v);
// });
// Promise.all([]).then((v) => {
//   console.log(v);
// });
Promise.all([p1, p2, p3]).then((v) => {
  console.log(v,'是吗');
});
// Promise.all("123").then((v) => {
//   console.log(v);
// });
// Promise.all(gen()).then((v) => {
//   console.log(v);
// });

/**
 * 怎么取消掉 Promise
 * 给你一个 promise，但是希望取消掉它。

let promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve(123);
  }, 1000);
});
axios 倒是有 abort 方法，但面试里你肯定不得用。

promise 其实缺陷就是无法得知执行到了哪儿，也无法取消，只能被动的等 resolve 或者 reject 执行或者抛错。
所以思路就是外部包裹一层 Promise，并对外提供 abort 方法，这个abort 方法可以用来 reject 内部的 Promise 对象。
 */
console.log(typeof NaN,'nnn')

// let promise = new Promise((resolve, reject) => {
//   setTimeout(() => {
//     resolve(123);
//   }, 1000);
// });

//  function wrap(p) {
//   let resol = null;
//   let abort = null;

//   let p1 = new Promise((resolve, reject) => {
//     resol = resolve;
//     abort = reject;
//   });

//   p1.abort = abort;
//   p.then(resol, abort);

//   return p1;
// }

// let newPromise = wrap(promise);

// newPromise.then(res => console.log("hello",res))
// newPromise.abort()

var p11 = new Promise((resolve, reject) => {
	resolve('p1');
});
var p21 = new Promise((resolve, reject) => {
	resolve('p2');
});
var p31 = new Promise((resolve, reject) => {
	reject('p3');
});
Promise.all([p11, p21, p31].map(p => {
  console.log(p,'p是什么')
  p.catch(e => '出错后返回的值' )
}))
  .then(values => {
    console.log(values,'then');
  }).catch(err => {
    console.log(err,'cathc');
  })


  function getPromise(cb) {
    let _res, _rej;
    
    const promise = new Promise((res, rej) => {
      _res = res;
      _rej = rej;
      cb && cb(res,rej);
    });
    return {
      promise,
      abort: () => {
        _rej({
          name: "abort",
          message: "the promise is aborted",
          aborted: true,
        });
      }
    };
  }
   
  //主逻辑提取出来
  function runCb(resolve,reject){
      setTimeout(()=>{
          resolve('1111')
      },3000)
  }
   
  const { promise, abort } = getPromise(runCb);
  promise.then(res=>console.log(res,'rrrr')).catch(e => {
    console.log(e,'有吗');
  });


  //传入一个正在执行的promise
function getPromiseWithAbort(p){
  let obj = {};
  //内部定一个新的promise，用来终止执行
  let p1 = new Promise(function(resolve, reject){
      obj.abort = reject;
  });
  obj.promise = Promise.race([p, p1]);
  return obj;
}

var promise1  = new Promise((resolve)=>{
setTimeout(()=>{
resolve('123')
},3000)
})

var obj = getPromiseWithAbort(promise1)

obj.promise.then(res=>{console.log(res)})

//如果要取消
obj.abort('取消执行')
   
