class ShapeGame {
    constructor() {
        this.targetCanvas = document.getElementById('targetCanvas');
        this.playerCanvas = document.getElementById('playerCanvas');
        this.targetCtx = this.targetCanvas.getContext('2d');
        this.playerCtx = this.playerCanvas.getContext('2d');
        this.checkButton = document.getElementById('checkButton');
        this.resultDiv = document.getElementById('result');
        this.restartButton = document.getElementById('restartButton');
        this.timerDisplay = document.getElementById('timer');
        this.levelDisplay = document.getElementById('level');
        this.scoreDisplay = document.getElementById('score');
        this.prevButton = document.getElementById('prevButton');
        this.nextButton = document.getElementById('nextButton');
        
        // 修改关卡设置
        this.currentLevel = 1;
        this.levelConfigs = [
            // 5边形关卡
            { edges: 5, variance: 0.3, allowConcave: false },  // 第1关：简单5边形
            { edges: 5, variance: 0.35, allowConcave: true },  // 第2关：可凹5边形
            // 6边形关卡
            { edges: 6, variance: 0.35, allowConcave: false }, // 第3关：简单6边形
            { edges: 6, variance: 0.4, allowConcave: true },   // 第4关：可凹6边形
            // 7边形关卡
            { edges: 7, variance: 0.4, allowConcave: false },  // 第5关：简单7边形
            { edges: 7, variance: 0.45, allowConcave: true },  // 第6关：可凹7边形
            // 8边形关卡
            { edges: 8, variance: 0.45, allowConcave: false }, // 第7关：简单8边形
            { edges: 8, variance: 0.5, allowConcave: true },   // 第8关：可凹8边形
            // 9边形关卡
            { edges: 9, variance: 0.5, allowConcave: false },  // 第9关：简单9边形
            { edges: 9, variance: 0.55, allowConcave: true },  // 第10关：可凹9边形
            // 10边形关卡
            { edges: 10, variance: 0.55, allowConcave: false }, // 第11关：简单10边形
            { edges: 10, variance: 0.6, allowConcave: true },   // 第12关：可凹10边形
            // 11边形关卡
            { edges: 11, variance: 0.6, allowConcave: false },  // 第13关：简单11边形
            { edges: 11, variance: 0.65, allowConcave: true },  // 第14关：可凹11边形
            // 12边形关卡
            { edges: 12, variance: 0.65, allowConcave: true }   // 第15关：可凹12边形
        ];

        // 添加计时和分数
        this.startTime = null;
        this.timerInterval = null;
        this.currentScore = 0;
        this.levelHistory = [];

        // 初始化正方形的顶点
        const size = 140;  // 增加初始正方形的大小
        const center = 200;
        this.squarePoints = [
            {x: center - size/2, y: center - size/2},
            {x: center + size/2, y: center - size/2},
            {x: center + size/2, y: center + size/2},
            {x: center - size/2, y: center + size/2}
        ];

        this.showControls = true;  // 默认显示控制点
        this.selectedPoint = null;
        this.targetShape = [];

        // 添加边的中点
        this.edgePoints = [];
        this.updateEdgePoints();

        this.maxTime = 120;
        this.isTimerStarted = false;
        this.isGameActive = false;  // 添加游戏活动状态标志
        
        // 初始化音效
        this.congratsSound = new Audio('audios/congrats.wav');
        this.wrongSound = new Audio('audios/wrong.mp3');
        
        // 初始化事件监听
        this.setupEventListeners();
        // 初始化游戏
        this.init();
    }

    startTimer() {
        this.startTime = Date.now();
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            if (elapsed >= this.maxTime) {
                this.gameOver('时间到！本关未通过，请重新开始或选择其他关卡');
                return;
            }
            this.timerDisplay.textContent = elapsed;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            return Math.floor((Date.now() - this.startTime) / 1000);
        }
        return 0;
    }

    updateScore(similarity) {
        // 直接返回相似度的百分比值（保留2位小数）
        return Number((similarity * 100).toFixed(2));
    }

    init() {
        // 重置游戏状态
        this.targetShape = [];
        const size = 140;  // 与构造函数中的大小保持一致
        const center = 200;
        this.squarePoints = [
            {x: center - size/2, y: center - size/2},
            {x: center + size/2, y: center - size/2},
            {x: center + size/2, y: center + size/2},
            {x: center - size/2, y: center + size/2}
        ];
        this.updateEdgePoints();
        this.generateRandomShape();
        this.isTimerStarted = false;
        this.isGameActive = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerDisplay.textContent = '0';
        
        // 清除结果显示
        const resultDiv = document.getElementById('result');
        resultDiv.className = 'result-display';
        resultDiv.textContent = '';
        
        // 禁用检查按钮
        this.checkButton.disabled = true;
        
        // 更新UI
        this.updateLevelInfo();
        this.updateButtonStates();
        
        // 绘制图形
        this.drawTargetShape();
        this.drawPlayerShape();
        
        // 重置音效
        this.resetSound(this.congratsSound);
        this.resetSound(this.wrongSound);
        
        this.showControls = true;  // 保持控制点显示
    }

    updateLevelInfo() {
        this.levelDisplay.textContent = this.currentLevel;
        this.scoreDisplay.textContent = this.currentScore;
    }

    generateRandomShape() {
        const centerX = 200;
        const centerY = 200;
        const config = this.levelConfigs[this.currentLevel - 1];
        const radius = 85;

        for (let i = 0; i < config.edges; i++) {
            const angle = (Math.PI * 2 * i) / config.edges;
            let variance = 1 - (Math.random() * config.variance);
            
            // 如果允许凹形，则有40%的概率产生凹点
            if (config.allowConcave && Math.random() < 0.4) {
                variance = 0.3 + (Math.random() * 0.4); // 30%-70%的半径，产生更明显的凹点
            }
            
            const x = centerX + Math.cos(angle) * radius * variance;
            const y = centerY + Math.sin(angle) * radius * variance;
            this.targetShape.push({x, y});
        }
    }

    drawTargetShape() {
        this.targetCtx.clearRect(0, 0, this.targetCanvas.width, this.targetCanvas.height);
        
        // 设置缩放
        this.targetCtx.save();
        this.targetCtx.translate(200, 200);
        this.targetCtx.scale(1.4, 1.4);  // 增加缩放比例
        this.targetCtx.translate(-200, -200);

        this.targetCtx.beginPath();
        this.targetCtx.moveTo(this.targetShape[0].x, this.targetShape[0].y);
        
        for (let i = 1; i <= this.targetShape.length; i++) {
            const point = this.targetShape[i % this.targetShape.length];
            this.targetCtx.lineTo(point.x, point.y);
        }
        
        this.targetCtx.fillStyle = 'rgba(255, 182, 193, 0.3)';
        this.targetCtx.fill();
        this.targetCtx.strokeStyle = 'rgba(255, 182, 193, 0.8)';
        this.targetCtx.stroke();
        this.targetCtx.restore();
    }

    drawPlayerShape() {
        this.playerCtx.clearRect(0, 0, this.playerCanvas.width, this.playerCanvas.height);
        
        // 设置缩放以匹配目标图形
        this.playerCtx.save();
        this.playerCtx.translate(200, 200);
        this.playerCtx.scale(1.4, 1.4);  // 增加缩放比例
        this.playerCtx.translate(-200, -200);
        
        // 绘制形状
        this.playerCtx.beginPath();
        this.playerCtx.moveTo(this.squarePoints[0].x, this.squarePoints[0].y);
        
        for (let i = 1; i <= this.squarePoints.length; i++) {
            const point = this.squarePoints[i % this.squarePoints.length];
            this.playerCtx.lineTo(point.x, point.y);
        }
        
        this.playerCtx.fillStyle = 'rgba(173, 216, 230, 0.3)';
        this.playerCtx.fill();
        this.playerCtx.strokeStyle = 'rgba(173, 216, 230, 0.8)';
        this.playerCtx.stroke();
        this.playerCtx.restore();

        // 绘制顶点和边的中点（不需要缩放）
        this.drawControlPoints();
    }

    drawControlPoints() {
        // 只在显示控制点时绘制
        if (!this.showControls) return;
        
        // 应用相同的缩放变换来绘制控制点
        this.playerCtx.save();
        this.playerCtx.translate(200, 200);
        this.playerCtx.scale(1.4, 1.4);
        this.playerCtx.translate(-200, -200);

        // 绘制顶点
        this.squarePoints.forEach(point => {
            this.playerCtx.beginPath();
            this.playerCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            this.playerCtx.fillStyle = 'blue';
            this.playerCtx.fill();
        });

        // 绘制边的中点
        this.edgePoints.forEach(point => {
            this.playerCtx.beginPath();
            this.playerCtx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            this.playerCtx.fillStyle = 'green';
            this.playerCtx.fill();
        });

        this.playerCtx.restore();
    }

    setupEventListeners() {
        this.playerCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.playerCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.playerCanvas.addEventListener('mouseup', () => this.selectedPoint = null);
        this.playerCanvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.playerCanvas.addEventListener('mousemove', this.handleMouseOver.bind(this));
        this.checkButton.addEventListener('click', this.checkSimilarity.bind(this));
        this.restartButton.addEventListener('click', this.restart.bind(this));
        this.prevButton.addEventListener('click', this.prevLevel.bind(this));
        this.nextButton.addEventListener('click', this.nextLevel.bind(this));
    }

    handleDoubleClick(e) {
        if (!this.isGameActive || !this.isTimerStarted) return;
        
        const rect = this.playerCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // 转换回未缩放的坐标
        x = (x - 200) / 1.4 + 200;
        y = (y - 200) / 1.4 + 200;
        
        // 检查是否双击了顶点
        for (let i = 0; i < this.squarePoints.length; i++) {
            const point = this.squarePoints[i];
            if (Math.hypot(point.x - x, point.y - y) < 8) {
                // 不允许删除如果只剩下3个点
                if (this.squarePoints.length <= 3) return;
                
                // 删除该点
                this.squarePoints.splice(i, 1);
                this.updateEdgePoints();
                this.drawPlayerShape();
                break;
            }
        }
    }

    handleMouseDown(e) {
        if (!this.isGameActive) {
            if (!this.isTimerStarted) {
                this.isTimerStarted = true;
                this.isGameActive = true;
                this.startTimer();
                this.checkButton.disabled = false;
            }
        } else if (!this.isTimerStarted) {
            return;
        }

        const rect = this.playerCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        x = (x - 200) / 1.4 + 200;
        y = (y - 200) / 1.4 + 200;

        // 检查是否点击了顶点
        this.squarePoints.forEach(point => {
            if (Math.hypot(point.x - x, point.y - y) < 8) {
                this.selectedPoint = point;
            }
        });

        // 如果没有选中顶点，检查是否点击了边的中点
        if (!this.selectedPoint) {
            this.edgePoints.forEach(point => {
                if (Math.hypot(point.x - x, point.y - y) < 8) {
                    const newPoint = {x: point.x, y: point.y};
                    this.squarePoints.splice(point.index + 1, 0, newPoint);
                    this.selectedPoint = newPoint;
                    this.updateEdgePoints();
                }
            });
        }
    }

    handleMouseMove(e) {
        if (!this.isGameActive || !this.isTimerStarted) return;
        if (!this.selectedPoint) return;

        const rect = this.playerCanvas.getBoundingClientRect();
        // 调整鼠标位置以匹配缩放
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // 转换回未缩放的坐标
        this.selectedPoint.x = (x - 200) / 1.4 + 200;
        this.selectedPoint.y = (y - 200) / 1.4 + 200;
        
        this.updateEdgePoints();
        this.drawPlayerShape();
    }

    handleMouseOver(e) {
        return;
    }

    restart() {
        this.currentLevel = 1;
        this.currentScore = 0;
        this.levelHistory = [];
        this.resultDiv.textContent = '';
        this.init();  // init 会处理所有重置操作
    }

    nextLevel() {
        if (this.currentLevel < 15) {
            this.currentLevel++;
            this.resultDiv.textContent = '';
            this.init();  // init 会处理所有重置操作
        } else {
            this.stopTimer();
            this.resultDiv.textContent = "恭喜！你已完成所有关卡！总分: " + this.currentScore;
        }
    }

    checkSimilarity() {
        // 停止游戏活动
        this.isGameActive = false;
        this.isTimerStarted = false;
        this.checkButton.disabled = true;  // 禁用检查按钮
        
        const targetArea = this.calculateArea(this.targetShape);
        const playerArea = this.calculateArea(this.squarePoints);
        const similarity = Math.min(targetArea, playerArea) / Math.max(targetArea, playerArea);
        const similarityPercent = similarity * 100;
        
        const timeSpent = this.stopTimer();
        const levelScore = Number(similarityPercent.toFixed(2));  // 转换为数字
        
        // 更新当前关卡的分数
        if (!this.levelHistory[this.currentLevel - 1] || 
            levelScore > this.levelHistory[this.currentLevel - 1].score) {
            this.levelHistory[this.currentLevel - 1] = {
                time: timeSpent,
                score: levelScore
            };
        }
        
        // 更新总分（所有关卡的最高分之和）
        this.currentScore = this.levelHistory.reduce((sum, record) => {
            return sum + (record ? record.score : 0);
        }, 0);
        
        const resultDiv = document.getElementById('result');
        resultDiv.className = 'result-display';
        
        let resultText = `相似度: ${levelScore.toFixed(2)}%`;
        
        if (similarityPercent >= 95) {
            resultText += "\n恭喜通过！";
            resultDiv.classList.add('success');
            this.congratsSound.play();  // 播放成功音效
            setTimeout(() => this.nextLevel(), 1000);
        } else {
            resultText += "\n未达到95%相似度，请继续尝试";
            resultDiv.classList.add('fail');
            this.wrongSound.play();  // 播放失败音效
            this.isTimerStarted = false;
        }
        
        resultDiv.textContent = resultText;
        void resultDiv.offsetWidth;
        resultDiv.classList.add('show');
        
        this.updateLevelInfo();
    }

    calculateArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area / 2);
    }

    updateEdgePoints() {
        this.edgePoints = [];
        for (let i = 0; i < this.squarePoints.length; i++) {
            const p1 = this.squarePoints[i];
            const p2 = this.squarePoints[(i + 1) % this.squarePoints.length];
            this.edgePoints.push({
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2,
                index: i
            });
        }
    }

    gameOver(message) {
        this.stopTimer();
        const resultDiv = document.getElementById('result');
        resultDiv.className = 'result-display';
        resultDiv.classList.add('fail');
        this.resultDiv.textContent = message;
        void resultDiv.offsetWidth;
        resultDiv.classList.add('show');
        this.checkButton.disabled = true;
        this.isGameActive = false;
        this.isTimerStarted = false;
        this.wrongSound.play();  // 播放失败音效
    }

    updateButtonStates() {
        this.prevButton.disabled = this.currentLevel <= 1;
        this.nextButton.disabled = this.currentLevel >= 15;
    }

    prevLevel() {
        if (this.currentLevel > 1) {
            this.currentLevel--;
            this.resultDiv.textContent = '';
            this.init();  // init 会处理所有重置操作
        }
    }

    // 重置音效（在需要重新播放同一个音效时调用）
    resetSound(sound) {
        sound.pause();
        sound.currentTime = 0;
    }

    isPointInShape(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}

// 启动游戏
window.onload = () => new ShapeGame(); 