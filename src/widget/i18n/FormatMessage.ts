import { useCallback, useState } from "../../hooks";
import { autoInit } from "../../injectable";
import { PropTypes } from "../../propsValidation";
import { I18nService } from "./I18nService";
import { withI18n } from "./withI18n";

const FuncFormatMessage = (props:any) => {
    const { className, lngId, getI18n, value } = props;
    useState("className", className || "");
    useCallback((newValue:any) => {
        const text = getI18n(lngId);
        const serviceObj: I18nService = autoInit(I18nService);
        const translateResult = serviceObj.translate(text, {
            data: newValue
        }) || lngId;
        return translateResult;
    }, { name: "formatText", args: [ value ], event: true});
    return `<span class="{{props.className}}">{{formatText(props.lngId)}}</span>`;
};

FuncFormatMessage.propTypes = {
    lngId: {
        description: "指定文本ID",
        rule: PropTypes.string.isRequired
    },
    value: {
        defaultValue: {},
        description: "需要替换的值",
        rule: PropTypes.object
    }
};

export const FormatMessage = withI18n({
    id: "FormatMessage"
})(FuncFormatMessage);
