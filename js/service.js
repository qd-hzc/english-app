var sDb = openDatabase('accountDb', '', 'account Db', 5 * 1000 * 1000);

var pageSize = 10;

/**
 * 打开app后，自动更新服务器端的版本到本地，为以后的category（大纲数据）做好更新的准备
 * @param {Object} remote_version
 */
function updateLocalAppVersion(remote_version) {
	sDb.transaction(function(tx) {
		var updateLocalAppVersionSql = 'update category set remote_version = ? where id = 0';
		tx.executeSql(updateLocalAppVersionSql, [remote_version], function() {
			console.log('大纲版本以获取，并记录。。');
		}, onError);
	});
}

/**
 * 会计app 的推送消息查询
 * @param {Object} callback
 */
function queryAllMessage(callback) {
	sDb.transaction(function(tx) {
		var sql = 'select * from message order by datetime desc';
		tx.executeSql(sql, [], function(tx, rs) {
			var myRows = [];
			if (rs.rows.length > 0) {
				for (var i = 0; i < rs.rows.length; i++) {
					var row = rs.rows.item(i);
					myRows.push({
						id: row.id,
						title: row.title,
						content: row.content,
						datetime: row.datetime,
						status: row.status,
						readStyle: (function() {
							return row.status == 2 ? 'background-color: ghostwhite;' : '';
						})()
					});
				}
			}
			callback(myRows);
		}, onError);
	});
}

/**
 * 推送消息 保存方法
 * @param {Object} record
 * {title:'', content:''}
 */
function saveMessage(msg) {
	var d = new Date();
	var year = d.getFullYear();
	var month = d.getMonth() + 1;
	var date = d.getDate();
	var hours = d.getHours();
	var minutes = d.getMinutes();
	var seconds = d.getSeconds();
	var record = {
		title: msg.title,
		content: msg.content,
		datetime: (year + '-' + month + '-' + date + '  ' + hours + ':' + minutes + ':' + seconds),
		status: 1
	};
	var sql = 'INSERT INTO message (title,content,datetime,status) values(?,?,?,?)';
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [record.title, record.content, record.datetime, record.status], function() {}, onError);
	});
}

/**
 * 获取所有课程 courseCode课程,sReuslt为回调方法名
 */
function queryAllCourse(callback) {
	sDb.transaction(function(tx) {
		var sql = "select id,code,name,status,progress from category where length(code)=4";
		tx.executeSql(sql, [], function(tx, rs) {
			var myRows = [];
			if (rs.rows.length > 0) {
				for (var i = 0; i < rs.rows.length; i++) {
					var row = rs.rows.item(i);
					myRows.push({
						code: row.code,
						name: row.name,
						status: row.status
					});
				}
			}
			callback(myRows);
		}, onError);
	});
}

/**
 * 根据编码获取课程下的章节列表,
 * 如果code为4位，则查询结果为章列表；如果code为8位，则查询结果为节列表;如果code不为4位或8位则返回为空
 * sReuslt为回调方法
 */
function queryCategory(categoryCode, successCallback) {
	function isSaveOrUpdate(categoryCode, localDataCallback) {
		sDb.transaction(function(tx) {
			var isUpdateSql = 'select * from category where id = 0';
			tx.executeSql(isUpdateSql, [], function(tx, rs) { // 查看整个app有无更新
				if (rs.rows.length > 0) {
					var record = rs.rows.item(0);

					function insertOrUpdate(url, mySectionId, currCallback, myCallback) {
						window.isCategoryPre = 0;
						window.isCategoryNext = 0;
						mui.ajax(url, {
							data: {},
							dataType: 'json', //服务器返回json格式数据
							type: 'post', //HTTP请求类型
							timeout: 10000, //超时时间设置为10秒；
							async: false,
							success: function(data) {
								window.isCategoryPre = data.length;
								if (data.length > 0) {
									currCallback(data);
									var inter = setInterval(function() {
										if (window.isCategoryPre <= window.isCategoryNext) {
											clearInterval(inter);
											myCallback();
										}
									}, 100);
								} else {
									myCallback();
								}

							},
							error: networkErrorHandler
						});
					}

					if (record.remote_version > record.local_version) { // 需要更新
						mui.toast('正在更新数据，请稍候');
						console.log('需要更新大纲相关数据');

						function updateCategory() {
							insertOrUpdate(Routes.urls.syncdata.listAllCategory, categoryCode, function(data) {
								sDb.transaction(function(tx) {
									var deleteSql = 'delete from category where id != 0';
									tx.executeSql(deleteSql, [], function() {
										for (var i = 0; i < data.length; i++) {
											var record = data[i];
											var insertSql = 'INSERT INTO category values(?,?,?,?,?,?,?,?,?)';
											tx.executeSql(insertSql, [record.id, record.code, record.name, record.status, record.process, record.deleted, record.version, record.version, 1], function() {
												window.isCategoryNext += 1;
											}, onError);
										}
									}, onError);
								});
							}, function() {
								// 更新 此节的状态为 1 “数据已经初始化”
								sDb.transaction(function(tx) {
									tx.executeSql('update category set local_version = remote_version where id = 0', [], function() {
										console.log('更新大纲的版本为最新版本成功！')
									}, onerror);
								});
								localDataCallback();
							})
						}

						updateCategory();

					} else { // 不需要更新
						console.log('不需要更新大纲相关数据');
						localDataCallback();
					}

				}
			});

		});
	}

	isSaveOrUpdate(categoryCode, function() {
		var sql = "select id,code,name,status,progress from category  ";
		if (categoryCode.length == 4) {
			sql += "where length(code)=8 ";
		}
		if (categoryCode.length == 8) {
			sql += "where length(code)=12 ";
		}
		if (categoryCode.length == 4 || categoryCode.length == 8) {
			sql += " and substr(code,1," + categoryCode.length + ")='" + categoryCode + "'";
		} else {
			sql += " where 1!=1 ";
		}
		sql += " order by id asc";

		sDb.transaction(function(tx) {
			tx.executeSql(sql, [], function(tx, rs) {
				var myRows = [];
				if (rs.rows.length > 0) {
					for (var i = 0; i < rs.rows.length; i++) {
						var row = rs.rows.item(i);
						myRows.push({
							code: row.code,
							name: row.name,
							status: row.status,
							progress: !!row.progress ? "0" : row.progress
						});
					}
				}
				successCallback(myRows);
			}, onError);
		});

	});

}


function minix(sourceObj) {
	var pageSize = sourceObj.pageSize || window.pageSize;
	var targetObj = {
		pageSize: 0,
		currentTime: 0,
		questionList: (function() {
			if (!sourceObj.questionList) {
				return [];
			} else {
				return sourceObj.questionList
			}
		})(),

		getQuestion: function(id) {
			function inner(questionList) {
				for (var i = 0; i < questionList.length; i++) {
					var questionTemp = questionList[i];
					if (questionTemp.question.id == id) {
						return questionTemp;
					}
				}
			}
			var value = inner(this.questionList);
			if (!value) {
				alert('meiyou question by id' + id)
			}
			return value;
		},


		grade: function(userResultList) {
			//FIXME 解决submit页面通关文本显示错误的问题
			this.userCorrectAnswerCount = 0;

			for (var k = 0; k < userResultList.length; k++) {
				var userResult = userResultList[k];

				var questionId = userResult.questionId;
				var labelList = userResult.userAnswerList;
				labelStr = labelList.join('');
				//找到目标question对象
				var questionAll = this.getQuestion(questionId);

				function setOptionSelected(question, labelStr) {
						var options = question.options;
						for (var i = 0; i < options.length; i++) {
							var option = options[i];
							if (labelStr.indexOf(option.label) != -1) {
								option.isSelected = true;
							} else {
								option.isSelected = false;
							}
						}
					}
					//options对象设置isSelect值
				setOptionSelected(questionAll, labelStr);
				//question对象设置用户选择值
				questionAll.question.userAnswer = labelStr;
				//question对象计算本题正确答案
				function getQuestionAnswer(question) {
					var ret = [];
					var options = question.options;
					for (var i = 0; i < options.length; i++) {
						var option = options[i];
						if (option.key == 1) {
							ret.push(option.label);
						}
					}
					return ret.join('');
				}

				questionAll.question.questionAnswer = getQuestionAnswer(questionAll);
				//question对象设置isOk值
				function getOK(question) {
					return question.userAnswer == question.questionAnswer;
				}
				questionAll.question.isOk = getOK(questionAll.question);

				if (questionAll.question.isOk) {
					this.userCorrectAnswerCount++;
				}

			}
		},

		userCorrectAnswerCount: 0,
		/**
		 *
		 */
		getResultMsg: function() {
			if (this.userCorrectAnswerCount >= (Math.round(0.6 * pageSize))) {
				var sectionId = this.questionList[0].question.categoryCode;
				openNextTollGate(sectionId);
				var chapterId = sectionId.substr(0, 8);
				updateProgress(chapterId)
				return 1; //及格
			} else {
				return 2; //不及格
			}
		},

		saveCollect: function() {
			for (var i = 0; i < this.questionList.length; i++) {
				var question = this.questionList[i].question;
				delteCollect(question.id);
				if (!question.isOk) saveCollect(question);
			}
		},

		updateBookMark: function(questionAll) {
			var hasCollect = questionAll.hasCollect;
			if (hasCollect) { //已经存在这个题目的收藏
				deleteBookmark(questionAll.question.id);
			} else { // 不存在这个题目的收藏
				saveBookmark(questionAll.question);
			}
			questionAll.hasCollect = !hasCollect;
		},

		isAllDo: function() {
			for (var i = 0; i < this.questionList.length; i++) {
				var questionAll = this.questionList[i];
				if (!questionAll.question.userAnswer) {
					return false;
				}
			}
			return true;
		},

		fireFinishCallbak: function(all) {
			this.questionList.push(all);
			this.currentTime += 1;
			if (this.currentTime == pageSize) { // 最后一题
				var sectionId = all.question.categoryCode;
				this.chapterId = sectionId.substr(0, 8);
				sourceObj.finishCallback(this);
			} //end if 最后一题
		},

		getSectionId: function() {
			var sectionId = this.questionList[0].question.categoryCode;
			return sectionId.substr(0, 12);
		},

		getChapterId: function() {
			var sectionId = this.questionList[0].question.categoryCode;
			return sectionId.substr(0, 8);
		},

		getCourseId: function() {
			var sectionId = this.questionList[0].question.categoryCode;
			return sectionId.substr(0, 4);
		},

		isAllReply: function() {
			for (var i = 0; i < this.questionList.length; i++) {
				var question = this.questionList[i].question;
				if (question.userAnswer == '') {
					return false;
				}
			}
			return true;
		}
	};

	for (var name in targetObj) {
		var value = sourceObj[name];
		if (value) {
			targetObj[name] = value;
		}
	}

	return targetObj;
}

/**
 * 核心业务查询方法，返回question有关的所有先关对象。
 * @param {Object} categoryCode 节id
 * @param {Object} rowCallback
 */
function queryQuestionAll(categoryCode, rowCallback, finishCallback, noDataCallback) {

	function isSaveOrUpdate(categoryCode, localDataCallback) {
		sDb.transaction(function(tx) {
			var isUpdateSql = 'select * from category where code = ?';
			tx.executeSql(isUpdateSql, [categoryCode], function(tx, rs) { // 查看整个app有无更新
				if (rs.rows.length > 0) {
					var record = rs.rows.item(0);

					function insertOrUpdate(url, mySectionId, currCallback, myCallback) {
						window.isQuestionPre = 0;
						window.isQuestionNext = 0;
						mui.ajax(url, {
							data: {
								sectionId: mySectionId,
								phone: window.localStorage.getItem('phone')
							},
							dataType: 'json', //服务器返回json格式数据
							type: 'post', //HTTP请求类型
							timeout: 10000, //超时时间设置为10秒；
							async: false,
							success: function(data) {
								window.isQuestionPre = data.length;
								if (data.length > 0) {
									//									console.log(url + ':' + data.length);
									//									console.log(JSON.stringify(data))
									currCallback(data);
									var inter = setInterval(function() {
										// console.log(window.isQuestionPre + ':' + window.isQuestionNext)
										if (window.isQuestionPre <= window.isQuestionNext) {
											clearInterval(inter);
											myCallback();
										}
									}, 100);
								} else {
									myCallback();
								}

							},
							error: networkErrorHandler
						});
					}

					if (record.have_data == 2) { // 本地有数据
						//						if(true){
						if (loadWifiMode() || record.remote_version > record.local_version) { // 需要更新  TODO 此地方需要在生产环境下打开
							mui.toast('正在更新数据，请稍候');
							console.log('需要更新(' + categoryCode + ')的相关数据，have_data为：' + record.have_data);

							function updateQuestion() {
								insertOrUpdate(Routes.urls.syncdata.listQuestion, categoryCode, function(data) {
									sDb.transaction(function(tx) {
										var updateSql = 'update question set categoryCode=?,materialId=?,type=?,name=?,knowledgePoint=?,chapter=?,parser_video_id=?,deleted=? where id = ?';
										for (var i = 0; i < data.length; i++) {
											var question = data[i];
											var param = [question.categorycode, question.materialid == 0 ? 0 : question.materialid,
												question.type, question.name, '', '', null, question.deleted ? null : question.deleted, question.id
											];
											tx.executeSql(updateSql, param, function(tx, rs) {
												window.isQuestionNext += 1;
											}, onError);
										}
									});
								}, function() {
									updateMaterial()
								})
							}

							function updateMaterial() {
								insertOrUpdate(Routes.urls.syncdata.listMaterialBySectionId, categoryCode, function(data) {
									sDb.transaction(function(tx) {
										var updateSql = 'UPDATE material set name=?,fanyi=?,deleted=? where id = ?';
										for (var i = 0; i < data.length; i++) {
											var r = data[i];
											var param = [r.name, r.fanyi, r.deleted, r.id];
											tx.executeSql(updateSql, param, function(tx, rs) {
												window.isQuestionNext += 1;
											}, onError);
										}
									});
								}, function() {
									updateOption()
								})
							}

							function updateOption() {
								insertOrUpdate(Routes.urls.syncdata.listOptionsBySectionId, categoryCode, function(data) {
									sDb.transaction(function(tx) {
										var updateSql = 'UPDATE option set questionId=?,name=?,key=?,deleted=? where id = ?';
										for (var i = 0; i < data.length; i++) {
											var r = data[i];
											var param = [r.questionid, r.name, r.key, r.deleted, r.id];
											tx.executeSql(updateSql, param, function(tx, rs) {
												window.isQuestionNext += 1;
											}, onError);
										}
									});
								}, function() {
									updateResolution();
								})
							}

							function updateResolution() {
								insertOrUpdate(Routes.urls.syncdata.listResolutionsBySectionId, categoryCode, function(data) {
									sDb.transaction(function(tx) {
										var updateSql = 'UPDATE resolution set questionId=?,name=?,deleted=? where id = ?';
										for (var i = 0; i < data.length; i++) {
											var r = data[i];
											var param = [r.questionid, r.name, r.deleted, r.id];
											tx.executeSql(updateSql, param, function(tx, rs) {
												window.isQuestionNext += 1;
											}, onError);
										}
									});
								}, function() {
									// 更新 此节的状态为 1 “数据已经初始化”
									sDb.transaction(function(tx) {
										tx.executeSql('update category set local_version = remote_version where code = ?', [categoryCode], function() {
											console.log('更新此章节的版本为最新版本成功！')
										}, onerror);
									});
									localDataCallback();
								})
							}

							updateQuestion();

						} else { // 不需要更新
							console.log('不需要更新(' + categoryCode + ')的相关数据');
							localDataCallback();
						}
					} else { // 本地无数据，先下载此节的数据
						mui.toast('正在初始化数据，请稍候');
						console.log('本地无(' + categoryCode + ')数据，先下载此节的数据，have_data为：' + record.have_data);

						function insertQuestion() {
							insertOrUpdate(Routes.urls.syncdata.listQuestion, categoryCode, function(data) {
								sDb.transaction(function(tx) {
									//现将状态改掉

									var insertQuestionSql = 'INSERT INTO question values(?,?,?,?,?,?,?,?,?)';
									for (var i = 0; i < data.length; i++) {
										var question = data[i];
										//										console.log('INSERT INTO question :' + JSON.stringify(question));
										var param = [question.id, question.categorycode, question.materialid == 0 ? 0 : question.materialid,
											question.type, question.name, '', '', null, question.deleted ? null : question.deleted
										];
										tx.executeSql(insertQuestionSql, param, function(tx, rs) {
											window.isQuestionNext += 1;
										}, onError);
									}
								});
							}, function() {
								insertMaterial()
							})
						}

						function insertMaterial() {
							insertOrUpdate(Routes.urls.syncdata.listMaterialBySectionId, categoryCode, function(data) {
								sDb.transaction(function(tx) {
									//现将状态改掉
									//									tx.executeSql('INSERT INTO material values(?,?,?,?)',  [2, '四十四','zheshifanyi']);
									var insertSql = 'INSERT INTO material values(?,?,?,?)';
									for (var i = 0; i < data.length; i++) {
										var r = data[i];
										var param = [r.id, r.name, r.fanyi, r.deleted];
										tx.executeSql(insertSql, param, function(tx, rs) {
											window.isQuestionNext += 1;
										}, onError);
									}
								});
							}, function() {
								insertOption()
							})
						}

						function insertOption() {
							insertOrUpdate(Routes.urls.syncdata.listOptionsBySectionId, categoryCode, function(data) {
								sDb.transaction(function(tx) {
									//现将状态改掉
									//									tx.executeSql('INSERT INTO option values(?,?,?,?,?)', [2, 2, '《企业会计准则》', 1,null]);
									var insertSql = 'INSERT INTO option values(?,?,?,?,?)';
									for (var i = 0; i < data.length; i++) {
										var r = data[i];
										var param = [r.id, r.questionid, r.name, r.key, r.deleted];
										tx.executeSql(insertSql, param, function(tx, rs) {
											window.isQuestionNext += 1;
										}, onError);
									}
								});
							}, function() {
								insertResolution();
							})
						}

						function insertResolution() {
							insertOrUpdate(Routes.urls.syncdata.listResolutionsBySectionId, categoryCode, function(data) {
								sDb.transaction(function(tx) {
									//现将状态改掉
									//									tx.executeSql('INSERT INTO resolution values(?,?,?,?)', [2, 2, '學習',null]);
									var insertSql = 'INSERT INTO resolution values(?,?,?,?)';
									for (var i = 0; i < data.length; i++) {
										var r = data[i];
										var param = [r.id, r.questionid, r.name, r.deleted];
										tx.executeSql(insertSql, param, function(tx, rs) {
											window.isQuestionNext += 1;
										}, onError);
									}
								});
							}, function() {
								// 更新 此节的状态为 1 “数据已经初始化”
								sDb.transaction(function(tx) {
									tx.executeSql('update category set have_data = 2 where code = ?', [categoryCode], function() {
										console.log('插入此章节的版本的数据成功！')
									}, onerror);
								});
								localDataCallback();
							})
						}

						insertQuestion();
					}
				}
			});

		});
	}

	isSaveOrUpdate(categoryCode, over);

	function over() {
		var allLabel = 'ABCDEFGHIJKLMN'.split('');
		var countSql = 'select count(1) as count from question q left join resolution r on q.id = r.questionId left join material m on  q.materialId = m.id left join (select * from collect where type =1) c on q.id = c.questionId where q.categoryCode = ?';
		var allSql = 'select q.id as question_id,q.categoryCode as question_category_code,q.type as question_type,q.name as question_name,q.knowledgePoint as question_knowledge_ponit,q.chapter as question_chapter,q.parser_video_id as question_parser_video_id,r.id as resolution_id,r.name as resolution_name,m.id as material_id,m.name as material_name,m.fanyi as material_fanyi,c.id as collect_id,c.type as collect_type,c.answer as collect_answer,c.costTime as collect_cost_time ' + ' from question q left join resolution r on q.id = r.questionId left join material m on  q.materialId = m.id left join (select * from collect where type =1) c on q.id = c.questionId where q.categoryCode = ? limit ?,?';

		var subSql = "select id,name,key from option where questionId=?";

		var Finish = null;

		sDb.transaction(function(tx) {

			function optionAction(all) {
				tx.executeSql(subSql, [all.question.id], function(tx, rs) {
					var options = [];
					if (rs.rows.length > 0) {
						for (var i = 0; i < rs.rows.length; i++) {
							var _option = rs.rows.item(i);
							all.options.push({
								id: _option.id,
								label: allLabel[i],
								name: jiemi(_option.name),
								key: _option.key,
								inputType: (function() {
									var t = all.question.type;
									if (t == '判断题' || t == '单选题' || t == '填空题') {
										return 'radio';
									} else if (t == '多选题') {
										return 'checkbox';
									}
								})(),
								inputName: ('name-' + all.question.id),
								isSelected: false
							});
						}
					}
					rowCallback(all);
					Finish.fireFinishCallbak(all);
				}, onError);
			}

			/**
			 * 排序dom顺序
			 * @param {Object} all
			 */
			function sortDom(all) {

			}

			function questionAction(start, pageSize) {
				tx.executeSql(allSql, [categoryCode, start, pageSize], function(tx, rs) {
					if (rs.rows.length > 0) {
						for (var i = 0; i < rs.rows.length; i++) {
							var r = rs.rows.item(i);
							var allResult = {
								question: {
									indexed: i + 1,
									id: r.question_id,
									categoryCode: r.question_category_code,
									type: r.question_type,
									name: jiemi(r.question_name),
									knowledgePonit: r.question_knowledge_ponit,
									chapter: r.question_chapter,
									parserVideoId: r.question_parser_video_id,
									isOk: false,
									userAnswer: '',
									questionAnswer: '',
									pageSize: pageSize,
								},
								resolution: {
									id: r.resolution_id,
									name: jiemi(r.resolution_name),
								},
								material: {
									id: r.material_id,
									name: jiemi(r.material_name),
									fanyi: r.material_fanyi,
								},
								collect: {
									id: r.collect_id,
									type: r.collect_type,
									answer: r.collect_answer,
									cost_time: r.collect_cost_time,
								},
								options: [],
								hasCollect: (undefined != r.collect_id),
								hasMaterial: (undefined != r.material_id)
							};
							optionAction(allResult)
						}
					}
				}, onError);
			}

			function countAction(callback) {
				tx.executeSql(countSql, [categoryCode], function(tx, rs) {
					if (rs.rows.length == 1) {
						var row = rs.rows.item(0);
						callback(row.count);
						//						pageSize = row.count; // 分页大小为 所有满足条件数据的数量
					} else {
						noDataCallback();
					}
				});
			}

			countAction(function(count) {
				var start = 0;
				//				if (count <= window.pageSize) {
				if (true) { // 分页大小为 所有满足条件数据的数量
					window.pageSize = count;
				} else {
					start = Math.floor(Math.random() * (count - window.pageSize));
				}
				Finish = minix({
					finishCallback: finishCallback,
					pageSize: window.pageSize
				});
				questionAction(start, window.pageSize);
			});

		});
	}

}


/**
 * 核心业务查询方法，返回错题或者收藏记录
 * @param {Object} categoryCode  节 id
 * @param {Object} rowCallback
 */
function queryQuestionAllForReview(categoryCode, type, rowCallback, finishCallback, noDataCallback) {
	var allLabel = 'ABCDEFGHIJKLMN'.split('');
	var allSql = 'select q.id as question_id,q.categoryCode as question_category_code,q.type as question_type,q.name as question_name,q.knowledgePoint as question_knowledge_ponit,q.chapter as question_chapter,q.parser_video_id as question_parser_video_id,r.id as resolution_id,r.name as resolution_name,m.id as material_id,m.name as material_name,c.id as collect_id,c.type as collect_type,c.answer as collect_answer,c.costTime as collect_cost_time ' +
		'from (select * from collect where type = ?) c left join question q on q.id = c.questionId inner join resolution r on q.id = r.questionId left join material m on  q.materialId = m.id where q.categoryCode = ?';
	var subSql = "select id,name,key from option where questionId=?";

	var Finish = null;

	sDb.transaction(function(tx) {

		function optionAction(all) {
			tx.executeSql(subSql, [all.question.id], function(tx, rs) {
				var options = [];
				var questionAnswer = [];
				if (rs.rows.length > 0) {
					for (var i = 0; i < rs.rows.length; i++) {
						var _option = rs.rows.item(i);
						var userAnswer = all.question.userAnswer;
						var label = allLabel[i]
						var option = {
							id: _option.id,
							label: allLabel[i],
							name: jiemi(_option.name),
							key: _option.key,
							inputType: (function() {
								var t = all.question.type;
								if (t == '判断题' || t == '单选题' || t == '填空题') {
									return 'radio';
								} else if (t == '多选题') {
									return 'checkbox';
								}
							})(),
							inputName: ('name-' + all.question.id),
							isSelected: (userAnswer.indexOf(label) != -1)
						};
						all.options.push(option);
						if (option.key == 1) {
							questionAnswer.push(option.label);
						}
					}
					all.question.questionAnswer = questionAnswer.join('');
					if (all.question.questionAnswer == all.question.userAnswer) {
						all.question.isOk = true;
					}
				}

				Finish.fireFinishCallbak(all);

				rowCallback(all);

			}, onError);
		}

		tx.executeSql(allSql, [type, categoryCode], function(tx, rs) {
			var pageSize = rs.rows.length;
			Finish = minix({
				finishCallback: finishCallback,
				pageSize: pageSize
			});

			if (pageSize > 0) {
				for (var i = 0; i < pageSize; i++) {
					var r = rs.rows.item(i);
					var allResult = {
						question: {
							indexed: i + 1,
							id: r.question_id,
							categoryCode: r.question_category_code,
							type: r.question_type,
							name: jiemi(r.question_name),
							knowledgePonit: r.question_knowledge_ponit,
							chapter: r.question_chapter,
							parserVideoId: r.question_parser_video_id,
							isOk: false,
							userAnswer: r.collect_answer,
							questionAnswer: '',
							pageSize: pageSize
						},
						resolution: {
							id: r.resolution_id,
							name: jiemi(r.resolution_name)
						},
						material: {
							id: r.material_id,
							name: jiemi(r.material_name)
						},
						collect: {
							id: r.collect_id,
							type: r.collect_type,
							answer: r.collect_answer,
							cost_time: r.collect_cost_time
						},
						options: [],
						hasCollect: (undefined != r.collect_id),
						hasMaterial: (undefined != r.material_id)
					};
					optionAction(allResult)
				}
			}
		}, onError);


	});
}



/**
 * 如果通关则自动打开下一关卡
 * @param {Object} sectionId
 */
function openNextTollGate(sectionId) {
	sDb.transaction(function(tx) {
		var sql2 = 'update category  set progress = 100 where code = ?';
		tx.executeSql(sql2, [sectionId], function(tx, rs) {}, onError);
		var sql3 = 'select * from category where code = ?';
		tx.executeSql(sql3, [sectionId], function(tx, rs) {
			var category = rs.rows.item(0);
			if (category) {
				//				var sId = '000' + (parseInt(sectionId) + 1);
				var sId = category.id + 1;
				var sql = 'update category  set status = 1 where id = ?';
				tx.executeSql(sql, [sId], function(tx, rs) {}, onError);
			}
		}, onError);
	});

}

/**
 * 更新章 的进度
 * @param {Object} chapterId
 */
function updateProgress(chapterId) {
	sDb.transaction(function(tx) {
		var selSql = "select (select count(1) from category where code like '" + chapterId + "%' and progress = 100) as okCount,(select count(1) from category where code like '" + chapterId + "%') as allCount ";
		tx.executeSql(selSql, [], function(tx, rs) {
			if (rs.rows.length == 1) {
				var selObj = rs.rows.item(0);
				var progress = Math.round((selObj.okCount) / (selObj.allCount - 1) * 100, 0);
				if (selObj.okCount == selObj.allCount) {
					progress = 100;
				}
				var sql = 'update category set progress = ? where code = ?';
				tx.executeSql(sql, [progress, chapterId], function(tx, rs) {}, onError);
			}
		}, onError);
	});
}

/**
 * 根据节编码获取节下的试题
 * categoryCode:编码
 * sReuslt为回调方法
 */

function queryQuestion(categoryCode, sResult) {
		var sql = "select id,categoryCode,materialId,type,name,knowledgePoint,chapter,parser_video_id from question where categoryCode=?";
		sDb.transaction(function(tx) {
			tx.executeSql(sql, [categoryCode], sResult, onError);
		});
	}
	/**
	 * 根据问题id获取问题解析,sReuslt为回调方法
	 */

function queryResolution(questionId, sResult) {
		var sql = "select id,name from resolution where questionId=?";
		sDb.transaction(function(tx) {
			tx.executeSql(sql, [questionId], sResult, onError);
		});
	}
	/**
	 * 根据问题id获取材料
	 */

function queryMaterial(materialId, sResult) {
		var sql = "select id,name from material where id=?";
		sDb.transaction(function(tx) {
			tx.executeSql(sql, [materialId], sResult, onError);
		});
	}
	/**
	 * 根据问题id获取选项列表
	 */

function queryOption(questionId, sResult) {
		var sql = "select id,name,key from option where questionId=?";
		sDb.transaction(function(tx) {
			tx.executeSql(sql, [questionId], sResult, onError);
		});
	}
	/**
	 * 获取课程下章的错题或收藏数
	 * courseCode： 课程编码
	 * type：1代表收藏 2代表错题
	 * 返回 章名、章编码、章下的题数
	 */

function queryCourseCount(courseCode, type, callback) {
		var sql = "SELECT c.name,c.code,b.count from (SELECT substr(q.categoryCode,1,8) as code ,count(q.id) count from collect q  where type=" + type + " and q.categoryCode like '" + courseCode + "%' GROUP BY substr(q.categoryCode,1,8))as b join category c on b.code = c.code ";
		sDb.transaction(function(tx) {
			tx.executeSql(sql, [], function(tx, rs) {
				var myRows = [];
				if (rs.rows.length > 0) {
					for (var i = 0; i < rs.rows.length; i++) {
						var row = rs.rows.item(i);
						myRows.push({
							name: row.name,
							code: row.code,
							count: row.count
						});
					}
				}
				callback(myRows);
			}, onError);
		});
	}
	/**
	 * 获取章下的节的错题数和收藏数
	 * chapterCode：章编码
	 * type:1为收藏，2为错题
	 *  返回 节名、节编码、节下的题数
	 */

function queryChapterCount(chapterCode, type, callback) {
	var sql = "SELECT c.name,c.code,b.count from (SELECT substr(q.categoryCode,1,12) as code ,count(q.id) count from collect q  where type=" + type + " and q.categoryCode like '" + chapterCode + "%' GROUP BY substr(q.categoryCode,1,12))as b join category c on b.code = c.code ";
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [], function(tx, rs) {
			var myRows = [];
			if (rs.rows.length > 0) {
				for (var i = 0; i < rs.rows.length; i++) {
					var row = rs.rows.item(i);
					myRows.push({
						name: row.name,
						code: row.code,
						count: row.count
					});
				}
			}
			callback(myRows);
		}, onError);
	});
}

/**
 * 添加收藏
 * @param {Object} question
 */
function saveBookmark(question) {
		saveCollectAndBookmark(1, question.id, question.categoryCode, question.userAnswer, null, function() {});
	}
	/**
	 * 删除收藏
	 * @param {Object} questionId
	 */

function deleteBookmark(questionId) {
	var sql = "delete from collect where type = 1 and questionId = ?";
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [questionId], function() {}, onError);
	})
}

/**
 * 添加错题
 * @param {Object} question
 */

function saveCollect(question) {
		saveCollectAndBookmark(2, question.id, question.categoryCode, question.userAnswer, null, function() {});
	}
	/**
	 * 删除错题
	 * @param {Object} questionId
	 */

function delteCollect(questionId) {
	var sql = "delete from collect where type = 2 and questionId = ?";
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [questionId], function() {}, onError);
	})
}

/**
 * 保存错题和收藏题
 * type:1为收藏，2为错题;如果是错题，则answer字段不能为空
 */
function saveCollectAndBookmark(type, questionId, categoryCode, answer, costTime, sResult) {
	var sql = "insert into collect(type,questionId,categoryCode,answer,costTime) values(?,?,?,?,?)";
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [type, questionId, categoryCode, answer, costTime], sResult, onError);
	});
}

/**
 * 设置节开锁状态
 *
 */
function openSection(sectionId, sResult) {
		var sql = "update category set status =1 where id = ?";
		sDb.transaction(function(tx) {
			tx.executeSql(sql, [sectionId], sResult, onError);
		});
	}
	/**
	 * 设置章进度,已完成
	 */

function setChapterProgress(categoryId, progress, sResult) {
	var sql = "update category set progress = " + progress + " where id = ?";
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [categoryId], sResult, onError);
	});
}

function queryTest(questionId, callback) {
	var sql = 'select o.id,o.name,o.key,c.answer from option o join collect c on o.questionId = c.questionId where o.questionId = ?';
	sDb.transaction(function(tx) {
		tx.executeSql(sql, [questionId], function(tx, rs) {
			if (rs.rows.length > 0) {
				for (var i = 0; i < rs.rows.length; i++) {
					var row = rs.rows.item(i);
					console.log('=================================>' + row.name + ',' + row.answer);
				}
			}
		}, onError);
	});
}

function test() {
	//获取所有课程
	//queryAllCourse(sResult);
	//根据编码获取章节
	//queryCategory("00010001", sResult);
	//测试查询材料题
	//queryMaterial(1,sResult);
	//查询解析题
	//queryResolution(2470,sResult);
	//读取试题表
	//queryQuestion('ssss',sResult);
	//读取材料表
	//queryMaterial(53,sResult)
	//测试option表
	//queryOption(1,sResult);
	//queryCourseCount('0001',1,sResult);
	//queryChapterCount('00010001',1,sResult);
	//测试保存进度
	//	setChapterProgress(40, 20, sResult);
	//	queryCategory("00020001", sResult);
	//保存错题库
	//saveCollect('2','1','000100010001','1,2,3','10',sResult);
	queryTest('22');
}

//sql语句执行成功后执行的回调函数
function sResult(tx, rs) {}
	//sql语句执行失败后执行的回调函数

function onError(tx, error) {
	console.log("操作失败，失败信息：" + JSON.stringify(arguments))
		//	console.log("操作失败，失败信息：" + error.message);
}

//window.onload=function(){
//	test();
//}
//mui.plusReady(test);