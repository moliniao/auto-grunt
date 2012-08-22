/*
 * 
 * 
 *
 * Copyright (c) 2012 moliniao
 * 
 * 
 */
module.exports = function(grunt) {
	var path = require("path"),
		fs = require("fs"),
		iconv = require('iconv-lite'),
		findup = require('../lib/util/findup'),
		CSSOM = require('cssom'),
		config = {};
	function readConfig(){
			var  configjs = findup(process.cwd(), 'config.js'),
				 configdir = path.join(__dirname,"../taskconfig/config.js");
			  //一层一层寻找配置信息configjs
			  if ( configjs ) {
					return grunt.file.readJSON(configjs);
			 //如果寻找不到，则使用根路径的配置信息
			  } else {
				return grunt.file.readJSON(configdir);  
	 		 }
	}
  grunt.registerMultiTask("mincss", "Minify CSS files", function() {
    var files = grunt.file.expandFiles(this.file.src),
		destmtime = (fs.existsSync(this.file.dest) && new Date(+fs.statSync(this.file.dest).mtime).getTime()),
		noNeedMin,
		taskOutput;
	//时间戳检查，如果没有合并的单个文件的时间戳小于或者等于合并的则不合并,bug,有一种方式不能判断，就是在模板中删除了一个文件
/*	noNeedMin = files.every( function(filepath){
		if( !destmtime ) return false;
		var mtime = new Date(+fs.statSync(filepath).mtime).getTime();
		return !(destmtime < mtime);
	});
	if ( noNeedMin ) return;*/
    taskOutput = grunt.helper('mincss', files, {separator: this.data.separator,dest:this.file.dest});
   // Fail task if errors were logged.
     if (this.errorCount) { return false; }
     grunt.file.write(this.file.dest, taskOutput);
  });

 grunt.registerHelper("mincss", function(files, options) {
	options = grunt.utils._.defaults(options || {}, {
      separator: grunt.utils.linefeed
    });
	var sourceCode,
		config = readConfig(),
		dest = options.dest;
    sourceCode = files ? files.map(function(filepath) {
		var contents ="",
			relative = "",
			style = "",
			rimgUrl = /url\(([^\)]+)\)/,
			imgUrl = "",
			background = "";
		if (config.encode && config.encode != "utf8"){
      	contents = iconv.decode(grunt.file.read(filepath,true),config.encode).replace(/[\u4E00-\u9FA5\uF900-\uFA2D]/g,function(str){
																										return escape(str).replace("%u","\\");	
																									});
		} else {
			contents = grunt.task.directive(filepath, grunt.file.read);
		}
		//修改合并后css中的background或者background-image的地址
		if ( config.replaceImgUrl ){
			relative = path.relative(path.resolve(path.dirname(dest)), path.resolve(path.dirname(filepath)));
			style = CSSOM.parse( contents );
			style.cssRules.forEach( function( selectorStyle ){
				background = selectorStyle.style["background"] || selectorStyle.style["background-image"];
				imgUrl = ( background && background.match(rimgUrl) ); 
				
				//如果是绝对路径不替换,并且去掉引号
				if( imgUrl && imgUrl[1] && (imgUrl[1] = imgUrl[1].replace(/^["']+|["']+$/g,"") )&& !grunt.file.isPathAbsolute(imgUrl[1]) ){
					background = background.replace(rimgUrl,function(allS,url){
																return "url(" + path.join(relative,url.trim().replace(/^["']+|["']+$/g,"")).split("\\").join("\/") + ")"
															});	
					if( selectorStyle.style["background"] ){
						selectorStyle.style["background"] = background;	
					}
					if ( selectorStyle.style["background-image"] ) {
						selectorStyle.style["background-image"] = background;
					}
				}
			})
			return style.toString();;
		} else {
			return contents;	
		}
    }).join(grunt.utils.normalizelf(options.separator)) : '';
    try {
      return require("clean-css").process(sourceCode);
    } catch (e) {
      grunt.log.error(e);
      grunt.fail.warn("css minification failed.");
    }
  });
};