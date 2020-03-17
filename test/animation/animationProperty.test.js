// tslint:disable-next-line: no-var-requires
const assert = require("assert");
// tslint:disable-next-line: no-implicit-dependencies
const { describe } = require("mocha");
const animationProperty = require("../../src/animation/ElmerAnimationProperty");
// const { StaticCommon } = require("elmer-common")
const animationObj = animationProperty.default;
const calcPropertyData = animationProperty.calcPropertyData;

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
                top: "34rem"
            });
            let exResult = {
                top: { cssKey: 'top', unit: '', value1: 34, value1Unit: 'rem' }
            };
            assert.equal(JSON.stringify(result), JSON.stringify(exResult));
        });
        // it("readWillChangeCssDefaultData testting", () => {
        //     const demo = document.createElement("a");
        //     demo.innerHTML = "demo dom";
        //     demo.style = "display: block;padding: 5px;width: 100px;height: 60px;background-color: red;";
        //     const rData = animationProperty.readWillChangeCssDefaultData(demo, {
        //         left: 0,
        //         width: 100
        //     }, {
        //         backgroundColor: "#34e223",
        //         width: "350px",
        //         left: "10px",
        //         top: "10%"
        //     });
        //     const exResult = {
        //         left: { cssKey: 'left', unit: '' },
        //         width: { cssKey: 'width', unit: '', value1: 100, value1Unit: 'px' },
        //         backgroundColor: { cssKey: 'backgroundColor', unit: '' },
        //         top: { cssKey: 'top', unit: '' }
        //     };
        //     assert.equal(JSON.stringify(rData), JSON.stringify(exResult));
        // });
        it("calcCssProperty", () => {
            const R = {};
            const expectR = {
                transformTranslate3d: {
                    cssKey: "transformTranslate3d",
                    unit: "",
                    value1: 0,
                    value1Unit: "",
                    value2: -234,
                    value2Unit: "px",
                    value3: 0,
                    value3Unit: ""
                }
            };
            calcPropertyData(R, "transformTranslate3d", "0,-234px,0");
            assert.equal(JSON.stringify(R), JSON.stringify(expectR));
        })
    });
});
