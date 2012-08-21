/*
 * 
 * 
 *
 * Copyright (c) 2012 moliniao
 * 
 * 
 */
 //初始化grunt
var taskConfig,
	changedFile = [],
	path = require("path"),
	fs = require("fs"),
	iconv = require('iconv-lite'),
	findup = require('../lib/util/findup');
	//逃逸正则中的关键字，并且合并分隔符
   function escapeRex( limiter ){
	   //逃逸正则中的关键字
	   	limiter = limiter.map( function( lim ){
						return lim.replace(/([\^\$.*+?=!:|\\/()\[\]{}])/g,"\\$1");
				  })
		 return "(?:" + limiter.join("|") + ")";
   }
module.exports = function(grunt) {
 var userJson = {
		 //寻找配置的json路径,默认条件需要与与grunt一样的路径,如果寻找不到配置json则生成一个
		findPath: function(){
			 var json = findup(process.cwd(), taskConfig.jsonName);
			 return json;
		},
		init: function(){
			var jsonInitContent = {minjs:{},watch:{},mincss:{}};
			return jsonInitContent;
		},
		//读json文件，返回json对象
		read: function(){
			if ( this.findPath() ) {
				return grunt.file.readJSON( this.findPath() );
			}
			return null
		},
		update: function(configJson,targetName,src,des){
			if ( this.findPath() ){
				  var watchmin, allpath, dest;
				  //如果设置了根路径
				  allpath = src.map( function( val ){
					  if( !grunt.file.isPathAbsolute( val ) ) {
						return path.join(resourceRoot,val);
					  } else {
						return val  
					  }
				  })
				  dest = grunt.file.isPathAbsolute( des ) ? des : path.join(resourceRoot,des);
			//js压缩
					if ( path.extname(targetName).toLowerCase()  === ".js"){
						watchmin = "minjs"
						//同步min
						configJson[watchmin][targetName]= {
						   src:	allpath,
						   dest: dest 
						};
					} else if ( path.extname(targetName).toLowerCase()  === ".css"){
						watchmin = "mincss";
						//同步min
						configJson[watchmin][targetName]= {
						   src:	allpath,
						   dest: dest 
						};
				   }
				if( watchmin ) {
					//同步监控列表
					configJson["watch"][targetName]= {
					   files:allpath,
					   tasks:watchmin 
					}
				}
				return targetName;
			}
		},
		watchFile: function(){
				  //以grunt.js所在的目录为根路径
	  		var rootdir = path.join( gruntJs.path, "../"),
				jsonCon = this.read();
			 if ( taskConfig.autoWriteCon && jsonCon ) {
			 //调用监控
				 jsonCon["watch"]["files"] = taskConfig.watchFileExt.map(function(fileType){
												return "**/*"+ fileType;
											 });
				 jsonCon["watch"]["tasks"] = "watchsmarty";
				 grunt.file.write( this.findPath(),JSON.stringify(jsonCon));
			 }
		},
		//仅仅在没有用户配置的情况下产生
		generate:function(){
			var jsonPath = this.findPath();
			if( !jsonPath ){
				jsonPath = path.join(gruntJs.init(),"../", taskConfig.jsonName);
				if ( !path.existsSync(jsonPath) ){
		   			grunt.file.write( jsonPath, JSON.stringify( this.init() ) );
				}
			}
			//自动初始化
			if ( !taskConfig.autoInit ){
				grunt.task.run("watchsmarty");
		    }
			return jsonPath;
		}
	},
	gruntJs = {
		initContent: function(){
			var initC =  "module.exports = function(grunt) {grunt.initConfig({pkg:'<json:package.json>',concat: '<%= pkg.concat%>',minjs: '<%= pkg.minjs%>',watchsmarty:{task:true},mincss:'<%= pkg.mincss%>',min:'<%= pkg.min%>',watch:'<%= pkg.watch%>',sprite:{task:true},jshint:{options:{curly:true,eqeqeq: true,immed: true,latedef: true,newcap: true,noarg: true,sub: true,undef: true,boss: true,eqnull: true,browser: true}},uglify: {}}); grunt.registerTask('default', 'watchsmarty');};";
			return initC;	
		},
		init: function(){
			 var gruntdir = findup(process.cwd(), 'grunt.js');
			//如果没有找到grunt.js,则在当前目录生成
			gruntdir = gruntdir || path.join(process.cwd(),'grunt.js') 
			if ( !path.existsSync( gruntdir ) ){
				 grunt.file.write( gruntdir, this.initContent() );
			}
			return gruntdir;
		},
		reload: function(){
			 var fn = require(this.init());
			  if (typeof fn === 'function') {
					fn.call(grunt, grunt); 
			  }
		}
	},
	sysConfig = {
		initContent: function(){
			var sys = {leftdelimter:["<%*"],rightdelimter:["*%>"],jsonName:"package.json",autoInit:false,watchFileExt:[".tpl"],resourceRoot:"","autoWriteCon":true,"encode":"utf8","replaceImgUrl":false};
			return sys;
		},
		init: function(){
			var  configjs = findup(process.cwd(), 'config.js'),
				 configdir = path.join(__dirname,"../taskconfig/config.js");
			  //一层一层寻找配置信息configjs
			  if ( configjs ) {
					taskConfig = grunt.file.readJSON(configjs);
					return ;
			 //如果寻找不到，则使用根路径的配置信息
			  } else {
				if( !path.existsSync( configdir ) ) {
					grunt.file.write( configdir, JSON.stringify( this.initContent() ));
				}
				taskConfig = grunt.file.readJSON(configdir);  
			 }
		}
	};
  sysConfig.init();
 var leftDel = escapeRex(taskConfig.leftdelimter),
 	 rightDel = escapeRex(taskConfig.rightdelimter),
	 rex = new RegExp(leftDel+ "((?:.|\n|\r)+?)" + rightDel+"((?:.|\n|\r)*)","g"),
	 //需要提取标签的属性值
	 tagAttr = {"script":["src","des"],"link":["href","des"]},
	 mustVal = {"script":"src","link":"href"},
	 tagsuffix = {"script":".js","link":".css"}
	 resourceRoot = taskConfig.resourceRoot,
	 isrewrite = false,
	 mtimes = {};
  grunt.registerMultiTask('watchsmarty', 'watchsmarty css js files.', function() {
  		var tplsName =  changedFile,
			//tplTxt =  grunt.file.read( path.join( tplName ) ),
			//读取配置文件的配置信息
			jsonCon = userJson.read(),
			m,
			//soFar =  tplTxt,
			isWriteCon = false,
			targets = [];
			//是否自动监控模板注释中的
		if ( !taskConfig.autoWriteCon ) {return;}
		if ( !isrewrite ) {
			isrewrite = true;
			//重写json读写方法，因为原来的方法会cachejson的配置
			  grunt.registerHelper('json', function(filepath) {
				// Don't re-fetch if being called as a directive and JSON is already cached.
				 return  grunt.file.readJSON(filepath);
			  });
			  grunt.registerTask('watch', 'Run predefined tasks whenever watched files change.', function(target) {
					this.requiresConfig('watch');
					// Build an array of files/tasks objects.
					//从配置文件grunt.js中获取监控文件列表和对相应的监控文件做的监控操作。并格式化watch的任务配置，格式为watch:{"watchtask1":{"files":[],"tasks":"concat min"},"watchtask2":{"files":[],"tasks":"concat min"}}
					var watch = grunt.config('watch');
					var targets = target ? [target] : Object.keys(watch).filter(function(key) {
					  return typeof watch[key] !== 'string' && !Array.isArray(watch[key]);
					});
					
					targets = targets.map(function(target) {
					  // Fail if any required config properties have been omitted.
					  target = ['watch', target];
					  this.requiresConfig(target.concat('files'), target.concat('tasks'));
					  return grunt.config(target);
					}, this);
				  //使得任务可以没有名称（缺省）watch:{"files":[],"tasks":"concat min"}
					// Allow "basic" non-target format.
					if (typeof watch.files === 'string' || Array.isArray(watch.files)) {
					  targets.push({files: watch.files, tasks: watch.tasks});
					}
					//grunt.log.write('Waiting...');
				
					// This task is asynchronous.
					var taskDone = this.async();
					// Get a list of files to be watched.需要监控的所有文件列表，集成为一个数组["watchtask1","watchtask2",...]
					var patterns = grunt.utils._.chain(targets).pluck('files').flatten().uniq().value();
					//扩展监控的所有文件路径为完整的路径，实际它也是监控列表，只是它是完整的文件路径而已
					var getFiles = grunt.file.expandFiles.bind(grunt.file, patterns);
					// The tasks to be run.
					var tasks = []; //grunt.config(tasksProp);
					// This task's name + optional args, in string format.
					var nameArgs = this.nameArgs;
					// An ID by which the setInterval can be canceled.
					var intervalId;
					// Files that are being watched.
					var watchedFiles = {};
					// File changes to be logged.
					var changedFiles = {};
				
					// Define an alternate fail "warn" behavior.
					grunt.fail.warnAlternate = function() {
					  grunt.task.clearQueue({untilMarker: true}).run(nameArgs);
					};
				
					// Cleanup when files have changed. This is debounced to handle situations
					// where editors save multiple files "simultaneously" and should wait until
					// all the files are saved.
					var done = grunt.utils._.debounce(function() {
					  // Clear the files-added setInterval.
					  clearInterval(intervalId);
					  // Ok!
					  grunt.log.ok();
					  var fileArray = Object.keys(changedFiles);
					  fileArray.forEach(function(filepath) {
						// Log which file has changed, and how.
						grunt.log.ok('File "' + filepath + '" ' + changedFiles[filepath] + '.');
						// Clear the modified file's cached require data.
						grunt.file.clearRequireCache(filepath);
					  });
					  // Unwatch all watched files.
					  Object.keys(watchedFiles).forEach(unWatchFile);
					  // For each specified target, test to see if any files matching that
					  // target's file patterns were modified.
					  targets.forEach(function(target) {
						var files = grunt.file.expandFiles(target.files);
						var intersection = grunt.utils._.intersection(fileArray, files);
						// Enqueue specified tasks if a matching file was found.
						if (intersection.length > 0 && target.tasks) {
							intersection.forEach(function(file){
								if( taskConfig.watchFileExt.indexOf(path.extname(file).toLowerCase()) > -1) {
									changedFile.push(file);
								}
							})
						  grunt.task.run(target.tasks).mark();
						}
					  });
					  // Enqueue the watch task, so that it loops.
					  grunt.task.run(nameArgs);
					  // Continue task queue.
					  taskDone();
					}, 250);
				
					// Handle file changes.
					function fileChanged(status, filepath) {
						//如果文件是删除或者新添加也算是changed
					  // If file was deleted and then re-added, consider it changed.
					  if (changedFiles[filepath] === 'deleted' && status === 'added') {
						status = 'changed';
					  }
					  // Keep track of changed status for later.
					  changedFiles[filepath] = status;
					  // Execute debounced done function.文件改变的处理函数
					  done();
					}
				
					// Watch a file.
					function watchFile(filepath) {
					  if (!watchedFiles[filepath]) {
						// Watch this file for changes. This probably won't scale to hundreds of
						// files.. but I bet someone will try it!
						//支持watch方法的，
						try{
							watchedFiles[filepath] = fs.watch(filepath, function(event) {
							  var mtime;
							  // Has the file been deleted?
							  var deleted = !path.existsSync(filepath);
							  //监控的文件已经被删除的情况，可以立即解除监控事件
							  if (deleted) {
								// If file was deleted, stop watching file.
								unWatchFile(filepath);
								// Remove from mtimes.
								delete mtimes[filepath];
							  } else {
								// Get last modified time of file.
								mtime = +fs.statSync(filepath).mtime;
								// If same as stored mtime, the file hasn't changed.文件没有发生变化的情况
								if (mtime === mtimes[filepath]) { return; }
								// Otherwise it has, store mtime for later use.
								mtimes[filepath] = mtime;
							  }
							  // Call "change" for this file, setting status appropriately (rename ->
							  // renamed, change -> changed).
							  fileChanged(deleted ? 'deleted' : event + 'd', filepath);
							});
						} 
						//不支持watch方法的
						catch(err){
							watchedFiles[filepath] = fs.watchFile(filepath, function(event) {
							  var mtime;
							  // Has the file been deleted?
							  var deleted = !path.existsSync(filepath);
							  //监控的文件已经被删除的情况，可以立即解除监控事件
							  if (deleted) {
								// If file was deleted, stop watching file.
								unWatchFile(filepath);
								// Remove from mtimes.
								delete mtimes[filepath];
							  } else {
								// Get last modified time of file.
								mtime = +fs.statSync(filepath).mtime;
								// If same as stored mtime, the file hasn't changed.文件没有发生变化的情况
								if (mtime === mtimes[filepath]) { return; }
								// Otherwise it has, store mtime for later use.
								mtimes[filepath] = mtime;
							  }
							  // Call "change" for this file, setting status appropriately (rename ->
							  // renamed, change -> changed).
							  fileChanged(deleted ? 'deleted' : event + 'd', filepath);
							});
						}
					  }
					}
				  //解除文件的修改监控事件
					// Unwatch a file.
					function unWatchFile(filepath) {
					  if (watchedFiles[filepath]) {
						// Close watcher.
						try{
							watchedFiles[filepath].close();
						} 
						catch(err){
							fs.unwatchFile(filepath);
						}
						// Remove from watched files.
						delete watchedFiles[filepath];
					  }
					}
					//把所有的监控文件绑定修改时间作监控
					// Watch all currently existing files for changes.
					getFiles().forEach(watchFile);
				
					// Watch for files to be added.定时监控目录下时候有新添加的文件，如果没有在监控列表中也需要添加进去
					intervalId = setInterval(function() {
					  // Files that have been added since last interval execution.
					  var added = grunt.utils._.difference(getFiles(), Object.keys(watchedFiles));
					  added.forEach(function(filepath) {
						// This file has been added.
						fileChanged('added', filepath);
						// Watch this file.
						watchFile(filepath);
					  });
					}, 200);
				  });
			  //寻找需要检测的模板,默认是grunt同目录下面的所有tpl
			  userJson.watchFile();
			  //设置了autoInit,则只运行一次运行run任务
			  if (!taskConfig.autoInit){
			  	grunt.task.run("watch");
			  }
		}
		//自动提取目录下的所有模板的静态资源，不管模板是否改变
		if ( taskConfig.autoInit ){
			tplsName = grunt.file.expandFiles(taskConfig.watchFileExt.map(function(fileType){
												return "**/*"+ fileType;
										   }));
			tplsName = tplsName;
		}
		//重写concat方法，因为原来的方法不支持编码转换,
		//使用正则提取tpl中的js,css的src（注意必须要在注释中，一个注释块为一个合并单位）
		changedFile = tplsName.filter(function(val){
									return !!val;
								})
								.map( function(tplName){
									var soFar = grunt.file.read(  path.join(tplName) ),
										targets = [],
										needRunTarget=[];
										//提取每一个注释块[{"des1":[src1,src2,src3,...],"des2":[src1,src2,...]},{"des3":[href1,href2,...],"des4":[href1,href2,...]}]
									do{
										rex.exec("");
										m = rex.exec(soFar);
										if ( m ) {
											soFar = m[2];
											//每个注释块为单位合并里面的css,js
											if ( m[1] ) {
												//获取target对象
												targets.push.apply(targets,grunt.helper('watchsmarty',{block:m[1],talName:tplName}));
											}	
										}
									} while(m);

									//对每一个注释块的内容进行合并和压缩
									targets.forEach( function(target){
										Object.keys( target ).forEach( function(dTargetName){
											//任务的名称格式是模板路径+输出的目标文件名称
											var targetName = tplName + "#" + dTargetName,
												minName ;
												if ( path.extname(targetName).toLowerCase()  === ".css") {
													minName = "mincss"
												} else if ( path.extname(targetName).toLowerCase()  === ".js" ) {
													minName = "minjs";
												}
											if ( minName ) {
												//配置文件中的任务对象
													conTarget = jsonCon[minName][targetName];
												//任务信息未曾写入配置信息的情况，一定是新的，直接写入
												if ( !conTarget ) {
													//同步监控列表
													needRunTarget.push( userJson.update(jsonCon,targetName,target[dTargetName],dTargetName) );
													return;
												}
												//模板的任务配置信息与配置文件的配置信息不一致的情况也需要写入
												if ( conTarget["src"].join("") != target[dTargetName].join("") || conTarget["dest"] != dTargetName) {
													//重新更新配置信息
													needRunTarget.push( userJson.update(jsonCon,targetName,target[dTargetName],dTargetName) );
													return;	
												}
												//必须对所有资源进行压缩和合并的
												if( taskConfig.autoInit ){
													needRunTarget.push(targetName);
												}

										  }
										});
										//删除已经修改的模板
										//grunt.task.changedTpl.splice(key,1);
									});
										if (needRunTarget.length > 0) {
											//写入配置信息
											grunt.file.write( userJson.findPath(),JSON.stringify(jsonCon));
											//更新配置
											gruntJs.reload();
											grunt.utils._.uniq(needRunTarget).forEach(function( targetName ){
												//grunt.task.run( "concat:" + targetName );
												//css不压缩只合并
												if ( path.extname(targetName).toLowerCase()  === ".js"){
													grunt.task.run( "minjs:" + targetName );
												} else if (path.extname(targetName).toLowerCase()  === ".css"){
													grunt.task.run( "mincss:" + targetName );
												}
											});
										}
									return null;
								})
		//把内容写入配置文件
  });


	//从每块注释中寻找对应的js,css的src,返回该块的["des1":[src1,src2,src3,...],"des2":[src1,src2,...],"des3":[href1,href2,...]]
  // Concat source files and/or directives.
  grunt.registerHelper('watchsmarty', function(options) {
		var block = options.block,
			tagToken = "("+Object.keys(tagAttr).join("|")+")",
			tagAttrToken = "<"+tagToken+"((?:.|\n|\r)+?)\/?>((?:.|\n|\r)*)",
			flatten = [],
			tagAttrTokenRex = new RegExp(tagAttrToken,"g"),
			src ={},
			m,tagName,attrVal,allVal,srcdes={};
			Object.keys(tagAttr).forEach(function( key ){
				src[key] ={};
			})
			  //改版资源目录
	  //process.chdir(taskConfig.resourceRoot);
		do{
			tagAttrTokenRex.exec("");
			//使用正则表达式提取出tagname(m[1]),属性(m[2])
			//提取出[script:{des1:[src1,src2],des2:[src3,src4]}，link:{des1:[href1,href2],des2:[href3,href4]}]
			m = tagAttrTokenRex.exec(block);
			if ( m ) {
					tagName = m[1];
					if ( tagName in tagAttr){
						//根据空格划分属性
						allVal = m[2].split(/\s+/g),
						srcdes = {};
						allVal.forEach(function(val,name){
							attrVal = val.split("=");
							//抽取需要的属性与属性值
							if ( tagAttr[tagName].indexOf(attrVal[0]) > -1){
								//属性值除去前后的"'
								srcdes[ attrVal[0] ] = attrVal[1].replace(/^["']|["']$/g,"");
							}
						});
						//src,href,des必须有值
						if ( srcdes[mustVal[tagName]] && srcdes["des"]) {
							src[tagName][srcdes["des"]] = src[tagName][srcdes["des"]] || [];
							src[tagName][srcdes["des"]].push( srcdes[mustVal[tagName]]);
						}
						block = m[3];
				   }
			}
		} while(m);
		//格式化default合并的资源，默认以-连接
		Object.keys(tagAttr).forEach(function( key ){
			var suff = tagsuffix[key],
				name = "";
				//不使用des缺省值，暂时不开放
			/*if ( src[key]["default"] ) {
				name = src[key]["default"].map(function(val){
					return val.replace(suff,"");	
				}).join("-")+suff;
				src[key][name] = src[key]["default"];
				delete src[key]["default"];
				
			}*/
			flatten.push(src[key]);
		});

		return flatten;
  });
userJson.generate();
};
