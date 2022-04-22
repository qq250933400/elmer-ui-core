var autoprefixer = require("autoprefixer");

module.exports = {
    plugins: [
        autoprefixer({
            Browserslist: ["last 5 version"]
        })
    ]
};