const { resolve, join } = require("path")

module.exports = {
    mode: "development",
    entry: "./src/client/index.tsx",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
            },
        ],
    },
    output: {
        path: resolve(__dirname, "dist/client"),
        filename: "bundle.js",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    devServer: {
        static: {
            directory: join(__dirname, "dist/client/"),
        },
    },
}
