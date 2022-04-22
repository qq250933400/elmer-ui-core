# 如何开始使用ElmerUI

```typescript
import { ElmerUI } from "../src/render/ElmerUI";

const ui = new ElmerUI();
ui.onReady(() => {
    const exampleApp = {
        title: "example app",
        version: "20201205",
        state: {
            count: 0,
            testData: [],
            visible: false
        },
        onClick: function() {
            console.log("this is the click event callback");
        },
        render: function() {
            return `<div>Hello world</div>`
        }
    };
    ui.render(document.getElementById("app"), exampleApp);
});

```