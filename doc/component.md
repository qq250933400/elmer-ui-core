# 类组件的使用

1、定义一个简单类组件
```typescript
    import { Comonent } from "elmer-ui-core";
    export class ExampComponent extends Component {
        render(): any {
            return `<button>Example Component</button>`;
        }
    }
```
2、使用$getContext定义state实现跨组件传递
- a. 在类组件定义$getContext方法，返回创建的state name和data
```typescript
export class ExampComponent extends Component {
    $getContext({path, props}): any {
        return {
            name: "Your state name",
            data: {} // 要往下跨层级传递的数据，不能横向传递
        }
    }
}
```
3、类组件将$willRecevieProps钩子函数移到static 方法上未防止在$willRecevieProps多次调用setState执行多次渲染
- a. 重新定义static $willRecevieProps(): any;
- b. $willRecevieProps返回一个object对象将会自动设置返回值到state对象上并调用render方法重新渲染数据