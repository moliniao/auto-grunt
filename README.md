# auto-grunt #

自动化提取，压缩静态资源，自动合并图片，实现前端自动化
## 特点： ##

- 自动提取模板文件中的js,css，实时进行合并与压缩。
- 自动转换压缩后css的图片路径为正确路径。
- 自动合并css中的图片为sprite,并自动修改css为正确的sprite位置。
- 自动修改background图片缓存
- 支持多种模式的配置，适应不同的项目需求。
- 一键安装，一键运行，简单易用。
## 安装: ##
  1.在安装nodejs后，在命令行中运行npm install -g auto-grunt<br/>
  2.如果需要使用auto-sprite功能，需要安装ruby与compass<br/>
## 使用: ##
  在任意一个目录中输入auto-grunt（windows下面输入auto-grunt.cmd）,程序将会以最基本功能开启监控本目录。
## 运行原理: ##
  在项目目录下输入auto-grunt后，程序将会此目录中寻找三个配置文件,grunt.js,package.json,config.js,其中grunt.js(程序使用工具的配置信息),package.json(记录静态资源信息)，这两个文件将会递归父层查找，如果没有找到将会在键入auto-grunt命令的目录中自动生成，注意这两个文件一般不需要修改。而config.js(个性化设置，这个文件用户可以根据项目的不同对其进行修改)这个文件将会递归父层寻找，如果没有找到不会自动生成，而是直接使用程序中的默认配置（实质在auto-grunt安装的根目录下有一个默认的config.js）。程序读取配置信息后，将会根据这些配置进行监控，压缩，合并等操作
## config.js配置详解 ##
### 默认配置 ###
```javascript
{
 "leftdelimter":["<%*"],
 "rightdelimter":["*%>"],
 "jsonName":"package.json",
 "autoInit":false,
 "watchFileExt":[".tpl"],
 "resourceRoot":"",
 "autoWriteCon":true,
 "encode":"utf8",
 "replaceImgUrl":false
}
```
#### [`leftdelimter`]
左规则定界符，auto-grunt将会在左右定界符中提取资源信息，缺省为"<%*",（数组，可以定义多个）
#### [`rightdelimter`]
右规则定界符，auto-grunt将会在左右定界符中提取资源信息，缺省为"*%>",（数组，可以定义多个）
#### [`autoInit`]
auto-grunt有两种状态
	1.持续监控（缺省方式）：键入命令后，程序将进入持续监控，只要对应监控文件，静态资源发生改变，立即对其进行相应的合并与压缩。这种方式的缺点是比较耗内存。
	2.结束监控:程序只运行一次。当用户已经完成相应工作后，键入命令程序将会提取目录下的所有文件，对其进行相应的合并与压缩。
#### [`watchFileExt`]
:监控文件类型(数组，可以定义多个,缺省tpl)
#### [`resourceRoot`]
默认情况下，程序将会在键入命令对应的目录中寻找对应的静态资源，设置这个值可以指定程序都指定的目录下寻找。
#### [`encode`]
输出js和css的编码(缺省utf8)，这里只是模拟对应的输出编码（实质上都是输入utf-8,只不过这里把非aci变成unicode）
#### [`autoWriteCon`]
是否切换手动模式为自动模式
#### [`replaceImgUrl`]
是否自动重写合并、压缩后的css背景图片路径，缺省为true
## auto-grunt sprite命令 ##
键入auto-grunt sprite命令后，程序将会分析压缩后的css的background与background-image图片（这里注意如果定义了background-position,程序不会对这张图片进行sprite,并且图片必须是png8），并且类名必须规范化才会sprite,规范的类名为:需要合并的图片组名称（实质就是那几张图片合成sprite名称）-图片名称，例如:
```css
.a-b{ background:url(b.png) no-repeat;}
.a-c{ background:url(c.png) repeat-x}
.d-k{ background:url(k.png) repeat-x;}
.d-c{ background:url(c.png) repeat-x;}
```
运行命令后这个例子将会产生两张sprite图片，并且自动修改压缩后的css sprite位置为压缩后的位置
## 例子: ##
 项目要求:需要监控.html文件，并且把<!-- -->中的资源提取出来并且进行合并压缩，自动sprite
  html的结构如下
```html
<!DOCTYPE>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=gb2312" />
<title>auto-grunt</title>
<!--
<link type="text/css" href="a.css" des="a-b-c.css">   
<link type="text/css" href="b.css" des="a-b-c.css"> 
<link type="text/css" href="c.css" des="a-b-c.css">  
<script type="text/javascript" src="a.js" des="a-b-c.js"></script>  
<script type="text/javascript" src="b.js" des="a-b-c.js"></script>  
<script type="text/javascript" src="c.js" des="a-b-c.js"></script>  
-->
<link type="text/css" href="a-b-c.css">  
<script type="text/javascript" src="a-b-c.js"></script>
</head>
<body>
	auto-grunt自动提取注释中的资源，根据href,src指定的值压缩合并为相应的des
</body>
</html>
```
####步骤:
1.在项目目录中新建一个config.js，修改leftdelimter为["<!--"],rightdelimter为["-->"]. config.js代码如下
```javascript
{
 "leftdelimter":["<!--"],
 "rightdelimter":["-->"],
 "jsonName":"package.json",
 "autoInit":false,
 "watchFileExt":[".tpl"],
 "resourceRoot":"",
 "autoWriteCon":true,
 "encode":"utf8",
 "replaceImgUrl":false
}
```
2.在项目目录中输入auto-grunt,使得程序进入监控状态一直持续到完成所有css,js修改

3.在该目录下输入auto-grunt sprite
 
