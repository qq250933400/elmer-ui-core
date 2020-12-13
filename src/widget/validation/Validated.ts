import { UseValidation, ValidateErrorOptions, ValidationComponent } from "elmer-validation";
import { declareComponent, IPropCheckRule, propTypes } from "../../index";
import { EComponent } from "../../component/EComponent";

@UseValidation({
    sectionId: "AutoValidation"
})
@declareComponent({
    selector: "validated"
})
export class Validated extends EComponent {
    static propTypes: any = {
        options:  <IPropCheckRule> {
            description: "IValidatorOptions, 验证扩展参数",
            rule: propTypes.object
        },
        sectionId: <IPropCheckRule> {
            description: "挂载section_Id",
            rule: propTypes.string.isRequired
        },
        tagName: <IPropCheckRule> {
            description: "批量验证标识",
            rule: propTypes.string
        },
        theme: <IPropCheckRule> {
            description: "自定义样式",
            rule: propTypes.string
        },
        validateId: <IPropCheckRule> {
            description: "注册验证Id",
            rule: propTypes.string.isRequired
        },
        validateType: <IPropCheckRule> {
            description: "ValidatorNames",
            rule: propTypes.string.isRequired
        },
        value: <IPropCheckRule> {
            description: "验证的值",
            rule: propTypes.any.isRequired
        }
    };
    isFirstInit: boolean = true;
    state: any = {
        errorCode:  "",
        message: "",
        pass: true,
        theme: "",
    };
    props: any;
    $init(): void {
        if(!this.isEmpty(this.props.sectionId)) {
            // 重新定义当前Validated section
            delete (<any>this).validateParams["sectionId"];
            Object.defineProperty((<any>this).validateParams, "sectionId", {
                configurable: false,
                enumerable: false,
                value: this.props.sectionId,
                writable: false,
            });
        }
        if(!this.isEmpty(this.props.theme)) {
            this.state.theme = this.props.theme;
        }
        let sender:ValidationComponent<Validated> = <any>this;
        // tslint:disable-next-line: no-inferred-empty-object-type
        sender.registe({
            dataKey: "props.value",
            sectionId: sender.validateParams.sectionId,
            tagName: this.props.tagName,
            validateId: this.props.validateId,
            validateType: this.props.validateType
        });
        if(!this.isEmpty(this.props.value)) {
            sender.validate(this.props.validateId, this.props.value, this.props.options);
        }
        sender = null;
    }
    $dispose(): void {
        let sender:ValidationComponent<Validated> = <any>this;
        sender.unRegiste(sender.validateParams.sectionId, this.props.validateId);
        sender = null;
    }
    $after(): void {
        if(this.isFirstInit) {
            this.isFirstInit = false;
            let sender:ValidationComponent<Validated> = <any>this;
            sender.validate(this.props.validateId, this.props.value, this.props.options);
            sender = null;
        }
    }
    $onPropsChanged(newProps:any): void {
        let sender:ValidationComponent<Validated> = <any>this;
        if(!this.isEmpty(newProps.theme) && newProps.theme !== this.state.theme) {
            this.state.theme = newProps.theme;
        }
        if(sender.validate(this.props.validateId, newProps.value, newProps.options)) {
            this.setState({
                errorCode:  "",
                message: "",
                pass: true
            });
        }
        sender = null;
    }
    onValidationError(errorCode: string, message: string, options:ValidateErrorOptions):void {
        let sender:ValidationComponent<Validated> = <any>this;
        if(options.sectionId === sender.validateParams.sectionId && options.validateId === this.props.validateId) {
            this.setState({
                errorCode,
                message,
                pass: false
            });
        }
        sender = null;
    }
    render(): string {
        return require("./views/validated.html");
    }
}
