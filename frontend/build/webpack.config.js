/* eslint-disable indent */
const webpack = require('webpack')
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const I18nPlugin = require('i18n-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const resolve = (...paths) => path.resolve(__dirname, '..', ...paths)

const packageInfo = require(resolve('package.json'))

const information = {
    name: packageInfo.name,
    description: packageInfo.description,
    version: packageInfo.version,
    author: packageInfo.author,
    meta: Object.assign({}, packageInfo.meta || {})
}

const OUTPUT_DIR = 'dist'
const ASSET_DIR = 'assets'

const LAZY_LOADED_LIBS = packageInfo.lazyLoadedDependencies

const LANGS = {}

const langs = process.env.LANGS || ''
if (langs !== '') {
    langs.split(',').forEach(item => {
        if (item !== '') {
            let parts = item.split('=')
            let id = parts[0]
            LANGS[id] = (parts[1] === '0') ? null : require(resolve(`src/langs/${id}.json`))
        }
    })
}

const nodeModulesPattern = new RegExp(LAZY_LOADED_LIBS.reduce((pattern, lib, index) => {
    if (index === 0) {
        pattern += `(?!\\/${lib}`
    } else {
        pattern += `|${lib}`
    }
    if (index === LAZY_LOADED_LIBS.length - 1) {
        pattern += ')'
    }
    return pattern
}, 'node_modules'))

let configFunc = (env, lang) => {
    const optProduction = env.target === 'production'
    const optLint = env.lint

    // override from webpack's argument if not set
    if (optProduction && process.env.NODE_ENV !== 'production') {
        process.env.NODE_ENV = 'production'
    }

    const mountId = 'app'

    const PATHS = {
        root: __dirname,
        index: resolve('src/main.js'),
        buildRoot: resolve(OUTPUT_DIR),
        build: resolve(OUTPUT_DIR, lang)
    }

    let defineOptions = {
        PRODUCTION: optProduction,
        MOUNT_ID: JSON.stringify(mountId),
        LANGS: JSON.stringify(Object.keys(LANGS)),
        LANG: JSON.stringify(lang),
        INFORMATION: JSON.stringify(information),
        'process.env': {
            NODE_ENV: '"production"'
        }
    }

    if (optProduction) {
        defineOptions['process.env.NODE_ENV'] = "'production'"
    }

    const plugins = [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: optProduction ? '[name].[chunkhash].css' : '[name].css'
        }),
        new webpack.DefinePlugin(defineOptions),
        new I18nPlugin(LANGS[lang])
    ]

    if (optProduction) {
        plugins.push(new OptimizeCssAssetsPlugin({
            assetNameRegExp: /\.css$/g,
            cssProcessor: require('cssnano'),
            cssProcessorOptions: {
                discardComments: {
                    removeAll: true
                }
            },
            canPrint: false
        }))
    }

    plugins.push(new CleanWebpackPlugin({
        cleanStaleWebpackAssets: false,
        cleanOnceBeforeBuildPatterns: [`${PATHS.buildRoot}/**/*`],
        verbose: true
    }))

    plugins.push(new CopyWebpackPlugin([
        {
            from: resolve('manifest.xml'),
            to: resolve(PATHS.build, 'manifest.xml')
        },
        {
            from: resolve('src', ASSET_DIR, 'images/icon-16.png'),
            to: resolve(PATHS.build, ASSET_DIR, 'images/icon-16.png')
        },
        {
            from: resolve('src', ASSET_DIR, 'images/icon-32.png'),
            to: resolve(PATHS.build, ASSET_DIR, 'images/icon-32.png')
        },
        {
            from: resolve('src', ASSET_DIR, 'images/icon-80.png'),
            to: resolve(PATHS.build, ASSET_DIR, 'images/icon-80.png')
        },
        {
            from: resolve('src', ASSET_DIR, 'images/logo-filled.png'),
            to: resolve(PATHS.build, ASSET_DIR, 'images/logo-filled.png')
        },
        {
            from: resolve('src', ASSET_DIR, 'images/logo.png'),
            to: resolve(PATHS.build, ASSET_DIR, 'images/logo.png')
        }
    ]))

    let langPrefix = (lang === '') ? '' : ('/' + lang)

    plugins.push(new HtmlWebpackPlugin({
        title: information.description,
        template: resolve('src/index.html'),
        filename: resolve(PATHS.build, 'index.html'),
        inject: false,
        langPrefix: langPrefix,
        currentLanguage: lang || '',
        mobile: true,
        mountId: mountId,
        minify: {
            removeComments: true,
            collapseWhitespace: optProduction,
            removeAttributeQuotes: optProduction
        },
        chunksSortMode: 'none'
    }))

    let minimizers = []
    if (optProduction) {
        minimizers.push(
            new UglifyJsPlugin({
                cache: true,
                parallel: true,
                sourceMap: true,
                uglifyOptions: {
                    output: {
                        comments: false
                    },
                    compress: {
                        drop_console: true,
                        dead_code: true,
                        drop_debugger: true
                    },
                    warnings: false
                }
            })
        )
    }

    let rules = [
        {
            test: /\.vue$/,
            loader: 'vue-loader'
        },
        {
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: nodeModulesPattern,
            options: {
                compact: true
            }
        },
        {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
            exclude: /node_modules/
        },
        {
            test: /\.(woff|woff2|eot|ttf)$/,
            loader: 'url-loader?limit=100000'
        },
        {
            test: /\.(?:png|jpg|svg|webp)$/,
            loader: 'file-loader',
            options: {
                name: 'images/[hash].[ext]'
            }
        }
    ]

    if (optLint) {
        rules.unshift({
            enforce: 'pre',
            test: /\.(js|vue)$/,
            exclude: /(node_modules|assets)/,
            loader: 'eslint-loader',
            options: {
                formatter: require('eslint-friendly-formatter'),
                fix: true
            }
        })
    }

    return {
        mode: optProduction ? 'production' : 'development',
        entry: {
            app: PATHS.index
        },
        optimization: {
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: nodeModulesPattern,
                        name: 'vendor',
                        chunks: 'all'
                    },
                    default: {
                        reuseExistingChunk: true
                    }
                }
            },
            minimizer: minimizers
        },
        output: {
            filename: optProduction ? '[name].[chunkhash].js' : '[name].js',
            path: resolve(PATHS.build, ASSET_DIR),
            publicPath: (lang === '') ? `/${ASSET_DIR}/` : `/${lang}/${ASSET_DIR}/`
        },
        plugins: plugins,
        resolve: {
            extensions: ['.js', '.vue', '.css'],
            alias: {
                '~': resolve('src'),
                '@': resolve('src/modules')
            }
        },
        module: {
            rules: rules
        }
    }
}

module.exports = function (env) {
    const langSupports = Object.keys(LANGS)
    if (langSupports.length > 0) {
        return langSupports.map((lang) => {
            return configFunc(env, lang)
        })
    } else {
        return configFunc(env, '')
    }
}
