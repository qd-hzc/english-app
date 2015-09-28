var db = openDatabase('accountDb', '', 'account Db', 5 * 1000 * 1000);

//添加测试数据
function createTable(onSuccess) {
		console.log("开始添加测试数据.....");
		db.transaction(function(tx) {
			//执行访问数据库的语句
			tx.executeSql('DROP TABLE IF EXISTS collect', []);
			tx.executeSql('create table if not exists collect(id INTEGER PRIMARY KEY AUTOINCREMENT,categoryCode text,type INTEGER,questionId INTEGER,answer TEXT,costTime INTEGER)', []); //收藏
		});
		db.transaction(function(tx) {
			createTableMessage(tx); //消息表
			//	});
			//	db.transaction(function(tx) {
			createTableCategory(tx); //科目
			//	});
			//	db.transaction(function(tx) {
			createTableQuestion(tx); // 问题表
			//	});
			//	db.transaction(function(tx) {
			createTableOption(tx); //选项表
			//	});
			//	db.transaction(function(tx) {
			createTableResolution(tx); //解析表
			//	});
			//	db.transaction(function(tx) {
			createTableMaterial(tx); //材料表
		});
		db.transaction(function(tx) {
			try {
				createTableOthers(tx); // 其他用户运行时產生的学习数据记录用的表
			} catch (e) {
				alert(e)
			}
		});
		db.transaction(function(tx) {
			updateCheckData(tx); //初始化数据验证表
		});
		//	db.transaction(function(tx) {
		//		//执行访问数据库的语句
		//		tx.executeSql('DROP TABLE IF EXISTS collect', []);
		//		tx.executeSql('create table if not exists collect(id INTEGER PRIMARY KEY AUTOINCREMENT,categoryCode text,type INTEGER,questionId INTEGER,answer TEXT,costTime INTEGER)', []); //收藏
		//		createTableMessage(tx); //消息表
		//		createTableCategory(tx); //科目
		//		createTableQuestion(tx); // 问题表
		//		createTableOption(tx); //选项表
		//		createTableResolution(tx); //解析表
		//		createTableMaterial(tx); //材料表
		//		createTableOthers(tx); // 其他用户运行时產生的学习数据记录用的表
		//		updateCheckData(tx); //初始化数据验证表
		//	});
		//	
	}
	//消息表

function createTableMessage(tx) {
		tx.executeSql('DROP TABLE IF EXISTS message', []);
		//主键，消息标题，消息内容，创建日期，是否 已经阅读1：阅读，2：未读
		tx.executeSql('create table if not exists message(id INTEGER PRIMARY KEY AUTOINCREMENT,title text,content text,datetime text,status INTEGER)', [],function(tx, rs) {
			console.log("add message data");
		});
	}
	//问题表

function createTableQuestion(tx) {
		tx.executeSql('DROP TABLE IF EXISTS question', []);
		tx.executeSql('create table if not exists question(id INTEGER,categoryCode text,materialId INTEGER,type text,name text,knowledgePoint text,chapter text,parser_video_id text,deleted INTEGER)', [],
			function(tx, rs) {
				console.log("add question data");
			});
	}
	//选项表

function createTableOption(tx) {
		tx.executeSql('DROP TABLE IF EXISTS option', []);
		tx.executeSql('create table if not exists option(id INTEGER,questionId INTEGER,name text,key INTEGER,deleted INTEGER)', [], function(tx, rs) {
			console.log("add option data");
		});
	}
	//解析表

function createTableResolution(tx) {
		tx.executeSql('DROP TABLE IF EXISTS resolution', []);
		tx.executeSql('create table if not exists resolution(id INTEGER,questionId INTEGER,name text,deleted INTEGER)', [], function(tx, rs) {
			console.log("add resolution data!");
		});
	}
	//材料表

function createTableMaterial(tx) {
	tx.executeSql('DROP TABLE IF EXISTS material', []);
	// name表示材料文本内容，fanyi表示英文材料对应的翻译，deleted表示是否删除
	tx.executeSql('create table if not exists material(id INTEGER,name TEXT,fanyi TEXT,deleted INTEGER)', [], function(tx, rs) {
		console.log('add material data');
	});
}

function selectCheckData(checkResultSuccess) {
	db.transaction(function(tx) {
		tx.executeSql('create table if not exists CheckData(id INTEGER PRIMARY KEY AUTOINCREMENT,status INTEGER,version text,createTime text,updateTime text)', []);
		tx.executeSql("select * from CheckData", [], checkResultSuccess, checkResultError);
	});
}

function checkResultSuccess(tx, rs) {
	if (rs.rows.length == 0) {
		//	if (false) { // TODO 部署生产环境前，需要开启上面的注释
		console.log("第一次打开app，需要初始化数据");
		mui.openWindow({
			id: 'imagePage',
			url: 'image.html'
		});
		createTable(onSuccess);
		console.log("第一次初始化过数据完毕");
	} else {
		//TODO 生产环境需要将这行去掉
		//		createTable(onSuccess);
		mui.openWindow({
			id: 'indexPage',
			url: 'dragIndex.html'
		});
		console.log("已经初始化过数据");
	}
}

function checkResultError(tx, error) {
	console.log("操作失败，失败信息：" + error.message);
}

function deleteCheckData(onSuccess) {
	tx.executeSql('delete from CheckData where id = 1', [], onSuccess, onError);
}

function updateCheckData(tx) {
		//初始化数据检验表，如果状态为1则代表已经初始化数据完毕，下次启动读取判断即可
		tx.executeSql('DROP TABLE IF EXISTS CheckData', []);
		tx.executeSql('create table if not exists CheckData(id INTEGER PRIMARY KEY AUTOINCREMENT,status INTEGER,version text,createTime text,updateTime text)', []);
		tx.executeSql('INSERT  INTO CheckData values(?,?,?,?,?)', [1, 1, '1.0', '', '']);
	}
	//sql语句执行成功后执行的回调函数

function onSuccess(tx, rs) {
		console.log(rs.rows.length);
		console.log("onSuccess操作成功");
	}
	//sql语句执行失败后执行的回调函数

function onError(tx, error) {
	console.log("操作失败，失败信息：" + error.message);
	deleteCheckData(onSuccess);
}

function initDb() {
	selectCheckData(checkResultSuccess);
}

mui.plusReady(initDb);