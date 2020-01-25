// tslint:disable-next-line: no-var-requires
const assert = require("assert");
// tslint:disable-next-line: no-implicit-dependencies
const { describe } = require("mocha");
const animationProperty = require("../../src/animation/ElmerAnimationProperty");
// const { StaticCommon } = require("elmer-common")
const animationObj = animationProperty.default;

describe("Animation Api testting", () => {
    describe("Convert Api testting", () => {
        it("hexToRgb testting: #fff", () => {
            const cValue = animationObj.hexToRgb("#fff");
            assert.equal(JSON.stringify(cValue), JSON.stringify([255,255,255]));
        });
        it("rgbToHex testting: 255,255,255 -> #ffffff", () => {
            const cValue = animationObj.rgbToHex(255,255,255);
            assert.equal(cValue, "#ffffff");
        });
        it("calcPropertyConfigData, {top:34rem}", () => {
            let result = animationProperty.calcPropertyConfigData({
                top: "34rem",
                borderColor: "#ddd #fff #424242ff rgb(0,85,0)",
                borderWidth: "3px 4 89rem 90",
                fontSize: "34px"
            });
            let exResult = {
                top: { cssKey: 'top', unit: '', value1: '34', value1Unit: 'rem' },
                borderColor: {
                    cssKey: 'borderColor',
                    unit: '',
                    value1: [221, 221, 221],
                    value2: [255, 255, 255],
                    value3: [66, 66, 66, 255],
                    value4: [0, 85, 0]
                },
                borderWidth: {
                    cssKey: 'borderWidth',
                    unit: '',
                    value1: '3',
                    value1Unit: 'px',
                    value2: '4',
                    value2Unit: '',
                    value3: '89',
                    value3Unit: 'rem',
                    value4: '90',
                    value4Unit: ''
                },
                fontSize: { cssKey: 'fontSize', unit: '', value1: '34', value1Unit: 'px' }
            };
            assert.equal(JSON.stringify(result), JSON.stringify(exResult));
        });
        it("readWillChangeCssDefaultData testting", () => {
            const demo = document.createElement("a");
            demo.innerHTML = "demo dom";
            demo.style = "display: block;padding: 5px;width: 100px;height: 60px;background-color: red;";
            const rData = animationProperty.readWillChangeCssDefaultData(demo, {
                left: 0,
                width: 100
            }, {
                backgroundColor: "#34e223",
                width: "350px",
                left: "10px",
                top: "10%"
            });
            const exResult = {
                left: { cssKey: 'left', unit: '' },
                width: { cssKey: 'width', unit: '', value1: '100', value1Unit: 'px' },
                backgroundColor: { cssKey: 'backgroundColor', unit: '' },
                top: { cssKey: 'top', unit: '' }
            };
            assert.equal(JSON.stringify(rData), JSON.stringify(exResult));
        });
    });
});
