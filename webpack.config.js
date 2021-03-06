
const path = require('path');
const webpack = require('webpack');
const ClosureCompilerPlugin = require('webpack-closure-compiler');

module.exports = {
    context: path.resolve(__dirname, 'src'),

    entry: {
        console: './webconsole/index.ts'
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/',
        filename: '[name].js',
        chunkFilename: '[id].[hash].chunk.js'
    },

    resolve: {
        extensions: ['.ts', '.js']
    },

    module: {
        rules: [
            {
                test: /\.ts$/,
                loaders: [
                    {
                        loader: 'awesome-typescript-loader',
                        options: {
                            configFileName: 'tsconfig.json',
                            useBabel: true,
                            useCache: true,
                            babelOptions: {
                                "presets": ["es2015"]
                            }
                        }
                    },
                ]
            }
        ]
    },

    plugins: [
        // new ClosureCompilerPlugin({
        //     compiler: {
        //         language_in: 'ECMASCRIPT6',
        //         language_out: 'ECMASCRIPT5_STRICT',
        //         // compilation_level: 'ADVANCED',
        //         compilation_level: 'SIMPLE_OPTIMIZATIONS',
        //         assume_function_wrapper: true,
        //         output_wrapper: '(function(){\n%output%\n}).call(this)\n',
        //     },
        //     concurrency: 3,
        // })
    ]
};