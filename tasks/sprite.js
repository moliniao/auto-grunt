/*
 * 
 * 
 *
 * 
 * .moliniao
 *
 */

module.exports = function(grunt) {

  // External libs.
  var path = require('path'),
	  sprite = require('../lib/grunt/sprite'),
	  findup = require('../lib/util/findup');
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
  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerMultiTask('sprite', 'merge image and modify css', function() {
	  //修改已经合并的css
	  var cssFile = grunt.config()["mincss"],
	  	  spritecss = [],
		  config = readConfig();
	  Object.keys(cssFile).forEach(function( css ){
		  spritecss.push(cssFile[css]["dest"]);
	  })
	  if (spritecss.length === 0){
		  	return;
	  }
	  var taskDone = this.async();
	  //生成sass的根路径,默认是css所在的目录
	  sprite.initEnv( grunt, spritecss, config, taskDone);
	  sprite.merge();

  });
    grunt.registerHelper('sprite',function(){
		
	});
};
