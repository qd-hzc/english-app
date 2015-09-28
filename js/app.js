(function($) {
	//全局配置(通常所有页面引用该配置，特殊页面使用mui.init({})来覆盖全局配置)
	$.initGlobal({
		swipeBack: true
	});
	var oldBack = $.back;
	$.back = function() {
		var current = plus.webview.currentWebview();
		if (current.mType === 'main') { //模板主页面
			current.hide('auto');
			//			var cc = current.children()[0];
			//			plus.webview.close(current);
			setTimeout(function() {
				document.getElementById("title").className = 'mui-title mui-fadeout';
				current.children()[0].hide("none");
				//				plus.webview.close(cc)
			}, 200);
		} else if (current.mType === 'sub') {
			if ($.targets._popover) {
				$($.targets._popover).popover('hide');
			} else {
				current.parent().evalJS('sub : mui.back();');
			}
		} else {
			oldBack();
		}
	}
})(mui);

/**
 * toggle
 */
window.addEventListener('toggle', function(event) {
	if (event.target.id === 'M_Toggle') {
		var isActive = event.detail.isActive;
		var table = document.querySelector('.mui-table-view');
		var card = document.querySelector('.mui-card');
		if (isActive) {
			card.appendChild(table);
			card.style.display = '';
		} else {
			var content = document.querySelector('.mui-content');
			content.insertBefore(table, card);
			card.style.display = 'none';
		}
	}
});
var templates = {};
var firstClick = true;


window.addEventListener('firstClick', function() {
	firstClick = false;
});

function render(templateStr, data) {
	return templateStr.replace(/\{([\w\.]*)\}/g, function(str, key) {
		var keys = key.split("."),
			v = data[keys.shift()];
		for (var i = 0, l = keys.length; i < l; i++)
			v = v[keys[i]];
		return (typeof v !== "undefined" && v !== null) ? v : "";
	});
}

var getTemplate = function(name, header, content, loading) {
	var template = templates[name];
	if (!template) {
		//预加载共用父模板；
		var headerWebview = mui.preload({
			url: header,
			id: name + "-main",
			styles: {
				popGesture: "hide",
			},
			extras: {
				mType: 'main'
			}
		});
		//预加载共用子webview
		var subWebview = mui.preload({
			url: !content ? "" : content,
			id: name + "-sub",
			styles: {
				top: '45px',
				bottom: '0px',
			},
			extras: {
				mType: 'sub'
			}
		});
		subWebview.addEventListener('loaded', function() {
			if (!firstClick) {
				setTimeout(function() {
					subWebview.show();
				}, 50);
			}
		});
		subWebview.hide();
		headerWebview.append(subWebview);

		//iOS平台支持侧滑关闭，父窗体侧滑隐藏后，同时需要隐藏子窗体；
		if (mui.os.ios) { //5+父窗体隐藏，子窗体还可以看到？不符合逻辑吧？
			headerWebview.addEventListener('hide', function() {
				subWebview.hide("none");
			});
		}
		templates[name] = template = {
			name: name,
			header: headerWebview,
			content: subWebview,
			loaded: loading
		};
	}

	return template;
};
mui.init({
	swipeBack: false,
	keyEventBind: {
		backbutton: true
	}
});

function isGotoLoginForResolution() {
	var isAlreadyLogin = window.localStorage.getItem('isAlreadyLogin');
	if (!isAlreadyLogin) {
		mui.openWindow({
			id: 'login-win-' + window.sectionId,
			url: 'login.html',
			waiting: {
				autoShow: false
			},
			extras: {
				sectionId: window.sectionId,
				gotoUrl: 'resolution.html',
				serviceObj: window.serviceObj
			}
		});
		return false;
	}
	return true; //已经登陆
}

function isGotoLogin() {
	var isAlreadyLogin = true; // window.localStorage.getItem('isAlreadyLogin');
	if (!isAlreadyLogin) {
		mui.openWindow({
			id: 'login-win-',
			url: 'login.html',
			waiting: {
				autoShow: false
			},
			extras: {
				gotoUrl: 'dragIndex.html'
			}
		});
		return false;
	}
	return true; //已经登陆
}

function alreadyLogin(successFunc, failedFunc) {
	var isAlreadyLogin = window.localStorage.getItem('isAlreadyLogin');
	//	console.error("app.js,isAlreadyLogin-------------"+isAlreadyLogin)
	if (isAlreadyLogin == "true") {
		successFunc();
	} else {
		//		mui.toast('您需要先登录');		
		failedFunc();
	}
}

var questionMetadataa = {
	'单选题': ["materialName", "question", "option", "resolution", "materialFanyi"],
	'填空题': ["materialName", "question", "option", "resolution", "materialFanyi"],
	'英译汉': ["question", "resolution"],
	'作文': ["question", "materialName"]
};

// 元数据配置：表示哪几节是免费可看的
var okSeeMetadata = ['000100010001', '000100010002', '000100010003'];

/**
 * 检查是否是收费项目
 * @param {Object} code
 */
function checkIsContinue(code) {
	for (var i = 0; i < okSeeMetadata.length; i++) {
		if (code == okSeeMetadata[i]) return true;
	}
	return false;
}

/**
 * 题目列表的初始化方法
 */
function initDom() {
	var tq = document.getElementById('template-question-id').innerHTML;
	var to = document.getElementById('template-option-id').innerHTML;
	var tr = document.getElementById("template-resolution-id").innerHTML;
	var tc = document.getElementById("template-correct-id").innerHTML;
	var tm = document.getElementById("template-material-id").innerHTML;
	var tfanyi = document.getElementById("template-fanyi-id").innerHTML;
	var list = document.getElementById('list');
	var questionList = window.serviceObj.questionList
	var questionHtmlTemplate = '<div class="mui-card duoxuan" data-id="{id}" style="padding-top: 6px;padding-bottom: 6px;display: block;"><ul class="mui-table-view">';
	var htmlStr = '';
	if (questionList.length > 0) {
		var optionLength = questionList[0].options.length;
		if (optionLength <= 0) {
			window._disableSubmit = true;
		}
	} else {
		list.innerHTML = '<ul class="mui-table-view">' +
			'<li class="mui-table-view-cell mui-media">' +
			'<div class="mui-media-body" style="text-align: center;">' +
			'<p class="mui-ellipsis" style="">正在加载数据</p>' +
			'</div>' +
			'</li>' +
			'</ul>';
	}
	for (var i = 0; i < questionList.length; i++) {
		var all = questionList[i];
		if (!all.question.isOk) {
			all.question.isOkStyle = 'red';
		} else {
			all.question.isOkStyle = 'green';
		}
		htmlStr += render(questionHtmlTemplate, all.question);
		var orderdMetadata = questionMetadata[all.question.type];
		for (var k = 0; k < orderdMetadata.length; k++) {
			var viewOrderName = orderdMetadata[k];
			if ("materialName" == viewOrderName && all.material.name) {
				htmlStr += render(tm, all.material);
			} else if ("question" == viewOrderName && all.question.id) {
				htmlStr += render(tq, all.question);
			} else if ("answer" == viewOrderName && all.question.questionAnswer) {
				htmlStr += render(tc, all.question);
			} else if ("option" == viewOrderName && all.options.length > 0) {
				for (var m = 0; m < all.options.length; m++) {
					var option = all.options[m];
					htmlStr += render(to, option);
				}
			} else if ("resolution" == viewOrderName && all.resolution.name) {
				htmlStr += render(tr, all.resolution);
			} else if ("materialFanyi" == viewOrderName && all.material.fanyi) {
				htmlStr += render(tfanyi, all.material);
			}
		}
		htmlStr += "</ul></div>";
	}
	if (htmlStr) list.innerHTML = htmlStr;
}

function jiemi(content) {
	if (!content) return content;
	return strDec(content, "1", "2", "3");
}

function getAvaliableTime() {
	//可用总时长（分钟）
	var avaliableTime = window.localStorage.getItem('availableTime');
	avaliableTime = avaliableTime == 'undefined' ? 0 + "" : avaliableTime;
	return avaliableTime;
}

function getRemainTime() {
	//已用总时长（秒）
	var remainTime = window.localStorage.getItem('remainTime');
	if (!remainTime) {
		remainTime = 0;
	} else {
		remainTime = Math.round(parseInt(remainTime) / 60);
	}
	return remainTime;
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
 * 更新用户的所有信息到本地，主要是可以使用 的时长信息
 */
function updateUserInfoToLocal() {
	mui.ajax(Routes.urls.user.getUserInfo, {
		data: {
			phone: window.localStorage.getItem("phone"),
		},
		dataType: 'json', //服务器返回json格式数据
		type: 'post', //HTTP请求类型
		timeout: 10000, //超时时间设置为10秒；
		success: function(data) {
			if (data) {
				window.localStorage.setItem('userId', data.id);
				window.localStorage.setItem('idcard', data.idcard)
				window.localStorage.setItem('username', data.username);
				window.localStorage.setItem('availableTime', data.availableTime);

				try {
					window.localStorage.setItem('new_update_date', data.updatetimeInt);
					var oldUpdateDate = window.localStorage.getItem('old_update_date');
					oldUpdateDate = oldUpdateDate ? oldUpdateDate : 0;
					if (oldUpdateDate < data.updatetimeInt) {
						var msg = {
							title: '课时授权提醒',
							content: '您的收费内容可用课时是' + getAvaliableTime() + '分钟<br/>已用总时长是' + getRemainTime() + '分钟。'
						};
						saveMessage(msg);
						var message = '您的授权课时已更新';
						mui.toast(message);
//						mui.openWindow({
//							id: "msg-center-win",
//							url: "app/msg-center.html",
//							waiting: {
//								autoShow: true
//							}
//						});
						window.localStorage.setItem('old_update_date', data.updatetimeInt);
					}
				} catch (e) {
					console.error(JSON.stringify(e))
				}

				if (data.availableTime > data.remainTime) {
					window.localStorage.removeItem("__cant_see");
					window.localStorage.setItem('remainTime', data.remainTime * 60);
				}

				// 每格一秒进行记录一次
				window._mySecondInter = window.setInterval(function() {
					if (window.__pauseOrResume) return;
					//					if(window.___cant_use ==1 )return;
					var remainTime = window.localStorage.getItem('remainTime');
					if (remainTime == null) {
						window.localStorage.setItem('remainTime', "0");
						remainTime = window.localStorage.getItem('remainTime');
					}
					var intRemainTime = parseInt(remainTime);
					intRemainTime += 1;
					window.localStorage.setItem('remainTime', intRemainTime);

					var availableTime = window.localStorage.getItem('availableTime');
					var intAvailableTime = (parseInt(availableTime) * 60);
					if (intAvailableTime - intRemainTime < 0) {
						//												console.log('使用时间(' + intRemainTime + ')已超出购买的时间（' + availableTime + '），请先续费')
						window.___cant_use = 1;
						window.localStorage.setItem("__cant_see", 1);
						//						window.clearInterval(window._mySecondInter);
					} else {
						//												console.log('可以继续使用此app了');
						window.___cant_use = 0;
						window.localStorage.removeItem("__cant_see");
					}
				}, 1000);

				// 每隔一分钟同步一次使用时间到服务器
				window._myMinutesInter = window.setInterval(function() {
					if (window.__pauseOrResume) return;
					var remainTime = window.localStorage.getItem('remainTime');
					var intRemainTime = parseInt(remainTime);

					var availableTime = window.localStorage.getItem('availableTime');
					var intAvailableTime = (parseInt(availableTime) * 60);

					if (intRemainTime - intAvailableTime >= 0) {
						console.log('使用时间(' + intRemainTime + ')已超出购买的时间（' + intAvailableTime + '），请先续费')
						window.___cant_use = 1;
						window.localStorage.setItem("__cant_see", 1);
						window.clearInterval(window._myMinutesInter);
					}

					mui.ajax(Routes.urls.user.updateUserRemainTime, {
						data: {
							phone: window.localStorage.getItem("phone"),
							userTime: Math.round(intRemainTime / 60)
						},
						dataType: 'json', //服务器返回json格式数据
						type: 'post', //HTTP请求类型
						timeout: 10000, //超时时间设置为10秒；
						success: function(data) {
							//							if(data){
							//								window.localStorage.setItem('availableTime', data.availableTime);
							//								if (data.availableTime > data.remainTime) {
							//									window.localStorage.removeItem("__cant_see");
							//									window.localStorage.setItem('remainTime', data.remainTime * 60);
							//								}
							//							}
							console.log('------------------------------------------->更新服务器累计使用的时间成功！' + intRemainTime);
						},
						error: function() {
							console.log('------------------------------------------->网络异常，下次联网后再同步时间到服务器！' + intRemainTime);
						}
					});
				}, 60000);
			}
		},
		error: function() {
			//			alert('')
		}
	});
}

/**
 * 此app被切入后台运行事件的监听
 */
document.addEventListener("pause", function() {
	//	window.clearInterval(window._mySecondInter);
	//	window.clearInterval(window._myMinutesInter);
	window.__pauseOrResume = true;
	console.log('已终止使用时间的记录');
}, true);

document.addEventListener("resume", function() {
	window.__pauseOrResume = false;
	console.log('已继续使用时间的记录');
}, true);

/**
 *	设置wifi模式
 * @param {Object} ms
 */
function switchWifiMode(ms) {
	console.log(ms)
	window.localStorage.setItem('isWifiMode', ms);
}

/**
 * 获取wifi模式
 */
function loadWifiMode() {
	return window.localStorage.getItem('isWifiMode') == 'true';
}