import { createContext } from "../../context";

export const RouterContext = createContext("RouterStore", {
    listeners: {},
    location: "",
    type: "browser"
});
