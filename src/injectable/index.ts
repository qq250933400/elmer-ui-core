import { createClassFactory, TypeAutowiredOptions  } from "./createClassFactory";

export const autoInit = createClassFactory;
export type TypeAutowiredOption = TypeAutowiredOptions;

export * from "./injectable";
export default {
    title: "Injectable",
    version: "1.0.1"
};
