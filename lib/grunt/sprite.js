var CSSOM = require('cssom'),
	fs = require("fs"),
	path = require("path"),
	MATCH_ACTION = [
    {
        //background-image
        regexp: /(url\([^\)]+\))/i,
        exec: function(style, match){
            style['background-image'] = match[1];
        }
    },{
        //background-repeat
        regexp: /((no-repeat)|(repeat-x)|(repeat-y))/i,
        exec: function(style, match){
            style['background-repeat'] = match[1];
        }
    },{
        //background-attachment
        regexp: /(fixed|scroll)/i,
        exec: function(style, match){
            style['background-attachment'] = match[1];
        }
    },{
        //background-origin, background-clip
        //使用简写的时候 origin 是比 clip 优先的
        regexp: /((border|padding|content)-box)/i,
        exec: function(style, match){
            style['background-origin'] = match[1];
        }
    },{
        //background-clip
        regexp: /((border|padding|content)-box)/i,
        exec: function(style, match){
            style['background-clip'] = match[1];
        }
    },{
        //background-position
        //w3c 中 position 的两个值必须写在一次(如果有两个的话)
        regexp: /(-?\d+(%|in|cm|mm|em|ex|pt|pc|px)?)\b/i,
        exec: function(style, match){
            style['background-position-x'] = style['background-position-y'] = match[1];
        }
    },{
        //background-position-y
        regexp: /(-?\d+(%|in|cm|mm|em|ex|pt|pc|px)?)\b/i,
        exec: function(style, match){
            style['background-position-y'] = match[1];
        }
    },{
        //background-color: #fff
        regexp: /(#([0-9a-f]{3}|[0-9a-f]{6})\b)/i,
        exec: function(style, match){
            style['background-color'] = match[1];
        }
    },{
        //background-color: rgb()
        regexp: /(rgb\(\s*(1[0-9]{2}|2[0-4][0-9]|25[0-5]|[1-9][0-9]|[0-9])\s*(,\s*(1[0-9]{2}|2[0-4][0-9]|25[0-5]|[1-9][0-9]|[0-9])\s*){2}\))/i,
        exec: function(style, match){
            style['background-color'] = match[1];
        }
    },{
        //background-color: rgba()
        regexp: /(rgba\((\s*(1[0-9]{2}|2[0-4][0-9]|25[0-5]|[1-9][0-9]|[0-9])\s*,){3}\s*(0?\.[0-9]+|[01])\s*\))/i,
        exec: function(style, match){
            style['background-color'] = match[1];
        }
    },{
        //background-color: color-name
        //W3C 的 HTML 4.0 标准仅支持 16 种颜色名, 加上 orange + transparent 一共 18 种 
        regexp: /(aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|purple|red|silver|teal|white|yellow|orange|transparent)/i,
        exec: function(style, match){
            style['background-color'] = match[1];
        }
    }
    ];
module.exports = {
	//初始化环境
	initEnv: function( grunt, csslist, config, taskDone ){
		this.csslist = csslist;
		this.config = config;
		this.grunt = grunt;
		this.taskDone = taskDone;
	},
	merge: function(){
		var //configFile,
			config,
			cssFileNameList = this.csslist,
			grunt = this.grunt,
			cssRoot = "",
			cssContent,
			cssObject,
			imageList=[],
			spriteName,
			newFileName;
		if(!cssFileNameList.length){
			 throw this.grunt.task.taskError('no css', e);
			return;
		}
		/*//规范cssFileNameList
		cssFileNameList.map(function( cssDir ){
			return path.resolve(cssRoot,cssDir);
		})*/
		cssFileNameList.forEach( function( cssDir ){
			cssContent = grunt.file.read(cssDir);

			try{
				cssObject = this.parseCss(cssContent);
			}catch(e){
				 grunt.verbose.error();
   			     throw this.grunt.task.taskError('Unable to read css"' + cssDir + '" file (Error code: ' + e.code + ').', e);
			}

			imageList = this.extractImage(cssObject);

			//css中没有需要合并的图片或符合规则的selector
			if(!imageList.length) {
				return;
			}
			//初始化sass的环境，并且建立sprite
				this.createSprite( imageList,cssObject,cssDir);
			//检查符合合并条件的选择器，规范:合并图片文件夹名称+ 图片名称== 选择器文件夹名称-图片名称
			
		},this);
	},
	//解析css内容为对象以便分析
	parseCss: function(cssContent){
		return CSSOM.parse(cssContent);
	},
	modifyCss: function(newCssObject,cssObject,spriteDir){
		var imgUrl = "";
		newCssObject.cssRules.forEach(function(newStyle){
			var background = (newStyle.style.background && newStyle.style.background.match(/(url\(["']*([^\)"']+)["']*\))/i)) || null;
			if( background = (background && background[2]) ) {
				background = path.join(spriteDir,"sass","images",path.basename(background)).split("\\").join("\/");
				imgUrl = "url("+background +")";
			}
			cssObject.cssRules.forEach(function(oldStyle){
				var oldSelector = oldStyle.selectorText,
					newSelector = newStyle.selectorText,
					pos = oldSelector.lastIndexOf(newSelector),
					style = oldStyle.style,
					length;
				if( pos>-1 &&  oldSelector.substr(pos).length === newSelector.length) {
					if( !style["background-image"] ){return;}
					if( style["background-position"] ){return;}
					//覆盖
					style["background-image"] = imgUrl;
					style["background-position"] = newStyle.style["background-position"];
					length = style["length"];
					style[style["length"]] = "background-position";
					style["length"] = ++length;
				}
				
			})
		})
	},
	//抽取css中使用background的样式和图片
	extractImage: function(cssObject,result){
		//由于compass只支持png合并
		var imageRegexp = /\(['"]?(.+(\.png))(\?.*?)?['"]?\)/i,
			imageUrl,
			dir_file,
			subfix,
			dir,
			imageName;
		if(!cssObject.cssRules.length){
			return;
		}
		if(!result){
			result = {
				length: 0
			}
		}
		cssObject.cssRules.forEach( function(selector){
			var selectorStyle = selector.style;
			if(selectorStyle.background){//有 background 就先拆分
				this.splitStyleBackground(selectorStyle);
			}

			if(selectorStyle['background-image']){// 有背景图片, 就抽取并合并
					imageUrl = selectorStyle['background-image'];
					imageUrl = imageUrl.match(imageRegexp);
					if(imageUrl){
						subfix = imageUrl[2];
						imageUrl = imageUrl[1];
						//检查符合合并条件的选择器，规范:合并图片文件夹名称+ 图片名称== 选择器文件夹名称-图片名称
						dir_file = selector.selectorText.split(/\s+/);
						dir_file = dir_file[dir_file.length-1].split("-");
						if( dir_file.length < 2 || dir_file[dir_file.length-1] !== path.basename(imageUrl,subfix)){return;}
						dir = selector.selectorText.replace(/^(#|\.)/,"");

						dir = dir.split("-");
						if(!result[imageUrl]){
							result[imageUrl] = {
								dir:dir[0],
								name:path.basename(imageUrl),
								url: imageUrl,
								cssRules: [],
								selector: []
							};
							result.length++;
						}
						result[imageUrl].cssRules.push(selectorStyle);
						result[imageUrl].selector.push(selector.selectorText);
					}
				}
		},this);
			return result;
	},
	//格式化样式(打散background)
	splitStyleBackground: function(selectorStyle){
		var breakBackground, 
			value;
		// 撕裂 background-position
		if(value = selectorStyle['background-position']){
			value = value.trim().split(/\s+/);
			if(!value[1]){
				value[1] = value[0];
			}
			this.removeStyleAttr(selectorStyle, 'background-position');
			this.addStyleAttr(selectorStyle, 'background-position-x', value[0]);
			this.addStyleAttr(selectorStyle, 'background-position-y', value[1]);
		}
		//打破breakBackground
		breakBackground = this.breakBackground(selectorStyle.background);
		if(breakBackground['background-image']){
			this.removeStyleAttr(selectorStyle, 'background');
			this.mergeStyle(selectorStyle, breakBackground);
		}
	},
	//打散background以便分析
   breakBackground: function(background){
	   var style = {},
            match,
            origin = value = background.trim();
        for(var i = 0, action; (action = MATCH_ACTION[i]) && value; i++) {
            match = value.match(action.regexp);
            if(match){
                action.exec(style, match);
                value = value.replace(match[0], '').trim();
            }
        };
        return style;
  },
  //删除样式中的属性
  removeStyleAttr : function(selectorStyle, attr){
		if(!selectorStyle[attr]){
			return;
		}
		delete selectorStyle[attr];
		for(var i = 0, item; item = selectorStyle[i]; i++) {
			if(item === attr){
				var length = selectorStyle.length;
				for(var j = i; j < length-1; j++){
					selectorStyle[j] = selectorStyle[j + 1];
				}
				delete selectorStyle[length-1];
				selectorStyle.length = --length;
				//delete selectorStyle[selectorStyle.length--];
				break;
			}
		};
	},
	//add样式中的属性
	 addStyleAttr : function(selectorStyle, attr, val){
		if(selectorStyle[attr]){
			return;
		}
		var length = selectorStyle["length"];
		selectorStyle[ length ] = attr;
		selectorStyle[ attr ] = val;
 		selectorStyle[ "length" ] = ++length; 
	 },
	mergeStyle : function(selectorStyle, exStyle){// 如果 style 里面有的属性, 就不用 exStyle 的覆盖
		for(var attr in exStyle){
			if(selectorStyle[attr]){
				continue;
			}
			this.addStyleAttr(selectorStyle, attr, exStyle[attr]);
			//selectorStyle[i] = exStyle[i];
			//selectorStyle[selectorStyle.length++] = i;
		}
	},
	sass: function(){
		
	},
	// 递归建立目录
	mkdir: function(dirpath) {
	  dirpath.split(/[\/\\]/).reduce(function(parts, part) {
		parts += part + '/';
		var subpath = path.resolve(parts);
		if (!path.existsSync(subpath)) {
		  try {
			fs.mkdirSync(subpath, '0755');
		  } catch(e) {
		  }
		}
		return parts;
	  }, '');
	},
	//拷贝图片到指定文件夹
	copyImage: function( source,target ){
			//读图片流
			var source =  fs.readFileSync( path.resolve(source) );
			//写图片流
			fs.writeFileSync( path.resolve(target),source );
	},
	//初始化sass环境
	initSass: function(sassSas, sassCss, sassImg){
		var args = this.grunt.utils.toArray(arguments);
		args.forEach(function( path ){
			this.grunt.file.mkdir(path);
		},this);
	},
	//通过调用脚本运用compass生成sprite
	createSprite: function( imageList, cssObject, cssDir ){
		 var exec = require('child_process').exec,
            command = "",
			sassSas="",
			sassCss = "",
			sassImg = "",
			imageName="",
			dirName = "",
			sassRoot = this.config.sassRoot,
			imageUrl = "",
			spriteDir = "",
			sass={};
		sassRoot = sassRoot || path.dirname(cssDir);
		sassRoot = path.resolve( path.join(sassRoot, "sass") );
		command = "compass compile "+ sassRoot + " -e production --force";
		sassSas = path.join(sassRoot, "sass");
		sassCss = path.join(sassRoot, "stylesheets");
		sassImg = path.join(sassRoot, "images");
		this.initSass(sassSas, sassCss, sassImg);
		//把需要合并的图片放入sass目录中
		Object.keys(imageList).forEach(function( key ){
			if( typeof imageList[key] === "number"){ return;}
			dirName = imageList[key]["dir"];
			imageName = imageList[key]["name"];
			imageURL = this.grunt.file.isPathAbsolute( key ) ? key : path.join(path.dirname(cssDir),key);
			var dir = path.join(sassImg,dirName);
			this.grunt.file.mkdir( dir );
			this.copyImage( imageURL, path.join(dir,imageName) );
			sass[dirName] = sass[dirName] || {};
			sass[dirName][imageName] = imageList[key].cssRules;
		},this);
		//写入scss
		Object.keys(sass).forEach(function( dir ){
			var repeat = "";
			//检查是否有属性repeat-x,repeat-y
			Object.keys(sass[dir]).forEach(function( img ){
				var cssRules = sass[dir][img][0];
				if (cssRules["background-repeat"]){
					repeat +="$" + dir + "-"+ img.substr(0,img.lastIndexOf(".")) + "-repeat: " + cssRules["background-repeat"]+";";
				};
			});
			var header = 	"@import \"" + dir + "/*.png\";",
				subheader =  "@include all-" + dir +"-sprites;";
			fs.writeFileSync(path.resolve(path.join(sassSas,dir+".scss")),repeat+header+subheader);
		})
		 if ( sassSas !== undefined && sassCss !== undefined ) {
            command += ' --sass-dir "' + sassSas + '" --css-dir "' + sassCss + '"';
       	 }

         if ( sassImg !== undefined ) {
          command += ' --images-dir "' + sassImg + '"';
         }
		
		 function puts( error, stdout, stderr ){
           // grunt.log.write( stdout );
            /* grunt.log.error( stderr );
             * compass sends falsy error message to stderr... real sass/compass errors come in through the "error" variable.
             */
			 var cssContent = "",
			 	 newCssObject;
            if ( error !== null ) {
				 //throw this.grunt.task.taskError('exec compass wrong' + cssDir , e);
            }
            else {
			  //从compass生成的css中读取相应的规则
				 Object.keys(sass).forEach(function( dir ){
					 cssContent += fs.readFileSync(path.resolve(path.join(sassCss,dir)+".css")).toString();
				 });
				newCssObject = this.parseCss(cssContent);
				//图片使用相对路径
				spriteDir = path.relative(this.config.resourceRoot,path.dirname(cssDir));
				this.modifyCss(newCssObject,cssObject,spriteDir);
				fs.writeFileSync(cssDir, require("clean-css").process(cssObject.toString()));
            }
			this.taskDone();
        }
    exec( command, puts.bind(this) );

	//process.stdin.resume();


       //	this.grunt.log.write( '`' + command + '` was initiated.' );
	}
}