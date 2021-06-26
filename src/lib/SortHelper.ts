import { Service } from "../decorators/Service";
import utils from "./utils";

type TypeSortOptions = {
    compareFn?: Function;
    compareValueKey?: string;
};

export enum EnumSortCompare {
    LESS_THAN = -1,
    BIGGER_THAN = 1,
    EQUALS = 0
}

@Service
export class SortHelper {
    bubbleSort(sortData: any[], compareOptions?: TypeSortOptions): void {
        // 获取数组长度
        const { length } = sortData;
        for (let i = 0; i < length; i++) {
            // 从数组的0号元素遍历到数组的倒数第2号元素，然后减去外层已经遍历的轮数
            for (let j = 0; j < length - 1 - i; j++) {
                // 如果j > j + 1位置的元素就交换他们两个元素的位置
                if (this.compare(sortData[j], sortData[j + 1], compareOptions?.compareValueKey, compareOptions?.compareFn) === EnumSortCompare.BIGGER_THAN) {
                    this.swap(sortData, j, j + 1);
                }
            }
        }
    }
    /**
     * 选择排序算法
     * @param sortData - 排序数据
     * @param compareOptions - [可选]排序参数
     */
    selectionSort(sortData: any[], compareOptions?: TypeSortOptions): void {
        const len = sortData.length;
        let minIndex = 0;
        for(let i=0;i<len;i++) {
            minIndex = i;
            for(let j=i;j<len;j++) {
                if(this.compare(sortData[minIndex], sortData[j], compareOptions?.compareValueKey, compareOptions?.compareFn) === EnumSortCompare.BIGGER_THAN) {
                    minIndex = j;
                }
            }
            if(minIndex !== i) {
                this.swap(sortData, i, minIndex);
            }
        }
    }
    /**
     * 自定数组两个元素互相交换位置
     * @param sortData - 排序数组
     * @param index - 第一个交换元素
     * @param nextIndex - 第二个交换元素
     */
    private swap(sortData: any[], index: number, nextIndex: number): void {
        const tmpData = sortData[index];
        sortData[index] = sortData[nextIndex];
        sortData[nextIndex] = tmpData;
    }
    /**
     * 比较两个变量大小，可使用两个对象中的指定字段做比较
     * @param a - 比较变量A
     * @param b - 比较变量B
     * @param compareValueKey - [可选]比较字段索引
     * @param compareCallback - [可选]自定义比较方法
     * @returns - 返回比较结果
     */
    private compare<T>(a: T, b:T, compareValueKey?: string, compareCallback?: Function): EnumSortCompare {
        if(utils.isEmpty(compareValueKey)) {
            if(typeof compareCallback === "function") {
                return compareCallback(a, b);
            } else {
                if(a === b) {
                    return EnumSortCompare.EQUALS;
                } else if(a > b) { 
                    return EnumSortCompare.BIGGER_THAN;
                } else {
                    return EnumSortCompare.LESS_THAN;
                }
            }
        } else {
            const compareA = utils.getValue(a as any, compareValueKey);
            const compareB = utils.getValue(b as any, compareValueKey);
            if(typeof compareCallback === "function") {
                return compareCallback(compareA, compareB);
            } else {
                if(compareA === compareB) {
                    return EnumSortCompare.EQUALS;
                } else if(compareA > compareB) {
                    return EnumSortCompare.BIGGER_THAN;
                } else {
                    return EnumSortCompare.LESS_THAN;
                }
            }
        }
    }
}
