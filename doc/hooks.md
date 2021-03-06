# hooks函数
hook函数只可用于函数组件， 推荐使用函数组件书写更简单

### useEffect函数
    当选人组件生命周期被处罚时会触发当前函数，在此回调中接收最新的props以及state. 此函数需要传递一个Function参数
```typescript
import { useEffect } from "../src/hooks";
const ExampApp = () => {
    useEffect((name, options) => {
        // name 当前生命周期标识， init, inject, willReceiveProps, didMount, didUpdate, destory
        // options.props - 最新的props数据
        // options.state - 最新state对象
        return () => {
            // 当前方法将会在组件被销毁时触发
        }
    });
    return `<span>Example</span>`;
}
```
### 引入hook函数
```typescript
import { useEffect, useCallback, useContext, useComponent, useState } from "../src/hooks";
```