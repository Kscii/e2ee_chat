/*****************************************************************************************************
 く__,.ヘヽ.　　　　/　,ー､ 〉
      ＼ ', !-─‐-i　/　/´
       ／｀ｰ'　　　 L/／｀ヽ､                 Live2D Widget Setting
      /　 ／,　 /|　 ,　 ,　　　 ',               Version 2.0.0
    ｲ 　/ /-‐/　ｉ　L_ ﾊ ヽ!　 i                     Konata
     ﾚ ﾍ 7ｲ｀ﾄ　 ﾚ'ｧ-ﾄ､!ハ|　 |
      !,/7 '0'　　 ´0iソ| 　 |　　　
      |.从"　　_　　 ,,,, / |./ 　 |      Add Live2D widget in your website.
      ﾚ'| i＞.､,,__　_,.イ / 　.i 　|
       ﾚ'| | / k_７_/ﾚ'ヽ,　ﾊ.　|       Thanks:
        | |/i 〈|/　 i　,.ﾍ |　i　|    fghrsh / https://www.fghrsh.net/post/123.html
       .|/ /　ｉ： 　 ﾍ!　　＼　|       journey-ad / https://github.com/journey-ad/live2d_src
         kヽ>､ﾊ 　 _,.ﾍ､ 　 /､!         xiazeyu / https://github.com/xiazeyu/live2d-widget.js
        !'〈//｀Ｔ´', ＼ ｀'7'ｰr'      Cubism Web Framework & All model authors.
        ﾚ'ヽL__|___i,___,ンﾚ|ノ
          ﾄ-,/　|___./
          'ｰ'　　!_,.
 ****************************************************************************************************/
const live2d_settings = {
    // 基本设置
    'modelUrl': '/live2d/model',                 // 存放模型的文件夹路径，末尾不需要斜杠
    'tipsMessage': '',    // 看板娘提示消息文件的路径，可以留空不加载
    // 模型设置
    'modelName': 'anon',                      // 默认加载的模型名称，仅在无本地记录的情况下有效
    'modelStorage': true,                       // 记忆模型，下次打开页面会加载上次选择的模型
    'modelRandMode': false,                     // 随机切换模型
    'preLoadMotion': false,                     // 是否预载动作数据，只对 model3 模型有效
    'tryWebp': true,                           // 优先加载 WebP 格式的贴图
    // 工具栏设置
    'showToolMenu': false,                       // 显示工具栏（已添加自定义图标样式）
    'canCloseLive2d': false,                     // 显示关闭看板娘按钮
    'canSwitchModel': false,                     // 显示模型切换按钮
    'canSwitchHitokoto': false,                  // 显示一言切换按钮
    'canTakeScreenshot': false,                  // 显示截图按钮
    'canTurnToHomePage': false,                  // 显示返回首页按钮
    'canTurnToAboutPage': false,                 // 显示跳转关于页按钮
    'showVolumeBtn': false,                     // 显示音量控制按钮
    // 提示消息设置
    'showHitokoto': true,                       // 空闲时显示一言
    'hitokotoAPI': '',                          // 一言API，可选 'hitokoto.cn'(默认), 'lwl12.com', 'jinrishici.com'(古诗词), 'fghrsh.net'
    'showWelcomeMessage': true,                 // 显示进入页面欢迎词
    'showCopyMessage': true,                    // 显示复制内容提示
    'showF12OpenMsg': true,                     // 显示控制台打开提示
    //看板娘样式设置
    'live2dHeight': 400,                        // 看板娘高度
    'live2dWidth': 300,                         // 看板娘宽度
    'waifuMinWidth': '768px',                   // 页面小于指定宽度时隐藏看板娘 
    'waifuEdgeSide': 'right:0',                // 看板娘贴边方向
    // 其他杂项设置
    'debug': true,                              // 全局DEBUG设置
    'debugMousemove': false,                    // 在控制台打印指针移动坐标
    'logMessageToConsole': true,                // 在控制台打印看板娘提示消息
    'l2dVersion': '2.0.0',                      // 当前版本
    'homePageUrl': 'auto',                      // 主页地址，可选 'auto'(自动)
    'aboutPageUrl': 'https://github.com/Konata09/Live2dOnWeb/', // 关于页地址
    'screenshotCaptureName': 'live2d.png',      // 看板娘截图文件名
}
// 模型列表
const live2d_models = [
    {
        name: 'anon',
        message: 'Live2D匿名角色模型',
        version: 2
    }
];
/****************************************************************************************************/
// SessionStorage LocalStorage 操作
const setSS = (k, v) => {
    try {
        sessionStorage.setItem(k, v);
    } catch (e) {
    }
}
const removeSS = (k) => {
    try {
        sessionStorage.removeItem(k);
    } catch (e) {
    }
}
const getSS = (k) => {
    try {
        return sessionStorage.getItem(k);
    } catch (e) {
        return null
    }
}
const setLS = (k, v) => {
    try {
        localStorage.setItem(k, v);
    } catch (e) {
    }
}
const removeLS = (k) => {
    try {
        localStorage.removeItem(k);
    } catch (e) {
    }
}
const getLS = (k) => {
    try {
        return localStorage.getItem(k);
    } catch (e) {
        return null
    }
}
String.prototype.render = function (context) {
    const tokenReg = /(\\)?{([^{}\\]+)(\\)?}/g;
    return this.replace(tokenReg, function (word, slash1, token, slash2) {
        if (slash1 || slash2) {
            return word.replace('\\', '');
        }
        const variables = token.replace(/\s/g, '').split('.');
        let currentObject = context;
        let i, length, variable;

        for (i = 0, length = variables.length; i < length; ++i) {
            variable = variables[i];
            currentObject = currentObject[variable];
            if (currentObject === undefined || currentObject === null) return '';
        }
        return currentObject;
    });
};
const $$ = (selector) => {
    try {
        const e = document.querySelectorAll(selector);
        if (e.length === 1) {
            return e[0];
        } else
            return Array.from(e);
    } catch (e) {
        console.error(e);
        return null;
    }
}
const re = /x/;
console.log(re);
const live2dId2 = 'live2d2';
const live2dId4 = 'live2d4';
const waifuTips = $$('#waifu-message');
const waifu = $$('#waifu');

function getRandText(text) {
    return Array.isArray(text) ? text[Math.floor(Math.random() * text.length + 1) - 1] : text
}

let timeoutID;

function testWebP() {
    return new Promise(res => {
        const webP = new Image();
        webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        webP.onload = webP.onerror = () => {
            res(webP.height === 2);
        };
    })
}

function showMessage(text, timeout, flag) {
    if (flag || getSS('waifu-text') === '' || getSS('waifu-text') === null) {
        if (timeoutID) window.clearTimeout(timeoutID);
        if (Array.isArray(text)) text = text[Math.floor(Math.random() * text.length + 1) - 1];
        if (live2d_settings.logMessageToConsole) console.log('[WaifuTips]', text.replace(/<[^<>]+>/g, ''));
        if (flag) setSS('waifu-text', text);
        waifuTips.style.opacity = 1;
        waifuTips.innerHTML = text;
        if (timeout === undefined) timeout = 5000;
        hideMessage(timeout);
    }
}

function hideMessage(timeout) {
    if (timeout === undefined) timeout = 5000;
    timeoutID = window.setTimeout(function () {
        removeSS('waifu-text');
        waifuTips.style.opacity = 0;
    }, timeout);
}

function changePosition(position) {
    if (position === 'left') {
        $$('.waifu-tool').style.right = 'unset';
        $$('.waifu-tool').style.left = '10px';
        waifu.style.right = 'unset';
        waifu.style.left = live2d_settings.waifuEdgeSide.split(":")[1];
    } else if (position === 'right') {
        $$('.waifu-tool').style.left = 'unset';
        $$('.waifu-tool').style.right = '10px';
        waifu.style.left = 'unset';
        waifu.style.right = live2d_settings.waifuEdgeSide.split(":")[1];
    } else {
        $$('.waifu-tool').style.left = '';
        $$('.waifu-tool').style.right = '';
        waifu.style.left = '';
        waifu.style.right = '';
    }
}

// 表情和动作对应关系 - 扩展为更丰富的组合
const expressionMotionPairs = [
    // 基础表情和动作
    { expression: 'f01', motion: 'idle', weight: 10 },        // 默认表情 - 空闲动作
    { expression: 'f02', motion: 'tap_body', weight: 8 },     // 微笑表情 - 点击身体动作
    { expression: 'f03', motion: 'surprised', weight: 5 },    // 惊讶表情 - 惊讶动作
    { expression: 'f04', motion: 'angry', weight: 5 },        // 生气表情 - 生气动作
    { expression: 'f05', motion: 'sad', weight: 5 },          // 悲伤表情 - 悲伤动作
    { expression: 'f06', motion: 'thinking', weight: 7 },     // 思考表情 - 思考动作
    { expression: 'f07', motion: 'wink', weight: 6 },         // 眨眼表情 - 眨眼动作
    { expression: 'f08', motion: 'sad', weight: 4 },          // 哭泣表情 - 悲伤动作
    { expression: 'f09', motion: 'tap_body', weight: 7 },     // 微笑2表情 - 点击身体动作
    { expression: 'f10', motion: 'angry', weight: 5 },        // 生气2表情 - 生气动作
    { expression: 'f11', motion: 'flick_head', weight: 7 },   // 严肃表情 - 摇头动作
    { expression: 'f12', motion: 'thinking', weight: 6 },     // 害羞表情 - 思考动作

    // 新增组合
    { expression: 'default', motion: 'idle', weight: 5 },
    { expression: 'smile01', motion: 'smile01', weight: 8 },
    { expression: 'smile02', motion: 'smile02', weight: 7 },
    { expression: 'smile03', motion: 'smile03', weight: 7 },
    { expression: 'smile04', motion: 'smile04', weight: 6 },
    { expression: 'sad01', motion: 'sad01', weight: 5 },
    { expression: 'sad02', motion: 'sad02', weight: 4 },
    { expression: 'angry01', motion: 'angry01', weight: 4 },
    { expression: 'angry02', motion: 'angry02', weight: 4 },
    { expression: 'angry03', motion: 'angry03', weight: 3 },
    { expression: 'angry04', motion: 'angry04', weight: 3 },
    { expression: 'serious01', motion: 'serious01', weight: 6 },
    { expression: 'serious02', motion: 'serious02', weight: 5 },
    { expression: 'shame01', motion: 'shame01', weight: 5 },
    { expression: 'shame02', motion: 'shame02', weight: 4 },
    { expression: 'thinking01', motion: 'thinking01', weight: 6 },
    { expression: 'thinking02', motion: 'thinking02', weight: 5 },
    { expression: 'thinking03', motion: 'thinking03', weight: 5 },
    { expression: 'wink01', motion: 'wink01', weight: 7 },
    { expression: 'surprised01', motion: 'surprised01', weight: 6 },
    { expression: 'cry01', motion: 'cry01', weight: 3 },
    { expression: 'cry02', motion: 'cry02', weight: 3 },

    // 创意组合 - 不同类型的表情和动作组合在一起
    { expression: 'smile01', motion: 'wink01', weight: 6 },
    { expression: 'wink01', motion: 'smile01', weight: 6 },
    { expression: 'thinking01', motion: 'flick_head', weight: 5 },
    { expression: 'smile02', motion: 'thinking01', weight: 4 },
    { expression: 'serious01', motion: 'nf_left01', weight: 4 },
    { expression: 'serious02', motion: 'nf_right01', weight: 4 },
    { expression: 'surprised01', motion: 'kandou01', weight: 5 },
    { expression: 'smile04', motion: 'kandou02', weight: 5 },
    { expression: 'shame01', motion: 'serious01', weight: 4 },
    { expression: 'wink01', motion: 'nf01', weight: 5 },
    { expression: 'angry01', motion: 'thinking01', weight: 3 }, // 生气表情但做思考动作
    { expression: 'sad01', motion: 'smile01', weight: 2 },     // 悲伤表情但做微笑动作
];

// 微小动作列表 - 用于在静止状态下随机触发的小动作
const microMotions = [
    { expression: 'f01', motion: 'idle', weight: 20 },        // 基础待机
    { expression: 'wink01', motion: 'wink01', weight: 20 },   // 眨眼
    { expression: 'f07', motion: 'wink', weight: 15 },        // 另一种眨眼
    { expression: 'smile01', motion: 'smile01', weight: 10 }, // 微笑
    { expression: 'smile02', motion: 'smile02', weight: 10 }, // 微笑2
    { expression: 'nf01', motion: 'nf01', weight: 8 },        // 轻微点头
    { expression: 'nf_left01', motion: 'nf_left01', weight: 5 }, // 向左轻微摇头
    { expression: 'nf_right01', motion: 'nf_right01', weight: 5 }, // 向右轻微摇头
];

// 动作序列 - 为特定情境预定义的动作序列
const motionSequences = [
    {
        name: "思考序列",
        sequence: [
            { expression: 'thinking01', motion: 'thinking01', duration: 3000 },
            { expression: 'thinking02', motion: 'thinking02', duration: 3000 },
            { expression: 'thinking03', motion: 'thinking03', duration: 3000 },
            { expression: 'smile01', motion: 'smile01', duration: 2500 }
        ],
        weight: 3
    },
    {
        name: "打招呼序列",
        sequence: [
            { expression: 'smile01', motion: 'smile01', duration: 2000 },
            { expression: 'wink01', motion: 'wink01', duration: 1500 },
            { expression: 'smile02', motion: 'smile02', duration: 2000 }
        ],
        weight: 4
    },
    {
        name: "惊讶序列",
        sequence: [
            { expression: 'surprised01', motion: 'surprised01', duration: 2000 },
            { expression: 'kandou01', motion: 'kandou01', duration: 2500 },
            { expression: 'smile01', motion: 'smile01', duration: 2000 }
        ],
        weight: 2
    },
    {
        name: "害羞序列",
        sequence: [
            { expression: 'shame01', motion: 'shame01', duration: 2500 },
            { expression: 'shame02', motion: 'shame02', duration: 2500 },
            { expression: 'serious01', motion: 'serious01', duration: 2000 }
        ],
        weight: 2
    }
];

// 最近使用的表情和动作，用于避免短时间内重复
let recentExpressions = [];
let recentMotions = [];
const MAX_RECENT_ITEMS = 5; // 记录最近使用的项目数量

// 当前正在执行的序列
let currentSequence = null;
let sequenceIndex = 0;
let sequenceTimer = null;

// 自动定时切换表情和动作的计时器ID
let autoMotionTimerId = null;

// 微小动作的计时器ID
let microMotionTimerId = null;

// 自动定时切换表情和动作
function startAutoMotionChange() {
    // 清除之前的计时器（如果存在）
    if (autoMotionTimerId) {
        clearInterval(autoMotionTimerId);
    }

    // 清除微小动作计时器（如果存在）
    if (microMotionTimerId) {
        clearInterval(microMotionTimerId);
    }

    // 设置新的计时器，每5秒切换一次（原来是10秒）
    autoMotionTimerId = setInterval(() => {
        // 有20%的几率播放动作序列，其余时间随机选择单个表情动作（原来是10%）
        if (Math.random() < 0.2 && motionSequences.length > 0) {
            playRandomMotionSequence();
        } else {
            // 如果当前没有在播放序列，则随机切换表情和动作
            if (!currentSequence) {
                randomExpressionMotion();
            }
        }

        if (live2d_settings.debug) {
            console.log('[Live2D] 自动切换动作已执行，下一次将在5秒后');
        }
    }, 5000);

    // 设置微小动作计时器，每1.5-3秒随机触发一次微小动作
    startMicroMotions();

    if (live2d_settings.debug) {
        console.log('[Live2D] 自动动作切换已启动，间隔5秒');
    }
}

// 启动微小动作系统
function startMicroMotions() {
    // 如果已经有计时器，先清除
    if (microMotionTimerId) {
        clearInterval(microMotionTimerId);
    }

    // 随机触发微小动作
    function triggerMicroMotion() {
        // 如果当前正在播放序列或者主要动作，不触发微小动作
        if (currentSequence) return;

        // 随机决定是否触发动作（60%的几率触发某种动作）
        if (Math.random() < 0.6) {
            // 决定触发大动作还是微小动作
            // 有15%的几率触发大动作，85%的几率触发微小动作
            const triggerMajorMotion = Math.random() < 0.15;

            if (triggerMajorMotion) {
                // 触发大动作 - 从表情动作对中选择
                // 过滤出适合作为大动作的动作类型
                const majorMotionTypes = [
                    'tap_body', 'surprised', 'angry', 'thinking',
                    'flick_head', 'kandou01', 'kandou02'
                ];

                // 从完整的表情动作对中选择一些权重较高的作为随机大动作
                let availablePairs = expressionMotionPairs.filter(pair =>
                    majorMotionTypes.includes(pair.motion) && (pair.weight || 0) > 4
                );

                if (availablePairs.length === 0) {
                    availablePairs = expressionMotionPairs.filter(pair =>
                        majorMotionTypes.includes(pair.motion)
                    );
                }

                // 如果还是没有，就从所有表情动作对中选择
                if (availablePairs.length === 0) {
                    availablePairs = [...expressionMotionPairs];
                }

                // 根据权重随机选择
                const totalWeight = availablePairs.reduce((sum, pair) => sum + (pair.weight || 1), 0);
                let randomWeight = Math.random() * totalWeight;
                let selectedPair = null;

                for (const pair of availablePairs) {
                    randomWeight -= (pair.weight || 1);
                    if (randomWeight <= 0) {
                        selectedPair = pair;
                        break;
                    }
                }

                // 如果选中了一个大动作，执行它
                if (selectedPair && window.live2dCurrentVersion === 2 && window.live2dv2.model) {
                    // 切换表情
                    if (window.live2dv2.model.expressions) {
                        window.live2dv2.model.setExpression(selectedPair.expression);
                    }

                    // 执行动作
                    if (window.live2dv2.model.motions[selectedPair.motion]) {
                        const motions = window.live2dv2.model.motions[selectedPair.motion];
                        const randomMotionIndex = Math.floor(Math.random() * motions.length);
                        window.live2dv2.model.startMotion(selectedPair.motion, randomMotionIndex, 2);

                        if (live2d_settings.debug) {
                            console.log(`[Live2D] 触发大动作: ${selectedPair.expression}, ${selectedPair.motion}`);
                        }
                    }
                }
            } else {
                // 触发微小动作 - 从微小动作列表中选择
                const totalWeight = microMotions.reduce((sum, motion) => sum + (motion.weight || 1), 0);
                let randomWeight = Math.random() * totalWeight;
                let selectedMotion = null;

                for (const motion of microMotions) {
                    randomWeight -= (motion.weight || 1);
                    if (randomWeight <= 0) {
                        selectedMotion = motion;
                        break;
                    }
                }

                // 如果选到了动作，执行它
                if (selectedMotion && window.live2dCurrentVersion === 2 && window.live2dv2.model) {
                    // 切换表情（如果必要）
                    if (selectedMotion.expression && window.live2dv2.model.expressions) {
                        window.live2dv2.model.setExpression(selectedMotion.expression);
                    }

                    // 执行动作
                    if (selectedMotion.motion && window.live2dv2.model.motions[selectedMotion.motion]) {
                        const motions = window.live2dv2.model.motions[selectedMotion.motion];
                        const randomMotionIndex = Math.floor(Math.random() * motions.length);
                        window.live2dv2.model.startMotion(selectedMotion.motion, randomMotionIndex, 1); // 优先级设为1，低于主要动作

                        if (live2d_settings.debug) {
                            console.log(`[Live2D] 触发微小动作: ${selectedMotion.expression}, ${selectedMotion.motion}`);
                        }
                    }
                }
            }
        }

        // 随机设定下一次触发时间
        // 大动作后需要更长的恢复时间 (2-4秒)，微小动作后间隔短 (1-2秒)
        const baseInterval = 1000 + Math.random() * 1000;  // 1-2秒的基础间隔
        const nextInterval = baseInterval * (triggerMajorMotion ? 2 : 1); // 如果刚触发了大动作，延长间隔

        microMotionTimerId = setTimeout(triggerMicroMotion, nextInterval);
    }

    // 启动第一次触发
    triggerMicroMotion();
}

// 播放随机动作序列
function playRandomMotionSequence() {
    // 如果已经在播放序列，则先停止
    if (currentSequence) {
        clearTimeout(sequenceTimer);
        currentSequence = null;
    }

    // 根据权重随机选择一个序列
    const totalWeight = motionSequences.reduce((sum, seq) => sum + (seq.weight || 1), 0);
    let randomWeight = Math.random() * totalWeight;
    let selectedSequence = null;

    for (const sequence of motionSequences) {
        randomWeight -= (sequence.weight || 1);
        if (randomWeight <= 0) {
            selectedSequence = sequence;
            break;
        }
    }

    // 如果没有选到序列（可能是权重计算问题），则选第一个
    if (!selectedSequence && motionSequences.length > 0) {
        selectedSequence = motionSequences[0];
    }

    // 开始播放序列
    if (selectedSequence) {
        currentSequence = selectedSequence;
        sequenceIndex = 0;
        playCurrentSequenceStep();

        if (live2d_settings.debug) {
            console.log(`[Live2D] 开始播放动作序列: ${selectedSequence.name}`);
        }
    }
}

// 播放当前序列的当前步骤
function playCurrentSequenceStep() {
    if (!currentSequence || sequenceIndex >= currentSequence.sequence.length) {
        currentSequence = null;
        return;
    }

    const step = currentSequence.sequence[sequenceIndex];

    // 设置表情和动作
    if (window.live2dCurrentVersion === 2 && window.live2dv2.model) {
        // 切换表情
        if (window.live2dv2.model.expressions) {
            window.live2dv2.model.setExpression(step.expression);
        }

        // 切换动作
        if (window.live2dv2.model.motions[step.motion]) {
            const motions = window.live2dv2.model.motions[step.motion];
            const randomMotionIndex = Math.floor(Math.random() * motions.length);
            window.live2dv2.model.startMotion(step.motion, randomMotionIndex, 2);
        }

        if (live2d_settings.debug) {
            console.log(`[Live2D] 序列步骤 ${sequenceIndex + 1}/${currentSequence.sequence.length}: ${step.expression}, ${step.motion}`);
        }
    }

    // 计划下一步
    sequenceIndex++;
    if (sequenceIndex < currentSequence.sequence.length) {
        sequenceTimer = setTimeout(playCurrentSequenceStep, step.duration);
    } else {
        setTimeout(() => { currentSequence = null; }, step.duration);
    }
}

// 随机切换表情和动作
function randomExpressionMotion(event) {
    // 如果当前正在播放序列，则不要打断
    if (currentSequence) return;

    // 获取并记录模型当前位置
    const modelElement = waifu;
    const modelRect = modelElement.getBoundingClientRect();
    const canvasElement = window.live2dCurrentVersion === 2 ? $$(`#${live2dId2}`) : $$(`#${live2dId4}`);
    const canvasRect = canvasElement.getBoundingClientRect();

    // 计算点击坐标相对于模型的位置
    const clickX = event ? event.clientX : 0;
    const clickY = event ? event.clientY : 0;
    const relativeX = clickX - canvasRect.left;
    const relativeY = clickY - canvasRect.top;

    // 根据点击位置选择不同的动作类型 (如果是点击事件)
    let motionType = null;
    if (event) {
        // 计算点击区域 (头部、身体等)
        const headXRange = [canvasRect.width * 0.3, canvasRect.width * 0.7];
        const headYRange = [0, canvasRect.height * 0.3];
        const bodyYRange = [canvasRect.height * 0.3, canvasRect.height * 0.7];

        if (relativeX >= headXRange[0] && relativeX <= headXRange[1] &&
            relativeY >= headYRange[0] && relativeY <= headYRange[1]) {
            // 头部点击 - 使用flick_head类型的动作
            motionType = 'flick_head';
        } else if (relativeY >= bodyYRange[0] && relativeY <= bodyYRange[1]) {
            // 身体点击 - 使用tap_body类型的动作
            motionType = 'tap_body';
        }
    }


    if (window.live2dCurrentVersion === 2) {
        // 根据权重随机选择一个表情和动作对
        // 过滤出有效的表情动作对 (如果指定了motionType，则只选择该类型的动作)
        let availablePairs = [...expressionMotionPairs];

        if (motionType) {
            availablePairs = availablePairs.filter(pair => {
                return window.live2dv2.model.motions[motionType] &&
                    window.live2dv2.model.expressions &&
                    window.live2dv2.model.expressions[pair.expression];
            });
        } else {
            availablePairs = availablePairs.filter(pair => {
                return window.live2dv2.model.motions[pair.motion] &&
                    window.live2dv2.model.expressions &&
                    window.live2dv2.model.expressions[pair.expression];
            });
        }

        // 尽量避免选择最近使用过的表情和动作
        const lessDuplicatedPairs = availablePairs.filter(pair => {
            return !recentExpressions.includes(pair.expression) &&
                !recentMotions.includes(pair.motion);
        });

        // 如果过滤后没有可用的组合，则使用所有有效组合
        const pairsToUse = lessDuplicatedPairs.length > 0 ? lessDuplicatedPairs : availablePairs;

        // 根据权重随机选择
        const totalWeight = pairsToUse.reduce((sum, pair) => sum + (pair.weight || 1), 0);
        let randomWeight = Math.random() * totalWeight;
        let randomPair = null;

        for (const pair of pairsToUse) {
            randomWeight -= (pair.weight || 1);
            if (randomWeight <= 0) {
                randomPair = pair;
                break;
            }
        }

        // 如果没有选到，则选第一个 (理论上不应该发生)
        if (!randomPair && pairsToUse.length > 0) {
            randomPair = pairsToUse[0];
        }

        // 如果指定了motionType，则使用该type下的动作，但保留选择的表情
        if (motionType && randomPair) {
            randomPair = {
                expression: randomPair.expression,
                motion: motionType
            };
        }

        if (randomPair) {
            // 更新最近使用记录
            recentExpressions.push(randomPair.expression);
            recentMotions.push(randomPair.motion);

            // 保持最近使用记录不超过限制
            if (recentExpressions.length > MAX_RECENT_ITEMS) {
                recentExpressions.shift();
            }
            if (recentMotions.length > MAX_RECENT_ITEMS) {
                recentMotions.shift();
            }

            // 切换表情
            if (window.live2dv2.model.expressions) {
                window.live2dv2.model.setExpression(randomPair.expression);
            }

            // 切换动作
            if (window.live2dv2.model.motions[randomPair.motion]) {
                const motions = window.live2dv2.model.motions[randomPair.motion];
                const randomMotionIndex = Math.floor(Math.random() * motions.length);
                window.live2dv2.model.startMotion(randomPair.motion, randomMotionIndex, 2);
            }

            if (live2d_settings.debug) {
                console.log(`[Live2D] 随机切换表情: ${randomPair.expression}, 动作: ${randomPair.motion}`);
            }
        }
    }

    // 保持模型位置固定，避免动作导致位置变化
    // 300ms后恢复位置，给予足够时间让动作开始执行
    setTimeout(() => {
        // 如果位置发生变化，恢复到原来的位置
        const currentRect = modelElement.getBoundingClientRect();
        if (Math.abs(currentRect.left - modelRect.left) > 2 || Math.abs(currentRect.width - modelRect.width) > 2) {
            // 记录当前样式中是用left还是right定位
            const style = window.getComputedStyle(modelElement);
            if (style.left !== 'auto' && style.left !== '0px') {
                modelElement.style.left = modelRect.left + 'px';
            } else if (style.right !== 'auto' && style.right !== '0px') {
                modelElement.style.right = (window.innerWidth - modelRect.right) + 'px';
            }
            if (live2d_settings.debug) {
                console.log('[Live2D] 位置已修复');
            }
        }
    }, 300);
}

function initModel() {
    /* Load style sheet */
    addStyle(waifuStyle);
    if (getSS('waifuHide') === '1') {
        waifu.classList.add('hide');
        return;
    } else if (window.innerWidth <= Number(live2d_settings.waifuMinWidth.replace('px', ''))) {
        waifu.classList.add('hide');
        return;
    } else {
        waifu.classList.remove('hide');
    }
    /* console welcome message */
    console.log("\u304f__,.\u30d8\u30fd.\u3000\u3000\u3000\u3000/\u3000,\u30fc\uff64 \u3009\n\u3000\u3000\u3000\u3000\u3000\uff3c ', !-\u2500\u2010-i\u3000/\u3000/\u00b4\n\u3000\u3000\u3000 \u3000 \uff0f\uff40\uff70'\u3000\u3000\u3000 L/\uff0f\uff40\u30fd\uff64\n\u3000\u3000 \u3000 /\u3000 \uff0f,\u3000 /|\u3000 ,\u3000 ,\u3000\u3000\u3000 ',\n\u3000\u3000\u3000\uff72 \u3000/ /-\u2010/\u3000\uff49\u3000L_ \uff8a \u30fd!\u3000 i\n\u3000\u3000\u3000 \uff9a \uff8d 7\uff72\uff40\uff84\u3000 \uff9a'\uff67-\uff84\uff64!\u30cf|\u3000 |\n\u3000\u3000\u3000\u3000 !,/7 '0'\u3000\u3000 \u00b40i\u30bd| \u3000 |\u3000\u3000\u3000\n\u3000\u3000\u3000\u3000 |.\u4ece\"\u3000\u3000_\u3000\u3000 ,,,, / |./ \u3000 |\n\u3000\u3000\u3000\u3000 \uff9a'| i\uff1e.\uff64,,__\u3000_,.\u30a4 / \u3000.i \u3000|\n\u3000\u3000\u3000\u3000\u3000 \uff9a'| | / k_\uff17_/\uff9a'\u30fd,\u3000\uff8a.\u3000|\n\u3000\u3000\u3000\u3000\u3000\u3000 | |/i \u3008|/\u3000 i\u3000,.\uff8d |\u3000i\u3000|\n\u3000\u3000\u3000\u3000\u3000\u3000.|/ /\u3000\uff49\uff1a \u3000 \uff8d!\u3000\u3000\uff3c\u3000|\n\u3000\u3000\u3000 \u3000 \u3000 k\u30fd>\uff64\uff8a \u3000 _,.\uff8d\uff64 \u3000 /\uff64!\n\u3000\u3000\u3000\u3000\u3000\u3000 !'\u3008//\uff40\uff34\u00b4', \uff3c \uff40'7'\uff70r'\n\u3000\u3000\u3000\u3000\u3000\u3000 \uff9a'\u30fdL__|___i,___,\u30f3\uff9a|\u30ce\n\u3000\u3000\u3000\u3000\u3000 \u3000\u3000\u3000\uff84-,/\u3000|___./\n\u3000\u3000\u3000\u3000\u3000 \u3000\u3000\u3000'\uff70'\u3000\u3000!_,.:\nLive2D \u770b\u677f\u5a18 v" + live2d_settings.l2dVersion + " / Konata");

    $$(`#${live2dId2}`).setAttribute('height', live2d_settings.live2dHeight);
    $$(`#${live2dId2}`).setAttribute('width', live2d_settings.live2dWidth);
    $$(`#${live2dId4}`).setAttribute('height', live2d_settings.live2dHeight);
    $$(`#${live2dId4}`).setAttribute('width', live2d_settings.live2dWidth);
    if (!live2d_settings.showToolMenu) $$('.waifu-tool').classList.add('hide');
    if (!live2d_settings.canCloseLive2d) $$('.waifu-tool .icon-cross').classList.add('hide');
    if (!live2d_settings.canSwitchModel) $$('.waifu-tool .icon-next').classList.add('hide');
    if (!live2d_settings.canSwitchHitokoto) $$('.waifu-tool .icon-message').classList.add('hide');
    if (!live2d_settings.canTakeScreenshot) $$('.waifu-tool .icon-camera').classList.add('hide');
    if (!live2d_settings.canTurnToHomePage) $$('.waifu-tool .icon-home').classList.add('hide');
    if (!live2d_settings.canTurnToAboutPage) $$('.waifu-tool .icon-about').classList.add('hide');
    if (!live2d_settings.showVolumeBtn) $$('.waifu-tool .icon-volumeup').classList.add('hide') || $$('.waifu-tool .icon-volumedown').classList.add('hide');
    $$('.waifu-tool .icon-next').addEventListener('click', () => loadOtherModel());
    $$('.waifu-tool .icon-home').addEventListener('click', () => window.location = live2d_settings.homePageUrl)
    $$('.waifu-tool .icon-about').addEventListener('click', () => window.open(live2d_settings.aboutPageUrl))
    $$('.waifu-tool .icon-camera').addEventListener('click', () => {
        window.live2dCurrentVersion === 3 ? window.live2dv4.CaptureCanvas() : window.live2dv2.captureFrame = true;
    });
    $$('.waifu-tool .icon-cross').addEventListener('click', () => {
        sessionStorage.setItem('waifuHide', '1');
        window.setTimeout(function () {
            waifu.classList.add('hide');
            // document.getElementById('show-live2d').classList.remove('btnHide');
        }, 1000);
    })

    window.waifuResize = () => {
        if (getSS('waifuHide') !== '1')
            window.innerWidth <= Number(live2d_settings.waifuMinWidth.replace('px', '')) ? waifu.classList.add('hide') : waifu.classList.remove('hide');
    };

    if (live2d_settings.waifuMinWidth !== 'disable') {
        waifuResize();
        window.addEventListener('resize', waifuResize)
    }

    live2d_settings.homePageUrl = live2d_settings.homePageUrl === 'auto' ? window.location.protocol + '//' + window.location.hostname + '/' : live2d_settings.homePageUrl;

    if (live2d_settings.tipsMessage)
        window.fetch(live2d_settings.tipsMessage)
            .then(res => res.json())
            .then(resjson => loadTipsMessage(resjson));

    let modelName = getLS('modelName');

    if (!live2d_settings.modelStorage || modelName == null)
        modelName = live2d_settings.modelName;

    window.live2dv4.setPreLoadMotion(live2d_settings.preLoadMotion);
    window.live2dv2.debug = live2d_settings.debug;
    window.live2dv4.debug = live2d_settings.debug;
    window.live2dv2.debugMousemove = live2d_settings.debug && live2d_settings.debugMousemove;
    window.live2dv4.debugMousemove = live2d_settings.debug && live2d_settings.debugMousemove;
    if (live2d_settings.tryWebp) {
        testWebP().then(r => window.webpReady = r).then(() => {
            if (window.webpReady === true)
                console.log("[WaifuTips] Your browser support WebP format. Try to load WebP texture first.");
            else
                console.log("[WaifuTips] Your browser do not support WebP format.");
            loadModel(modelName);
        });
    } else {
        loadModel(modelName);
    }

    // 为canvas添加点击事件
    $$(`#${live2dId2}`).addEventListener('click', randomExpressionMotion);
    $$(`#${live2dId4}`).addEventListener('click', randomExpressionMotion);
}

function loadModel(modelName) {
    let modelVersion;
    if (live2d_models.findIndex(m => m.name === modelName) === -1) modelName = live2d_settings.modelName;
    const index = live2d_models.findIndex(m => m.name === modelName);
    const modelInfo = live2d_models[index];
    if (!modelInfo) {
        console.error(`未找到模型: ${modelName}`);
        return;
    }
    modelVersion = modelInfo.version !== undefined ? modelInfo.version : 2;
    waifuTips.style.opacity = 0;
    waifuTips.style.visibility = 'hidden';
    // 隐藏看板娘，防止加载前显示太久
    waifu.style.visibility = 'hidden';
    waifu.style.bottom = '-500px';
    window.setTimeout(function () {
        waifu.style.visibility = '';
        waifu.style.bottom = '0';
    }, 0);

    if (live2d_settings.debug) console.log('[Live2D]', `加载模型: ${modelName}`);
    // 载入模型
    if (modelVersion === 2) {
        // v2.0
        window.live2dCurrentVersion = 2;
        $$(`#${live2dId2}`).style.display = '';
        $$(`#${live2dId4}`).style.display = 'none';
        window.live2dv2.loadModel(`${live2d_settings.modelUrl}/${modelName}/model.json`);
    } else {
        // v4.0
        window.live2dCurrentVersion = 4;
        window.live2d = window.l2d = window.live2dv4;
        $$(`#${live2dId2}`).style.display = 'none';
        $$(`#${live2dId4}`).style.display = '';
        live2dv4.init(`${live2d_settings.modelUrl}/${modelName}`, null, { default_motion: 'idle' });
    }

    // 记录到模型到LocalStorage
    if (live2d_settings.modelStorage) setLS('modelName', modelName);

    // 启动自动切换动作
    startAutoMotionChange();
}

// 读取记忆的模型
function modelStorageGetItem(key) {
    return live2d_settings.modelStorage ? getLS(key) : getSS(key);
}

function loadOtherModel() {
    const modelName = modelStorageGetItem('modelName');
    let modelIndex = 0;
    if (live2d_settings.modelRandMode) {
        modelIndex = Math.floor(Math.random() * live2d_models.length + 1) - 1;
    } else {
        modelIndex = live2d_models.findIndex(modelObj => modelObj.name === modelName)
        if (modelIndex < live2d_models.length - 1)
            modelIndex++;
        else
            modelIndex = 0;
    }
    if (live2d_models[modelIndex].message) showMessage(live2d_models[modelIndex].message, 3000, true);
    loadModel(live2d_models[modelIndex].name);
}


function loadTipsMessage(result) {
    window.waifu_tips = result;

    const mouseenterListener = (e, tips) => {
        e.addEventListener('mouseenter', () => {
            let text = getRandText(tips.text);
            if (text.indexOf("{text}") > 0)
                text = text.replace(/{text}/, e.innerText);
            showMessage(text, 3000);
        });
    }
    const addMouseoverListener = () => {
        for (let tips of result.mouseover) {
            const select = $$(tips.selector);
            if (Array.isArray(select))
                select.forEach(e => mouseenterListener(e, tips));
            else if (select)
                mouseenterListener(select, tips);
            else
                live2d_settings.debug && console.warn(`[WaifuTips] can not found element: ${tips.selector}`)
        }
    }
    const addClickListener = () => {
        for (let tips of result.click) {
            const select = $$(tips.selector);
            if (Array.isArray(select))
                select.forEach(e => e.addEventListener('click', () => {
                    let text = getRandText(tips.text);
                    showMessage(text, 3000, true);
                }))
            else if (select)
                select.addEventListener('click', () => {
                    let text = getRandText(tips.text);
                    showMessage(text, 3000, true);
                })
            else
                live2d_settings.debug && console.warn(`[WaifuTips] can not found element: ${tips.selector}`)
        }
    }
    for (let tips of result.seasons) {
        const now = new Date();
        const after = tips.date.split('-')[0];
        const before = tips.date.split('-')[1] || after;
        if ((after.split('/')[0] <= now.getMonth() + 1 && now.getMonth() + 1 <= before.split('/')[0]) &&
            (after.split('/')[1] <= now.getDate() && now.getDate() <= before.split('/')[1])) {
            let text = getRandText(tips.text);
            if (text.indexOf("{year}") > 0)
                text = text.replace(/{year}/, now.getFullYear());
            showMessage(text, 6000, true);
        }
    }
    if (live2d_settings.showF12OpenMsg) {
        re.toString = function () {
            showMessage(getRandText(result.waifu.console_open_msg), 5000, true);
            return '';
        };
    }
    const addCopyListener = () => {
        if ($$('#articleContent').length !== 0)
            $$('#articleContent').addEventListener('copy', () => (showMessage(getRandText(result.waifu.copy_message), 5000, true)));
    }
    window.showWelcomeMessage = function (result) {
        let text;
        if (window.location.href === live2d_settings.homePageUrl) {
            const now = (new Date()).getHours();
            if (now > 23 || now <= 5) text = getRandText(result.waifu.hour_tips['t23-5']);
            else if (now > 5 && now <= 7) text = getRandText(result.waifu.hour_tips['t5-7']);
            else if (now > 7 && now <= 11) text = getRandText(result.waifu.hour_tips['t7-11']);
            else if (now > 11 && now <= 14) text = getRandText(result.waifu.hour_tips['t11-14']);
            else if (now > 14 && now <= 17) text = getRandText(result.waifu.hour_tips['t14-17']);
            else if (now > 17 && now <= 19) text = getRandText(result.waifu.hour_tips['t17-19']);
            else if (now > 19 && now <= 21) text = getRandText(result.waifu.hour_tips['t19-21']);
            else if (now > 21 && now <= 23) text = getRandText(result.waifu.hour_tips['t21-23']);
            else text = getRandText(result.waifu.hour_tips.default);
        } else {
            const referrer_message = result.waifu.referrer_message;
            if (document.referrer !== '') {
                const referrer = document.createElement('a');
                referrer.href = document.referrer;
                const domain = referrer.hostname.split('.')[1];
                if (window.location.hostname === referrer.hostname)
                    text = referrer_message.localhost[0] + document.title.split(referrer_message.localhost[2])[0] + referrer_message.localhost[1];
                else if (domain === 'baidu')
                    text = referrer_message.baidu[0] + referrer.search.split('&wd=')[1].split('&')[0] + referrer_message.baidu[1];
                else if (domain === 'so')
                    text = referrer_message.so[0] + referrer.search.split('&q=')[1].split('&')[0] + referrer_message.so[1];
                else if (domain === 'google')
                    text = referrer_message.google[0] + document.title.split(referrer_message.google[2])[0] + referrer_message.google[1];
                else {
                    text = referrer_message.default[0] + referrer.hostname + referrer_message.default[1];
                    for (let host in result.waifu.referrer_hostname)
                        if (host === referrer.hostname) {
                            text = getRandText(result.waifu.referrer_hostname[host]);
                            break;
                        }
                }
            } else text = referrer_message.none[0] + document.title.split(referrer_message.none[2])[0] + referrer_message.none[1];
        }
        showMessage(text, 6000);
    };
    if (live2d_settings.showWelcomeMessage) showWelcomeMessage(result);

    const waifu_tips = result.waifu;

    if (live2d_settings.showHitokoto) {
        window.getActed = false;
        window.hitokotoTimer = 0;
        window.hitokotoInterval = false;
        setInterval(function () {
            if (!getActed) ifActed();
            else elseActed();
        }, 1000);
    }
    /* 检测用户活动状态，并在空闲时显示一言 */
    const addHitokotoListener = () => {
        document.addEventListener('mousemove', () => (getActed = true))
        document.addEventListener('keydown', () => (getActed = true))
    }

    if (document.readyState === "interactive" || document.readyState === "complete") {
        addMouseoverListener();
        addClickListener();
        if (live2d_settings.showCopyMessage) addCopyListener();
        if (live2d_settings.showHitokoto) addHitokotoListener();
    } else {
        window.addEventListener("DOMContentLoaded", addMouseoverListener);
        window.addEventListener("DOMContentLoaded", addClickListener);
        if (live2d_settings.showCopyMessage) window.addEventListener("DOMContentLoaded", addCopyListener);
        if (live2d_settings.showHitokoto) window.addEventListener("DOMContentLoaded", addHitokotoListener);
    }

    function ifActed() {
        if (!hitokotoInterval) {
            hitokotoInterval = true;
            hitokotoTimer = window.setInterval(showHitokotoActed, 30000);
        }
    }

    function elseActed() {
        getActed = hitokotoInterval = false;
        window.clearInterval(hitokotoTimer);
    }

    function showHitokotoActed() {
        if (document.visibilityState === 'visible') showHitokoto();
    }

    function showHitokoto() {
        switch (live2d_settings.hitokotoAPI) {
            case 'lwl12.com':
                window.fetch('https://api.lwl12.com/hitokoto/v1?encode=realjson')
                    .then(res => res.json())
                    .then(resJson => {
                        if (!resJson.source) {
                            let text = waifu_tips.hitokoto_api_message['lwl12.com'][0];
                            if (!resJson.author) text += waifu_tips.hitokoto_api_message['lwl12.com'][1];
                            text = text.render({ source: resJson.source, creator: resJson.author });
                            window.setTimeout(function () {
                                showMessage(text + waifu_tips.hitokoto_api_message['lwl12.com'][2], 3000, true);
                            }, 5000);
                        }
                        showMessage(resJson.text, 5000, true);
                    })
                break;
            case 'fghrsh.net':
                window.fetch('https://api.fghrsh.net/hitokoto/rand/?encode=jsc&uid=3335')
                    .then(res => res.json())
                    .then(resJson => {
                        if (!resJson.source) {
                            let text = waifu_tips.hitokoto_api_message['fghrsh.net'][0];
                            text = text.render({ source: resJson.source, date: resJson.date });
                            window.setTimeout(function () {
                                showMessage(text, 3000, true);
                            }, 5000);
                            showMessage(resJson.hitokoto, 5000, true);
                        }
                    })
                break;
            case 'jinrishici.com':
                window.fetch('https://v2.jinrishici.com/one.json')
                    .then(res => res.json())
                    .then(resJson => {
                        if (!resJson.data.origin.title) {
                            let text = waifu_tips.hitokoto_api_message['jinrishici.com'][0];
                            text = text.render({
                                title: resJson.data.origin.title,
                                dynasty: resJson.data.origin.dynasty,
                                author: resJson.data.origin.author
                            });
                            window.setTimeout(function () {
                                showMessage(text, 3000, true);
                            }, 5000);
                        }
                        showMessage(resJson.data.content, 5000, true);
                    })
                break;
            default:
                window.fetch('https://v1.hitokoto.cn')
                    .then(res => res.json())
                    .then(resJson => {
                        if (!resJson.from) {
                            let text = waifu_tips.hitokoto_api_message['hitokoto.cn'][0];
                            text = text.render({ source: resJson.from, creator: resJson.creator });
                            window.setTimeout(function () {
                                showMessage(text, 3000, true);
                            }, 5000);
                        }
                        showMessage(resJson.hitokoto, 5000, true);
                    })
        }
    }

    $$('.waifu-tool .icon-message').addEventListener('click', () => showHitokoto());
}

const addStyle = (() => {
    const style = document.createElement('style');
    document.head.append(style);
    return (styleString) => style.textContent = styleString;
})();

const blobDownload = (blob) => {
    if (typeof blob == 'object' && blob instanceof Blob) {
        blob = URL.createObjectURL(blob); // 创建blob地址
    }
    const aLink = document.createElement('a');
    aLink.href = blob;
    aLink.download = live2d_settings.screenshotCaptureName || 'live2d.png'; // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
    let event;
    if (window.MouseEvent) event = new MouseEvent('click');
    else {
        event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    }
    aLink.dispatchEvent(event);
}

const waifuStyle = `
        #waifu {
        ${live2d_settings.waifuEdgeSide}px;
        position:fixed;
        bottom:0;
        z-index:10000;
        font-size:0
        }
        
        #waifu-message {
        font-size:1rem;
        width:fit-content;
        height:auto;
        left:2rem;
        top:20px;
        opacity:0;
        z-index:10001;
        margin:auto;
        padding:5px 10px;
        border:1px solid rgba(104,216,255,0.62);
        border-radius:12px;
        background-color:rgba(76,191,255,0.8);
        box-shadow:0 3px 15px 2px rgba(16,51,49,0.3);
        text-overflow:ellipsis;
        overflow:hidden;
        position:relative;
        transition:opacity .3s ease
        }
        
        #waifu-message>a {
        color:#7500b7;
        }
        
        #live2d2,#live2d4 {
        position:relative;
        display:none;
        z-index:9999
        }
        
        .waifu-tool {
        display:none;
        top:130px;
        ${live2d_settings.waifuEdgeSide.split(":")[0]}:10px;
        position:absolute;
        z-index:10002
        }
        
        #waifu:hover > .waifu-tool {
        display:block
        }
        
        .waifu-tool > span {
        display:block;
        cursor:pointer;
        line-height:30px;
        text-align:center;
        transition:.2s;
        }
        
        #waifu.hide,.waifu-tool > span.hide{display:none}
        
        @keyframes shake{2%{transform:translate(0.5px,-1.5px) rotate(-0.5deg)}4%{transform:translate(0.5px,1.5px) rotate(1.5deg)}6%{transform:translate(1.5px,1.5px) rotate(1.5deg)}8%{transform:translate(2.5px,1.5px) rotate(0.5deg)}10%{transform:translate(0.5px,2.5px) rotate(0.5deg)}12%{transform:translate(1.5px,1.5px) rotate(0.5deg)}14%{transform:translate(0.5px,0.5px) rotate(0.5deg)}16%{transform:translate(-1.5px,-0.5px) rotate(1.5deg)}18%{transform:translate(0.5px,0.5px) rotate(1.5deg)}20%{transform:translate(2.5px,2.5px) rotate(1.5deg)}22%{transform:translate(0.5px,-1.5px) rotate(1.5deg)}24%{transform:translate(-1.5px,1.5px) rotate(-0.5deg)}26%{transform:translate(1.5px,0.5px) rotate(1.5deg)}28%{transform:translate(-0.5px,-0.5px) rotate(-0.5deg)}30%{transform:translate(1.5px,-0.5px) rotate(-0.5deg)}32%{transform:translate(2.5px,-1.5px) rotate(1.5deg)}34%{transform:translate(2.5px,2.5px) rotate(-0.5deg)}36%{transform:translate(0.5px,-1.5px) rotate(0.5deg)}38%{transform:translate(2.5px,-0.5px) rotate(-0.5deg)}40%{transform:translate(-0.5px,2.5px) rotate(0.5deg)}42%{transform:translate(-1.5px,2.5px) rotate(0.5deg)}44%{transform:translate(-1.5px,1.5px) rotate(0.5deg)}46%{transform:translate(1.5px,-0.5px) rotate(-0.5deg)}48%{transform:translate(2.5px,-0.5px) rotate(0.5deg)}50%{transform:translate(-1.5px,1.5px) rotate(0.5deg)}52%{transform:translate(-0.5px,1.5px) rotate(0.5deg)}54%{transform:translate(-1.5px,1.5px) rotate(0.5deg)}56%{transform:translate(0.5px,2.5px) rotate(1.5deg)}58%{transform:translate(2.5px,2.5px) rotate(0.5deg)}60%{transform:translate(2.5px,-1.5px) rotate(1.5deg)}62%{transform:translate(-1.5px,0.5px) rotate(1.5deg)}64%{transform:translate(-1.5px,1.5px) rotate(1.5deg)}66%{transform:translate(0.5px,2.5px) rotate(1.5deg)}68%{transform:translate(2.5px,-1.5px) rotate(1.5deg)}70%{transform:translate(2.5px,2.5px) rotate(0.5deg)}72%{transform:translate(-0.5px,-1.5px) rotate(1.5deg)}74%{transform:translate(-1.5px,2.5px) rotate(1.5deg)}76%{transform:translate(-1.5px,2.5px) rotate(1.5deg)}78%{transform:translate(-1.5px,2.5px) rotate(0.5deg)}80%{transform:translate(-1.5px,0.5px) rotate(-0.5deg)}82%{transform:translate(-1.5px,0.5px) rotate(-0.5deg)}84%{transform:translate(-0.5px,0.5px) rotate(1.5deg)}86%{transform:translate(2.5px,1.5px) rotate(0.5deg)}88%{transform:translate(-1.5px,0.5px) rotate(1.5deg)}90%{transform:translate(-1.5px,-0.5px) rotate(-0.5deg)}92%{transform:translate(-1.5px,-1.5px) rotate(1.5deg)}94%{transform:translate(0.5px,0.5px) rotate(-0.5deg)}96%{transform:translate(2.5px,-0.5px) rotate(-0.5deg)}98%{transform:translate(-1.5px,-1.5px) rotate(-0.5deg)}0%,100%{transform:translate(0,0) rotate(0)}}
        `;
initModel();
window.downloadCap = blobDownload;
window.initModel = initModel;
export { showMessage, initModel }