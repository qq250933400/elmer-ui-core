import { Autowired as DCAutowired } from "./Autowired";
import { loadComponents as DCloadComponents } from "./loadComponents";
import { Model as DCModel } from "./Model";
import { Service as DCService } from "./Service";

export const Autowired = DCAutowired;
export const loadComponents = DCloadComponents;
export const Model = DCModel;
export const Service = DCService;

export default {
    Autowired: DCAutowired,
    Model: DCModel,
    Service: DCService,
    loadComponents: DCloadComponents,
};
