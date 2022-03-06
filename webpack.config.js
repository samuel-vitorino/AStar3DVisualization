 const path = require('path');
 const HtmlWebpackPlugin = require('html-webpack-plugin');

 module.exports = {
   mode: 'development',
   entry: {
     index: './src/main.js',
   },
   devtool: 'inline-source-map',
   devServer: {
     static: './dist',
   },
   plugins: [
     new HtmlWebpackPlugin({
       title: 'Development',
       template: './src/index.html',
     }),
   ],
   output: {
     filename: '[name].bundle.js',
     path: path.resolve(__dirname, 'dist'),
     clean: true,
   },
   module: {
     rules: [
        {
			test: /\.(png|svg|jpg|jpeg|gif|fbx)$/i,
			type: 'asset/resource',
      	},
        {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
        },
     ],
   }
 };
