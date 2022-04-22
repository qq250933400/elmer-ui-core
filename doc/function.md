## 函数组件的使用

* 定义简单的函数组件，只需要定义个Function 并返回html代码即可
* 如果需要使用state或则引入其他组件请参考hooks函数的用法 ([Hooks](./hooks.md))

```typescript
// 简单的函数组件
const ExampComponent = (props) => {
    return `<div><hr/><span>Context Consumer{{props.value}}</span></div>`;
}
```