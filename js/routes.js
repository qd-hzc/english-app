/**
 * 全局路由配置对象
 */
(function(w) {
//	var domain = 'http://192.168.1.145:8080/appserver/'; // test
//	var domain = 'http://lcsf.ccstudy.cn/'; //production
var domain = 'http://huijingdz.com:8080/appserver/';
	w.Routes = {
		domain: domain,
		urls: {

			// 用户相关
			user: {

				// 登录
				login: domain + 'SysUserCtrl.login.do',

				// 注册
				register: domain + 'SysUserCtrl.register.do',

				// 发送验证码到手机
				sendVerifyCode: domain + 'SysUserCtrl.sendVerifyCode.do',

				// 修改用户密码
				updatePassword: domain + 'SysUserCtrl.updatePassword.do',

				// 查询手机号是否已存在（是否已注册）
				checkPhone: domain + 'SysUserCtrl.checkPhone.do',

				// 获取某个用户的全部信息（SysUser），根据phone
				getUserInfo: domain + 'SysUserCtrl.getUserInfo.do',

				// 记录某个用户已经使用了多少小时
				updateUserRemainTime: domain + 'SysUserCtrl.updateUserRemainTime.do',

				// 用户退出登录
				logout: domain + 'SysUserCtrl.logout.do',
				
				//用户信息完善
				completeUserInfo: domain + 'SysUserCtrl.completeUserInfo.do'
			},

			// 同步加密过的数据，用于更新数据并缓存到用户的app中
			syncdata: {
				// 获取 App的大纲数的版本，用于判断是否有更新
				getAppVersion: domain + 'EnSyncDataCtrl.getAppVersion.do',
				//				listChapter: domain + 'EnSyncDataCtrl.listChapter.do',
				//				listSection: domain + 'EnSyncDataCtrl.listSection.do',

				// 根据节code获取所有试题
				listQuestion: domain + 'EnSyncDataCtrl.listQuestion.do',
				//				listCourse: domain + 'EnSyncDataCtrl.listCourse.do',

				// 查询APP所有的大纲数据，即整个en_category表
				listAllCategory: domain + 'EnSyncDataCtrl.listAllCategory.do',

				// 获取课程下的章或者章下的节
				listChapterOrSection: domain + 'EnSyncDataCtrl.listChapterOrSection.do',

				// 根据节code获取节下所有试题的material
				listMaterialBySectionId: domain + 'EnSyncDataCtrl.listMaterialBySectionId.do',

				// 根据节code获取节下的所有试题的option
				listOptionsBySectionId: domain + 'EnSyncDataCtrl.listOptionsBySectionId.do',

				// 根据节code获取节下的所有试题的resolution
				listResolutionsBySectionId: domain + 'EnSyncDataCtrl.listResolutionsBySectionId.do'
			}
		}
	};
})(window);

/**
 *	发送验证码
 * @param {Object} username 手机号
 * @param {Object} sendBtn 点击发送的按钮
 */

function sendCode(username, sendBtn, successFun) {
	var issend = sendBtn.getAttribute('issend');
	if (parseInt(issend)) {
		console.log('未发送');
		return;
	} else {
		console.log('已发送验证码');
	}
	if (username.length == 0) {
		mui.toast('请输入手机号码 ');
		return false;
	}
	if (username.length != 11) {
		mui.toast('请输入有效的手机号码 ');
		return false;
	}
	if (!myreg.test(username)) {
		mui.toast('请输入有效的手机号码 ');
		return false;
	}
	var code = username + 'liu';
	username = strEnc(username, 'q', 'w', 'e');
	code = strEnc(code, '2', '3', '4');

	mui.ajax(Routes.urls.user.sendVerifyCode, {
		data: {
			username: username,
			code: code
		},
		dataType: 'json', //服务器返回json格式数据
		type: 'post', //HTTP请求类型
		timeout: 10000, //超时时间设置为10秒；
		success: function(data) {
			mui.toast('验证码已发送 ');
			sendBtn.setAttribute('issend', 1);
			if (data && data.success) {
				var result = data.message;
				var _verifycode = result.substr(0, 6);
				successFun(_verifycode);
			} else {
				mui.toast(data.message);
			}
		},
		error: function() {
			mui.toast('网络异常');
			window.localStorage.setItem('isAlreadyLogin', false);

		}
	});
	//	successFun('111111');
}
var myreg = /^(13|14|15|18)\d{9}$/;

/**
 * 网络异常统一回调函数
 * @param {Object} xhr
 * @param {Object} type
 * @param {Object} errorThrown
 */
function networkErrorHandler(xhr, type, errorThrown) {
	var b = toastNetworkInfo();
	if(!b){
		mui.toast("请先打开网络");
	}else{
		mui.toast("网络异常，请先设置网络");
	}
}