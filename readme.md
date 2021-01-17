#  elmer-ui-core web轻量前端框架

#### 版本更新：
    # v1.2.29
	    * 修复自定义组件下引用多层自定义组件时当有更新时不能渲染子组件
		* 修复状态管理器没有更新
		* 更新elmer-common包，修复setValue传入callback没有获取到属性值
	# v1.2.8
		* 修改withRouter代码逻辑，通过declareComponent注册redirect方法
		* 增加router配置在跳转前或页面加载前自动call API
	# v1.2.7
		* 升级依赖包elmer-common,elmer-redux, elmer-worker, elmer-validation
	# v1.2.6
		* 修复服务端渲染，客户端mapping出现错误问题
		* 增加context定义，用于component跨组件传递参数，增加Component生命周期函数
	# v1.2.2
		* 重构redux组件
	# v1.2.1
		* 升级elmer-common版本
		* 将redux分到单独的包，引用elmer-redux
		* 升级elmer-validation,elmer-worker
	# v1.1.15
		* 修复属性渲染错误
		* 新增component声明周期函数beforeVirtualRender,afterVirtualRender,beforeDiff, afterDiff
		* 新增attach属性定义，将dom绑定到父组件中
	# v1.1.14
		* 修复Component类方法setTheme设置无效，修改方法签名
		* 针对webpack配置新增Html文件加载Loader，通过webpack加载将html解析为虚拟dom数据
		* 针对webpack配置新增TPLoader用于解析declareComponent配置模版文件
		* 修改渲染逻辑减少使用HtmlParse解析文本类型htmlCode
	# v1.1.13
		* 修复渲染组件获取绑定数据错误
	# v1.1.12
		* 绑定数据增加当绑定变量为undefined, null时设置默认值
		* 修复bind属性自动绑定值到state,增加第三个参数绑定动作结束触发指定方法
	# v1.1.11
		* 修复component.$resize 方法逻辑，导致每个compnent都会绑定resize事件问题
		* 在IElmerComponent文件增加生命周期函数声明
	# v1.1.10
		* 新增Validation Component表单校验
		* 修复解析html代码未释放资源问题
	# v1.1.4
		* 修复redux数据错误应用到component挂载重复挂载问题
		* 移除Component 类自动使用setProperty方法将props定义直接到component对象
		* 修改传入component的props定义成readonly的数据，错误操作修改原属性值
		* 修改redux返回state定义方式，定义成readonly的对象，防止内存调用导致redux数据值变换，无法检查变化触发component的$onPropsChanged事件
		* 增加NodeList.forEach兼容性处理，修复IE浏览器不支持此方法在调用ElmerDom中的query函数引起的错误
	# v1.1.3
		* 修复route切换错误，加载错误component
		* 修复设置svg属性出现readonly错误
	# v1.1.2
		* 修复无法向Route传递参数问题
		* 修改route change检测逻辑，其他功能等待优化
	# v1.1.0
		* 修复渲染组件时定义属性值出现错乱
		* 修改自定义redux组件定义state逻辑
	# v1.0.13
		* 修改defineReduxtProvider 定义逻辑，防止重复定义报错
	# v1.0.10
		* 增加ex:props 属性扩展，自定义组件展开属性值做自定义组件属性
        # v1.0.8
		* 增加prop type验证规则
		* 修改当属性值为空字符串的错误验证规则
------------------------------------------------------------
基于Typescript编写的前端框架，部分功能还在测试中，编译以后可在原生页面使用
安装使用（当前框架未编辑需在node.js中使用）
1. 未编译的框架需要在node中运行，请先安装node.js
2. 使用npm安装  npm i elmer-ui-core, 使用yarn安装yarn add elmer-ui-core
3. 脚手架未发布，需用户自行配置运行环境，可以在typescript运行环境使用，在普通node.js环境需要安装babel,支持ES6语法，需要支持装饰器
4.使用示例代码
```javascript
import { ElmerUI,declareComponent,Component,createUI } from "elmer-ui-core";
```
```javascript
window.onload = function(){
	const app = document.getElementById("app");
	const ui = new ElmerUI();
	const demo = {
		title: "hahaha"
	};
	//此处可以使用 const ui=createUI(); 使用此方法将只会在全局创建一个ui变量,
	//推荐使用此方法
	
	// eui-demo为未自定义组件
	ui.render(app, "<div><button>{{title}}</button><eui-demo /></div>", demo);
}
```
```javascript
class DemoModel {
	doSomething (){
		console.log("hahah");
	}
}
```
```html
//--------------demo.html
<div>
	<button et:click="handleOnButtonClick">{{title}}</button>
</div>
```

```javascript
// 自定义组件
@declareComponent({
	selector: "demo",
	model: {
		test: DemoModel
		// 此处注入的model每调用一次组件都会创建一个新的对象
	},
	service: {
		// 此处可注入service, service只会创建一个对象，调用多次组件，只会有一个组件
	}
})
class DemoComponent extends Component {
	title: string = "测试"
	$inject(): void {
		// 此方法在注册model或者service时执行，未配置不会触发此方法
	}
	handleOnButtonClick():void {
		this.model.test.doSomething(); //此处调用model方法, service类似
	}
	render(): string {
		return require("./demo.html"); //可使用require引用html的代码
	}
}
// 更多使用方法请关注教程文档
```
