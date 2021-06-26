import { Autowired as DCAutowired } from "./Autowired";
import { loadComponents as DCloadComponents } from "./loadComponents";
import { Model as DCModel } from "./Model";
import { Plugin as DCPlugin } from "./Plugin";
import { Service as DCService } from "./Service";

export const Autowired = DCAutowired;
export const loadComponents = DCloadComponents;
export const Model = DCModel;
export const Service = DCService;
export const Plugin = DCPlugin;

export default {
    Autowired: DCAutowired,
    Model: DCModel,
    Plugin: DCPlugin,
    Service: DCService,
    loadComponents: DCloadComponents,
};
