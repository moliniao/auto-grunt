auto-grunt

自动化提取，压缩静态资源，自动合并图片，实现前端自动化
特点：

    自动提取模板文件中的js,css，实时进行合并与压缩。
    自动转换压缩后css的图片路径为正确路径。
    自动合并css中的图片为sprite,并自动修改css为正确的sprite位置。
    自动修改background图片缓存
    支持多种模式的配置，适应不同的项目需求。
    一键安装，一键运行，简单易用。
安装:
  1.在安装nodejs后，在命令行中运行npm install -g auto-grunt
  2.如果需要使用auto-sprite功能，需要安装ruby与compass
使用:
  在任意一个目录中输入auto-grunt（windows下面输入auto-grunt.cmd）,程序将会以最基本功能开启监控本目录。
运行原理:
  在项目目录下输入auto-grunt后，程序将会此目录中寻找三个配置文件,grunt.js,package.json,config.js,其中grunt.js(程序使用工具的配置信息),package.json(记录静态资源信息)，这两个文件将会递归父层查找，如果没有找到将会在键入auto-grunt命令的目录中自动生成，注意这两个文件一般不需要修改。而config.js(个性化设置，这个文件用户可以根据项目的不同对其进行修改)这个文件将会递归父层寻找，如果没有找到不会自动生成，而是直接使用程序中的默认配置（实质在auto-grunt安装的根目录下有一个默认的config.js）。程序读取配置信息后，将会根据这些配置进行监控，压缩，合并等操作
例子:
 项目要求:需要监控.html文件，并且把<!-- -->中的资源提取出来并且进行合并压缩，自动sprite
  html的结构如下
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
 步骤:
    1.在项目目录中新建一个config.js，修改leftdelimter为["<!--"],rightdelimter为["-->"].
    2.在项目目录中输入auto-grunt,使得程序进入监控状态一直持续到完成所有css,js修改
    3.在该目录下输入auto-grunt sprite
 
