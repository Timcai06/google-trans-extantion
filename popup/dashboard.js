/**
 * Dashboard 2.0 Logic
 * Implements the Bento Grid layout and component rendering
 */

// SVG Icons Constants
const ICONS = {
    ROBOT: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="coach-avatar"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`,
    CHECK: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    CLOCK: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    ZAP: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    FLAME: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-4-3-6-.928 2-1.928 3.857-3 6a2.5 2.5 0 0 0 2.5 2.5z"></path><path d="M15.5 14.5A2.5 2.5 0 0 0 18 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-4-3-6-.928 2-1.928 3.857-3 6a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    BOOK: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    // 1. 获取数据管理器实例
    const manager = window.dashboardManager;
    if (!manager) {
        console.error('DashboardManager not found!');
        return;
    }

    // 等待数据初始化
    if (!manager.initialized) {
        const success = await manager.init();
        if (!success) return;
    }

    // 2. 初始化各个板块
    refreshDashboard(manager);

    // 3. 绑定交互事件
    bindEvents(manager);

    // 4. 监听数据变化，实时刷新
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.translatedWords || changes.learningHistory || changes.learningProgress || changes.userSettings) {
                console.log('Dashboard data changed, refreshing...');
                manager.init().then(() => refreshDashboard(manager));
            }
        }
    });
}

function refreshDashboard(manager) {
    renderHeader(manager);
    renderMetrics(manager);
    renderCharts(manager);
    renderSessionTable(manager);
    renderGoals(manager);
    renderSubjectProgress(manager);
    renderAICoach(manager);
}

/**
 * 渲染头部欢迎语 & 等级入口
 */
function renderHeader(manager) {
    const userName = localStorage.getItem('userName') || 'Learner';
    const userLevel = manager.getUserLevel();
    
    document.getElementById('userName').textContent = userName;
    
    // 状态 Badge
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
        statusBadge.innerHTML = `
            <span class="status-dot"></span>
            Lv.${userLevel.level} 学习者
        `;
        // 添加点击事件打开等级详情
        statusBadge.style.cursor = 'pointer';
        statusBadge.onclick = () => showLevelModal(userLevel);
    }
}

/**
 * 显示等级详情弹窗
 */
function showLevelModal(levelInfo) {
    const modal = document.getElementById('levelModal');
    if (!modal) return;
    
    // 填充数据
    document.getElementById('modalLevel').textContent = levelInfo.level;
    document.getElementById('modalXP').textContent = levelInfo.xp;
    document.getElementById('modalNextXP').textContent = levelInfo.nextLevelXp;
    
    // 动画显示进度条
    const fill = document.getElementById('modalProgressFill');
    fill.style.width = '0%';
    
    // 显示弹窗
    modal.classList.add('active');
    
    // 延迟触发进度条动画
    setTimeout(() => {
        fill.style.width = `${levelInfo.progress}%`;
    }, 100);
}

/**
 * 渲染关键指标卡片
 */
function renderMetrics(manager) {
    const stats = manager.getOverviewStats();
    
    const metrics = [
        {
            title: '本周学习时长',
            value: `${stats.weekHours} 小时`,
            icon: ICONS.CLOCK,
            trend: 'Keep going',
            trendClass: 'text-white',
            bgClass: 'card-blue'
        },
        {
            title: '掌握度',
            value: `${stats.masteryRate}%`,
            icon: ICONS.ZAP,
            trend: 'Level Up',
            trendClass: 'text-white',
            bgClass: 'card-amber'
        },
        {
            title: '连续打卡',
            value: `${stats.streak} 天`,
            icon: ICONS.FLAME,
            trend: 'On Fire!',
            trendClass: 'text-white',
            bgClass: 'card-rose'
        },
        {
            title: '词汇总量',
            value: stats.totalWords.toLocaleString(),
            icon: ICONS.BOOK,
            trend: `+${stats.todayCount}`,
            trendClass: 'text-white',
            bgClass: 'card-emerald'
        }
    ];

    const container = document.querySelector('.metrics-grid');
    container.innerHTML = metrics.map(m => `
        <div class="stat-card ${m.bgClass}">
            <div class="stat-header">
                <div class="stat-icon-wrapper">
                    ${m.icon}
                </div>
                <div class="stat-trend ${m.trendClass}">${m.trend}</div>
            </div>
            <div class="stat-info">
                <div class="stat-value">${m.value}</div>
                <div class="stat-label">${m.title}</div>
            </div>
        </div>
    `).join('');
}

/**
 * 渲染 AI 教练建议 (SVG replaced)
 */
function renderAICoach(manager) {
    const advice = manager.getAICoachAdvice();
    const container = document.querySelector('.ai-coach-panel .coach-content');
    
    if (container) {
        container.innerHTML = `
            ${ICONS.ROBOT}
            <p class="coach-text">${advice.text}</p>
            <button class="glass-btn-sm">${advice.action}</button>
        `;
        
        container.querySelector('button').addEventListener('click', () => {
            if (advice.action.includes("复习")) {
                window.location.href = "popup.html#learning";
            } else {
                alert("即将开始: " + advice.action);
            }
        });
    }
}

/**
 * 渲染图表 (Fix empty state)
 */
function renderCharts(manager) {
    // 1. Activity Chart (Line)
    const weeklyData = manager.getWeeklyData();
    // 确保数据不为空，防止图表崩溃
    const safeActivityData = weeklyData.length > 0 ? weeklyData.map(d => ({
        label: d.label,
        value: d.count
    })) : Array(7).fill(0).map((_, i) => ({ label: `Day ${i+1}`, value: 0 }));

    if (window.LineChart) {
        const container = document.getElementById('activityChartContainer');
        container.innerHTML = ''; 
        const chart = new window.LineChart({
            data: safeActivityData,
            width: container.clientWidth,
            height: container.clientHeight,
            options: {
                lineColor: '#38bdf8',
                areaColor: 'rgba(56, 189, 248, 0.1)',
                labelColor: '#94a3b8',
                gridColor: 'rgba(255,255,255,0.05)',
                smooth: true,
                showPoints: true
            }
        });
        container.appendChild(chart.getElement());
    }

    // 2. Efficiency Chart (Bar)
    const safeEfficiencyData = weeklyData.length > 0 ? weeklyData.map(d => ({
        label: d.label,
        value: d.words
    })) : Array(7).fill(0).map((_, i) => ({ label: `Day ${i+1}`, value: 0 }));

    if (window.BarChart) {
        const container = document.getElementById('efficiencyChartContainer');
        container.innerHTML = '';
        const chart = new window.BarChart({
            data: safeEfficiencyData,
            width: container.clientWidth,
            height: container.clientHeight,
            options: {
                barColor: '#fbbf24', // Amber
                labelColor: '#94a3b8'
            }
        });
        container.appendChild(chart.getElement());
    }

    // 3. Radar Chart
    const radarData = manager.getRadarData();
    // RadarData should always return 5 dimensions from manager, even if values are 0
    // But let's be safe
    const safeRadarData = radarData.length > 0 ? radarData : [
        { label: '词汇', value: 0 },
        { label: '活跃', value: 0 },
        { label: '阅读', value: 0 },
        { label: '听力', value: 0 },
        { label: '口语', value: 0 }
    ];

    if (window.RadarChart) {
        const container = document.getElementById('radarChartContainer');
        container.innerHTML = '';
        const chart = new window.RadarChart({
            data: safeRadarData,
            width: container.clientWidth,
            height: container.clientHeight,
            options: {
                lineColor: '#34d399', // Emerald
                areaColor: 'rgba(52, 211, 153, 0.2)',
                labelColor: '#94a3b8'
            }
        });
        container.appendChild(chart.getElement());
    }
}

/**
 * 渲染最近学习记录
 */
function renderSessionTable(manager) {
    const records = manager.getRecentSessions(5);
    const tbody = document.querySelector('#sessionTable tbody');
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 20px;">暂无学习记录，快去查个单词吧！</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(r => `
        <tr>
            <td>
                <span style="display:flex; align-items:center; gap:8px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:${getModeColor(r.mode)}"></span>
                    ${getModeName(r.mode)}
                </span>
            </td>
            <td title="${r.translation}" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.word}</td>
            <td>${formatDuration(r.duration)}</td>
            <td>${new Date(r.timestamp).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}</td>
            <td>
                <span style="color:${r.correct ? '#34d399' : '#f87171'}">
                    ${r.correct ? 'High' : 'Normal'}
                </span>
            </td>
        </tr>
    `).join('');
}

/**
 * 渲染目标列表 (SVG Replaced)
 */
function renderGoals(manager) {
    const stats = manager.getOverviewStats();
    
    const goals = [
        { text: `每日学习 ${stats.dailyGoal} 个单词`, done: stats.todayCount >= stats.dailyGoal },
        { text: '保持连续打卡', done: stats.streak > 0 },
        { text: '完成一次复习', done: false }
    ];

    const container = document.getElementById('goalsList');
    container.innerHTML = goals.map(g => `
        <div class="goal-item ${g.done ? 'done' : ''}">
            <div class="goal-check">
                ${g.done ? ICONS.CHECK : ''}
            </div>
            <span>${g.text}</span>
        </div>
    `).join('');
}

/**
 * 渲染科目进度列表
 */
function renderSubjectProgress(manager) {
    const subjects = [
        { name: '通用词汇', progress: manager.getUserLevel().progress, color: '#38bdf8' },
        { name: '长难句', progress: 30, color: '#f472b6' },
        { name: '专业术语', progress: 15, color: '#34d399' }
    ];

    const container = document.getElementById('subjectProgressList');
    container.innerHTML = subjects.map(s => `
        <div style="margin-bottom: 16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#e2e8f0;">
                <span>${s.name}</span>
                <span>${s.progress}%</span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="width:${s.progress}%; height:100%; background:${s.color}; border-radius:3px;"></div>
            </div>
        </div>
    `).join('');
}

function bindEvents(manager) {
    // Sidebar
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Modal Close
    const modal = document.getElementById('levelModal');
    if (modal) {
        // 点击遮罩层关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // 点击关闭按钮关闭
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    // Add Goal
    document.querySelector('.add-goal-btn')?.addEventListener('click', () => {
        const newGoal = prompt("请输入新目标 (例如：背诵50个单词)");
        if (newGoal) {
            alert("目标已添加: " + newGoal);
        }
    });
}

// Helpers (Same as before)
function getModeName(mode) {
    const map = { 'flashcard': '闪卡', 'quiz': '测验', 'spelling': '拼写', 'listening': '听力' };
    return map[mode] || '学习';
}
function getModeColor(mode) {
    const map = { 'flashcard': '#38bdf8', 'quiz': '#f472b6', 'spelling': '#fbbf24', 'listening': '#34d399' };
    return map[mode] || '#94a3b8';
}
function formatDuration(ms) {
    if (!ms) return '0s';
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec}s`;
}
