function createTableOthers(tx) {
	tx.executeSql('DROP TABLE IF EXISTS en_note', []);
	tx.executeSql('create table if not exists en_note(id INTEGER PRIMARY KEY,user_id INTEGER,question_id INTEGER,note TEXT,create_time TEXT,deleted INTEGER,parent_id INTEGER)', []);

	//tx.executeSql('INSERT INTO en_discuss values(?,?,?,?,?,?,?)', [1, 2, 3, '  sdf ', '',null,null]);

	console.log(1)
	tx.executeSql('DROP TABLE IF EXISTS en_discuss', []);
	tx.executeSql('create table if not exists en_discuss(id INTEGER PRIMARY KEY,user_id INTEGER,question_id INTEGER,discuss TEXT,create_time TEXT,deleted INTEGER,parent_id INTEGER)', []);

	console.log(2)
	tx.executeSql('DROP TABLE IF EXISTS en_studytime', []);
	tx.executeSql('create table if not exists en_studytime(id INTEGER PRIMARY KEY,user_id INTEGER,section_id INTEGER,study_time INTEGER,create_time TEXT,deleted INTEGER)', []);

	console.log(3)
	tx.executeSql('DROP TABLE IF EXISTS sys_user', []);
	tx.executeSql('create table if not exists sys_user(id INTEGER PRIMARY KEY,phone TEXT,passwd TEXT,status INTEGER,deleted INTEGER,create_time TEXT,online INTEGER,key TEXT,available_time INTEGER,remain_time INTEGER)', []);


	console.log('ok!!!!!!!!!!!!!!!')
	tx.executeSql('select * from en_note', [], function(tx, rs) {
		console.log('en_note:' + rs.rows.length)
	}, onError);

	tx.executeSql('select * from en_discuss', [], function(tx, rs) {
		console.log('en_discuss:' + rs.rows.length)
	}, onError);

	tx.executeSql('select * from en_studytime', [], function(tx, rs) {
		console.log('en_studytime:' + rs.rows.length)
	}, onError);

	tx.executeSql('select * from sys_user', [], function(tx, rs) {
		console.log('sys_user:' + rs.rows.length)
	}, onError);
	console.log('ok!!!!!!!!!!!!!!!')
}