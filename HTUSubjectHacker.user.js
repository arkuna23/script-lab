// ==UserScript==
// @name         HTUSubjectHacker
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      0.1.1
// @description  校领导密麻麻石蜡
// @author       Naraku_Night
// @match        *://jwc.htu.edu.cn/new/student/xsxk/xklx/*
// @grant        none
// @run-at       document-start
// @updateURL    https://gitee.com/naraku_night/script-lab/raw/main/HTUSubjectHacker.user.js
// ==/UserScript==

(function() {
    'use strict';
    const projId = window.location.href.split('/').pop().replace('#', '');

    // 记录选中的课程
    let _s = localStorage.getItem('select')
    const selectIdAndName = _s == null ? {} : JSON.parse(_s);
    
    let cacheLog = '';
    let lastLog = '';

    // 输出文本框
    const logOutput = (() => {
        let d = document.createElement('textarea')
        d.id = "log-output";
        d.style = "width: 100%;height: 150px;margin-top: 5px;white-space:pre-line;"
        d.readOnly = true;

        if (localStorage.getItem('hacking') != null) {
            cacheLog = localStorage.getItem('hacker_log_c');
            d.innerHTML += cacheLog + localStorage.getItem('hacker_log');
        }

        return d
    })()

    // func
    const hackerLog = (obj = '', append = false) => {
        let text = '';
        if (localStorage.getItem('hacking') != null) {
            text += "抢课中...\n"
            text += "剩余课程: " + Object.values(selectIdAndName).map(obj => obj.show).join(', ') + '\n';
        }
        if (append) {
            cacheLog += obj + '\n';
            text += cacheLog + lastLog;
        } else {
            lastLog = obj;
            text += cacheLog + obj;
        }

        if (text != logOutput.innerHTML) {
            localStorage.setItem('hacker_log', obj);
            localStorage.setItem('hacker_log_c', cacheLog);
            logOutput.innerHTML = text;
        }
    }

    // 抢课逻辑
    let interval;
    const cacheSelectedSub = [];
    const startHack = () => {
        hackerLog();
        interval = setInterval(() => {
            let entries = Object.entries(selectIdAndName);
            if (entries.length == 0){
                $("#begin-btn").attr("disabled", false);
                $("#stop-btn").attr("disabled", true);
                $("#times-input").attr("disabled", false);
                stopHack("无剩余课程，结束抢课")
                return;
            }

            for (const entry of entries) {
                // TODO: 改成setTimeOut
                $.ajax({
                    type: "POST",
                    url: `/new/student/xsxk/xklx/${projId}/add`,
                    data: {
                        "kcrwdm" : parseInt(entry[0]),
                        "kcmc" : entry[1].name,
                        "qz":  -1,
                        "hlct": 0
                    },
                    dataType: "json",
                    success: (response) => {
                        if (localStorage.getItem('hacking') == null)
                            return;

                        if (response.code == -1){
                            hackerLog(`选课 ${entry[1].show}(${entry[0]})时发生错误: ${response.message}`);
                        } else {
                            hackerLog(`抢课成功: ${entry[1].show}`, true);
                            cacheSelectedSub.push(entry[0]);
                            delete selectIdAndName[entry[0]];
                            localStorage.setItem('select', JSON.stringify(selectIdAndName));
                        }
                    },
                    error: (err) => {
                        console.error(err.responseText);
                    }
                });
            }
        }, 1000 / (localStorage.getItem('times') / Object.keys(selectIdAndName).length));
    }
    const stopHack = (log = undefined) => {
        // TODO: 优化log形参的输入
        localStorage.removeItem('hacking');
        clearInterval(interval);
        $(".subject-check").attr("disabled", false);
        for (let key of cacheSelectedSub) {
            $("#sub-" + key).attr("disabled", true);
        }
        hackerLog(log == undefined ? lastLog : log);
    }
    // 生成窗口
    const spawnWindow = () => {
        console.log("生成窗口");
        let window = document.createElement("div");
        window.id = "hacker-window";
        window.style = "margin: 10px;"

        // 按钮
        let begin = document.createElement('button');
        begin.innerText = "开始/继续抢课"
        begin.id = "begin-btn";
        begin.style = "margin-right: 10px;"
        let stop = document.createElement('button');
        stop.innerText = "暂停抢课"
        stop.id = "stop-btn";
        stop.style = "margin-right: 10px;"

        // 每秒抢课次数input
        let times = document.createElement('input');
        times.id = "times-input";
        times.type = 'number';
        times.min = 1;
        times.style = "width: 35px;"
        times.onchange = () => localStorage.setItem('times', times.value);
        let i = localStorage.getItem('times');
        if (i == null){
            localStorage.setItem('times', "4");
            times.value = "4";
        } else
            times.value = i;
        let timesDiv = document.createElement('div');
        timesDiv.append("每秒", times, "次请求");
        timesDiv.style = "margin-right: 10px;flex-direction: column;";

        // div
        let topDiv = document.createElement('div');
        topDiv.append(begin, stop, timesDiv);
        topDiv.style = "display: flex;"

        // 根据缓存修改状态
        if (localStorage.getItem('hacking') != null){
            begin.disabled = true;
            times.disabled = true;
        } else
            stop.disabled = true;

        // 按钮逻辑
        begin.onclick = () => {
            begin.disabled = true;
            stop.disabled = false;
            times.disabled = true;
            localStorage.setItem('hacking', 1);
            $(".subject-check").attr("disabled", true);
            startHack();
        };
        stop.onclick = () => {
            stop.disabled = true;
            begin.disabled = false;
            times.disabled = false;
            stopHack();
        };

        window.append(topDiv, logOutput);
        $(".layout-panel-west .datagrid-view2 .datagrid-body").append(window);
    }

    // 抢课选项复选框
    const appendCheckbox = (index, subjectId, name, show) => {
        let checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.id = "sub-" + subjectId;
        checkbox.classList.add("subject-check", "check-" + index);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked){
                selectIdAndName[subjectId] = {
                    name: name,
                    show: show 
                };
            }
            else{
                delete selectIdAndName[subjectId];
            }
            localStorage.setItem('select', JSON.stringify(selectIdAndName));
        })

        if (selectIdAndName[subjectId] != undefined)
            checkbox.checked = true;
        if (localStorage.getItem('hacking') != null)
            checkbox.disabled = true;

        $(`.layout-panel-west #datagrid-row-r2-2-${index} .datagrid-cell-c2-kcmc`).prepend(checkbox);
    }

    // 重写XHR请求
    const originOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
        if (args[1].includes("kxkc")) {
            this.addEventListener("readystatechange", () => {
                if (this.readyState === 4) {
                    let resp = this.responseText;
                    setTimeout(() => {
                        let data = JSON.parse(resp).rows;
                        spawnWindow();
                        for(let i=0; i< data.length; i++){
                            let id = data[i].kcrwdm, name = data[i].kcmc, show = data[i].jxbmc;
                            // 插入复选框
                            appendCheckbox(i, id, name, name + '-' + show);
                        }
                    }, 10);
                    
                }
            });
        }
        originOpen.apply(this, args);
    };

    // Your code here...
})();