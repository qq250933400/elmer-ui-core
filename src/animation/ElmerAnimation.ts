import { Canvas, MathAnimationApi, StaticCommon } from "elmer-common";
import AnimationMethod,{ isCssEmpty, TypeAnimationContext, TypeAnimationProperty, TypeAnimationPropertyData } from "./ElmerAnimationProperty";

export type TypeElmerAnimationType = "Linear" | "QuadEaseIn" | "QuadEaseOut" | "QuadEaseInOut" |
    "CubicEaseIn"     | "CubicEaseOut"     | "CubicEaseInOut"     |
    "QuartEaseIn"     | "QuartEaseOut"     | "QuartEaseInOut"     |
    "QuintEaseIn"     | "QuintEaseOut"     | "QuintEaseInOut"     |
    "SineEaseIn"      | "SineEaseOut"      | "SineEaseInOut"      |
    "ExpoEaseIn"      | "ExpoEaseOut"      | "ExpoEaseInOut"      |
    "CircleEaseIn"    | "CircleEaseOut"    | "CircleEaseInOut"    |
    "ElasticEaseIn"   | "ElasticEaseOut"   | "ElasticEaseInOut"   |
    "BackEaseIn"      | "BackEaseOut"      | "BackEaseInOut"      |
    "BounceEaseIn"    | "BounceEaseOut"    | "BounceEaseInOut"    ;

export type TypeAnimationChangeEvent = {
    dom: HTMLElement;
    value: any;
    data: TypeAnimationPropertyData
};

export type TypeAnimationEndEvent = {
    from: TypeAnimationPropertyData;
    to: TypeAnimationPropertyData;
    default: TypeAnimationPropertyData;
};

export type TypeElmerAnimationKeyframe = {
    duration: number;
    beginTime?: number;
    optionA?: number;
    optionP?: number;
    optionS?: number;
    type: TypeElmerAnimationType;
    from?: TypeAnimationProperty;
    to:TypeAnimationProperty;
    dom:HTMLElement;
    onStart?():void;
    onChange?(event:TypeAnimationChangeEvent): void;
    onFinish?(data?:TypeAnimationEndEvent):void;
};

export type TypeElmerAnimationContext = {
    duration: number;
    dom: HTMLElement;
    beginTime?: number;
    optionA?: number;
    optionP?: number;
    optionS?: number;
    type: TypeElmerAnimationType;
    defaultData: TypeAnimationPropertyData;
    fromData: TypeAnimationPropertyData;
    toData: TypeAnimationPropertyData;
    isBegin?: boolean;
    onBegin?(data?:any):void;
    onEnd?(data?:TypeAnimationEndEvent):void;
    onChange?(event?:TypeAnimationChangeEvent): void;
};

export type TypeMathApiParams = {
    duration: number;
    currentTime: number;
    beginValue: number;
    changeValue: number;
    optionA?: number;
    optionP?: number;
    optionS?: number;
};

export type TypeElmerAnimationOptions = {
    data: TypeElmerAnimationKeyframe[];
    duration: number;
    beginTime?: number;
    onChange?(event:TypeAnimationChangeEvent): void;
    onBegin?():void;
    onEnd?(data?:TypeAnimationEndEvent):void;
};

export class ElmerAnimation {
    private cavAnimation:Canvas;
    private handler: number;
    private beginTime: number;
    private timeAnimationCallBack:Function;
    private animationData: TypeElmerAnimationContext[] = [];
    constructor(private options: TypeElmerAnimationOptions) {
        this.cavAnimation = new Canvas();
        this.calcFrameAttribute();
        this.start();
    }
    start(): void {
        if(this.options) {
            typeof this.options.onBegin === "function" && this.options.onBegin();
            this.beginTime = (new Date()).getTime();
            this.handler = this.cavAnimation.startAnimation(this.animationCallBack, this);
        }
    }
    stop(): void {
        this.cavAnimation.stopAnimation(this.handler);
        this.options && typeof this.options.onEnd === "function" && this.options.onEnd();
        this.dispose();
    }
    private calcFrameAttribute(): void {
        const data:TypeElmerAnimationKeyframe[] = this.options.data || [];
        const animationData: TypeElmerAnimationContext[] = [];
        data.map((item:TypeElmerAnimationKeyframe) => {
            animationData.push({
                beginTime: item.beginTime,
                defaultData: AnimationMethod.readWillChangeCssDefaultData(item.dom, item.from, item.to),
                dom: item.dom,
                duration: item.duration,
                fromData: AnimationMethod.converOption(item.from),
                onBegin: item.onStart,
                onEnd: item.onFinish,
                optionA: item.optionA,
                optionP: item.optionP,
                optionS: item.optionS,
                toData: AnimationMethod.converOption(item.to),
                type: item.type,
            });
        });
        this.animationData = animationData;
    }
    private dispose(): void {
        if(this.animationData && this.animationData.length > 0) {
            this.animationData.map((tmpItem:TypeElmerAnimationContext): void => {
                typeof tmpItem.onEnd === "function" && tmpItem.onEnd({
                    default: tmpItem.defaultData,
                    from: tmpItem.fromData,
                    to: tmpItem.toData,
                });
            });
        }
        this.animationData = null;
        this.cavAnimation = null;
        this.options = null;
        this.timeAnimationCallBack = null;
        delete this.animationData;
        delete this.cavAnimation;
        delete this.options;
        delete this.timeAnimationCallBack;
    }
    private getTimeAnimationCallBack(animationType:TypeElmerAnimationType): Function {
        let resultCallBack = null;
        switch(animationType) {
            case "Linear":
                resultCallBack = MathAnimationApi.Linear;
                break;
            case "BackEaseIn":
                resultCallBack = MathAnimationApi.Back.easeIn;
                break;
            case "BackEaseInOut":
                resultCallBack = MathAnimationApi.Back.easeInOut;
                break;
            case "BackEaseOut":
                resultCallBack = MathAnimationApi.Back.easeOut;
                break;
            case "BounceEaseIn":
                resultCallBack = MathAnimationApi.Bounce.easeIn;
                break;
            case "BounceEaseInOut":
                resultCallBack = MathAnimationApi.Bounce.easeInOut;
                break;
            case "BounceEaseOut":
                resultCallBack = MathAnimationApi.Bounce.easeOut;
                break;
            case "CircleEaseIn":
                resultCallBack = MathAnimationApi.Circle.easeIn;
                break;
            case "CircleEaseInOut":
                resultCallBack = MathAnimationApi.Circle.easeInOut;
                break;
            case "CircleEaseOut":
                resultCallBack = MathAnimationApi.Circle.easeOut;
                break;
            case "CubicEaseIn":
                resultCallBack = MathAnimationApi.Cubic.easeIn;
                break;
            case "CubicEaseInOut":
                resultCallBack = MathAnimationApi.Cubic.easeInOut;
                break;
            case "CubicEaseOut":
                resultCallBack = MathAnimationApi.Cubic.easeOut;
                break;
            case "ElasticEaseIn":
                resultCallBack = MathAnimationApi.Elastic.easeIn;
                break;
            case "ElasticEaseInOut":
                resultCallBack = MathAnimationApi.Elastic.easeInOut;
                break;
            case "ElasticEaseOut":
                resultCallBack = MathAnimationApi.Elastic.easeOut;
                break;
            case "ExpoEaseIn":
                resultCallBack = MathAnimationApi.Expo.easeIn;
                break;
            case "ExpoEaseInOut":
                resultCallBack = MathAnimationApi.Expo.easeInOut;
                break;
            case "ExpoEaseOut":
                resultCallBack = MathAnimationApi.Expo.easeOut;
                break;
            case "QuadEaseIn":
                resultCallBack = MathAnimationApi.Quad.easeIn;
                break;
            case "QuadEaseInOut":
                resultCallBack = MathAnimationApi.Quad.easeInOut;
                break;
            case "QuadEaseOut":
                resultCallBack = MathAnimationApi.Quad.easeOut;
                break;
            case "QuartEaseIn":
                resultCallBack = MathAnimationApi.Quart.easeIn;
                break;
            case "QuartEaseInOut":
                resultCallBack = MathAnimationApi.Quart.easeInOut;
                break;
            case "QuartEaseOut":
                resultCallBack = MathAnimationApi.Quart.easeOut;
                break;
            case "QuintEaseIn":
                resultCallBack = MathAnimationApi.Quint.easeIn;
                break;
            case "QuintEaseInOut":
                resultCallBack = MathAnimationApi.Quint.easeInOut;
                break;
            case "QuintEaseOut":
                resultCallBack = MathAnimationApi.Quint.easeOut;
                break;
            case "SineEaseIn":
                resultCallBack = MathAnimationApi.Sine.easeIn;
                break;
            case "SineEaseInOut":
                resultCallBack = MathAnimationApi.Sine.easeInOut;
                break;
            case "SineEaseOut":
                resultCallBack = MathAnimationApi.Sine.easeOut;
                break;
        }
        return resultCallBack;
    }
    private animationCallBack(): void {
        let curTime = (new Date()).getTime();
        let offset = curTime - this.beginTime;
        if(!this.options) {
            this.stop();
        } else {
            if(offset > this.options.duration) {
                this.stop();
            } else {
                this.animationData.map((itemData:TypeElmerAnimationContext, keyIndex: number) => {
                    const itemBeginTime = itemData.beginTime || 0;
                    if(itemBeginTime <= offset && offset <= itemBeginTime + itemData.duration) {
                        if(!itemData.isBegin) {
                            itemData.isBegin = true;
                            typeof itemData.onBegin === "function" && itemData.onBegin(itemData);
                        }
                        const updateCssProperty = this.calcUpdateProperty(offset, itemData);
                        typeof this.options.onChange === "function" && this.options.onChange({
                            data: updateCssProperty,
                            dom: itemData.dom,
                            value: AnimationMethod.converAnimationProperty(updateCssProperty)
                        });
                    } else {
                        if(offset > itemBeginTime + itemData.duration) {
                            typeof itemData.onEnd === "function" && itemData.onEnd({
                                default: itemData.defaultData,
                                from: itemData.fromData,
                                to: itemData.toData,
                            });
                            delete this.animationData[keyIndex];
                        }
                    }
                });
            }
        }
        curTime = null;
        offset = null;
    }
    private calcUpdateProperty(time:number, data: TypeElmerAnimationContext): any {
        let timeAnimationCallBack = this.getTimeAnimationCallBack(data.type);
        const updateProperty = {};
        if(typeof timeAnimationCallBack === "function") {
            Object.keys(data.toData).map((cssKey:string) => {
                const defaultValue: TypeAnimationContext = data.defaultData[cssKey];
                const beginValue: TypeAnimationContext = data.fromData[cssKey] || defaultValue;
                const toValue:TypeAnimationContext = data.toData[cssKey];
                const toValueData: any[] = [];
                const beginValueData: any[] = [];
                const updateValue: any = {};
                toValueData.push(toValue.value1);
                toValueData.push(toValue.value2);
                toValueData.push(toValue.value3);
                toValueData.push(toValue.value4);
                beginValueData.push(beginValue.value1);
                beginValueData.push(beginValue.value2);
                beginValueData.push(beginValue.value3);
                beginValueData.push(beginValue.value4);
                toValueData.map((tmpValue: number|number[], index:number): void => {
                    const dataIndex = index + 1;
                    const dataKey = `value${dataIndex}`;
                    if(!isCssEmpty(tmpValue)) {
                        let beginValueNum = 0;
                        if(StaticCommon.isArray(tmpValue)) {
                            const tmpSplitValues = [];
                            tmpValue.map((tmpSplitData: number, subIndex:number): void => {
                                beginValueNum = beginValueData[index][subIndex] || 0;
                                tmpSplitValues.push(this.calcTimeAnimationResult(time, data.type, timeAnimationCallBack, {
                                    beginValue: beginValueNum,
                                    changeValue: tmpSplitData-beginValueNum,
                                    currentTime: time,
                                    duration: data.duration,
                                    optionA: data.optionA,
                                    optionP: data.optionP,
                                    optionS: data.optionS
                                }));
                            });
                            updateValue[dataKey] = tmpSplitValues;
                        } else {
                            beginValueNum = beginValueData[index] || 0;
                            updateValue[dataKey] = this.calcTimeAnimationResult(time, data.type, timeAnimationCallBack, {
                                beginValue: beginValueNum,
                                changeValue: tmpValue - beginValueNum,
                                currentTime: time,
                                duration: data.duration,
                                optionA: data.optionA,
                                optionP: data.optionP,
                                optionS: data.optionS
                            });
                        }
                        updateValue[`value${dataIndex}Unit`] = toValue[`value${dataIndex}Unit`];
                    }
                });
                updateProperty[cssKey] = updateValue;
            });
        }
        timeAnimationCallBack = null;
        return updateProperty;
    }
    private calcTimeAnimationResult(time:number,type:TypeElmerAnimationType,timeAnimationCallBack:Function, options:TypeMathApiParams): number {
        let result = 0;
        if(typeof options.beginValue === "number" &&  typeof options.changeValue === "number" && typeof options.duration === "number") {
            if (["ElasticEaseIn", "ElasticEaseInOut", "ElasticEaseOut", "BackEaseIn", "BackEaseInOut", "BackEaseOut"].indexOf(type) < 0) {
                result = timeAnimationCallBack(time, options.beginValue, options.changeValue, options.duration);
            } else {
                if (["ElasticEaseIn", "ElasticEaseInOut", "ElasticEaseOut"].indexOf(type) >= 0) {
                    result = timeAnimationCallBack(time, options.beginValue, options.changeValue, options.duration, options.optionA, options.optionP);
                } else if (["BackEaseIn", "BackEaseInOut", "BackEaseOut"].indexOf(type) >= 0) {
                    result = timeAnimationCallBack(time, options.beginValue, options.changeValue, options.duration, options.optionS);
                }
            }
        } else {
            result = undefined;
        }
        return result;
    }
}
