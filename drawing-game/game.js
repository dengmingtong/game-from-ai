class ShapeGame {
    constructor() {
        this.targetCanvas = document.getElementById('targetCanvas');
        this.playerCanvas = document.getElementById('playerCanvas');
        this.targetCtx = this.targetCanvas.getContext('2d');
        this.playerCtx = this.playerCanvas.getContext('2d');
        this.checkButton = document.getElementById('checkButton');
        this.resultDiv = document.getElementById('result');
        this.nextButton = document.getElementById('nextButton');
        this.levelInfo = document.getElementById('levelInfo');
        this.restartButton = document.getElementById('restartButton');
        this.timerDisplay = document.getElementById('timer');
        this.currentScoreDisplay = document.getElementById('currentScore');
        this.levelHistoryDisplay = document.getElementById('levelHistory');
        
        // 添加关卡设置
        this.currentLevel = 1;
        this.levelConfigs = [
            { edges: 6, variance: 0.3, allowConcave: false },  // 第一关：6边形，变化较小
            { edges: 7, variance: 0.35, allowConcave: false }, // 第二关：7边形
            { edges: 8, variance: 0.4, allowConcave: false },  // 第三关：8边形
            { edges: 7, variance: 0.4, allowConcave: true },   // 第四关：7边形，可凹
            { edges: 8, variance: 0.45, allowConcave: true }   // 第五关：8边形，可凹
        ];

        // 添加计时和分数
        this.startTime = null;
        this.timerInterval = null;
        this.currentScore = 0;
        this.levelHistory = [];

        // 初始化正方形的顶点
        this.squarePoints = [
            {x: 150, y: 150},
            {x: 250, y: 150},
            {x: 250, y: 250},
            {x: 150, y: 250}
        ];

        this.selectedPoint = null;
        this.targetShape = [];

        // 添加边的中点
        this.edgePoints = [];
        this.updateEdgePoints();

        this.init();
    }

    startTimer() {
        this.startTime = Date.now();
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.timerDisplay.textContent = `时间: ${elapsed}秒`;
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
        // 基础分数：相似度 * 100
        let score = similarity * 100;
        // 时间奖励：在30秒内完成有额外分数
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        if (timeSpent < 30) {
            score += (30 - timeSpent) * 10;
        }
        return Math.round(score);
    }

    init() {
        this.targetShape = [];
        this.squarePoints = [
            {x: 150, y: 150},
            {x: 250, y: 150},
            {x: 250, y: 250},
            {x: 150, y: 250}
        ];
        this.updateEdgePoints();
        this.generateRandomShape();
        this.drawTargetShape();
        this.drawPlayerShape();
        this.setupEventListeners();
        this.updateLevelInfo();
        this.startTimer();
    }

    updateLevelInfo() {
        this.levelInfo.textContent = `第 ${this.currentLevel} 关`;
        this.currentScoreDisplay.textContent = `当前分数: ${this.currentScore}`;
        
        // 更新关卡历史记录
        let historyHTML = '<div style="margin-top: 10px;"><strong>历史记录:</strong></div>';
        this.levelHistory.forEach((record, index) => {
            historyHTML += `<div>第${index + 1}关 - 用时: ${record.time}秒, 得分: ${record.score}</div>`;
        });
        this.levelHistoryDisplay.innerHTML = historyHTML;
    }

    generateRandomShape() {
        const centerX = 200;
        const centerY = 200;
        const config = this.levelConfigs[this.currentLevel - 1];
        const radius = 100;

        for (let i = 0; i < config.edges; i++) {
            const angle = (Math.PI * 2 * i) / config.edges;
            let variance = 1 - (Math.random() * config.variance);
            
            // 如果允许凹形，则有25%的概率产生凹点
            if (config.allowConcave && Math.random() < 0.25) {
                variance = 0.4 + (Math.random() * 0.3); // 40%-70%的半径，产生凹点
            }
            
            const x = centerX + Math.cos(angle) * radius * variance;
            const y = centerY + Math.sin(angle) * radius * variance;
            this.targetShape.push({x, y});
        }
    }

    drawTargetShape() {
        this.targetCtx.clearRect(0, 0, this.targetCanvas.width, this.targetCanvas.height);
        this.targetCtx.beginPath();
        this.targetCtx.moveTo(this.targetShape[0].x, this.targetShape[0].y);
        
        for (let i = 1; i <= this.targetShape.length; i++) {
            const point = this.targetShape[i % this.targetShape.length];
            this.targetCtx.lineTo(point.x, point.y);
        }
        
        this.targetCtx.fillStyle = 'rgba(255, 182, 193, 0.3)'; // 柔和的粉色
        this.targetCtx.fill();
    }

    drawPlayerShape() {
        this.playerCtx.clearRect(0, 0, this.playerCanvas.width, this.playerCanvas.height);
        
        // 绘制形状
        this.playerCtx.beginPath();
        this.playerCtx.moveTo(this.squarePoints[0].x, this.squarePoints[0].y);
        
        for (let i = 1; i <= this.squarePoints.length; i++) {
            const point = this.squarePoints[i % this.squarePoints.length];
            this.playerCtx.lineTo(point.x, point.y);
        }
        
        this.playerCtx.fillStyle = 'rgba(173, 216, 230, 0.3)'; // 柔和的蓝色
        this.playerCtx.fill();

        // 绘制顶点
        this.squarePoints.forEach(point => {
            this.playerCtx.beginPath();
            this.playerCtx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.playerCtx.fillStyle = 'blue';
            this.playerCtx.fill();
        });

        // 绘制边的中点
        this.edgePoints.forEach(point => {
            this.playerCtx.beginPath();
            this.playerCtx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            this.playerCtx.fillStyle = 'green';
            this.playerCtx.fill();
        });
    }

    setupEventListeners() {
        this.playerCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.playerCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.playerCanvas.addEventListener('mouseup', () => this.selectedPoint = null);
        this.checkButton.addEventListener('click', this.checkSimilarity.bind(this));
        this.nextButton.addEventListener('click', () => this.nextLevel());
        this.restartButton.addEventListener('click', () => this.restart());
    }

    handleMouseDown(e) {
        const rect = this.playerCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否点击了顶点
        this.squarePoints.forEach(point => {
            if (Math.hypot(point.x - x, point.y - y) < 10) {
                this.selectedPoint = point;
            }
        });

        // 如果没有选中顶点，检查是否点击了边的中点
        if (!this.selectedPoint) {
            this.edgePoints.forEach(point => {
                if (Math.hypot(point.x - x, point.y - y) < 10) {
                    // 在这个位置添加新的顶点
                    const newPoint = {x: point.x, y: point.y};
                    this.squarePoints.splice(point.index + 1, 0, newPoint);
                    this.selectedPoint = newPoint;
                    this.updateEdgePoints();
                }
            });
        }
    }

    handleMouseMove(e) {
        if (!this.selectedPoint) return;

        const rect = this.playerCanvas.getBoundingClientRect();
        this.selectedPoint.x = e.clientX - rect.left;
        this.selectedPoint.y = e.clientY - rect.top;
        
        // 更新边的中点位置
        this.updateEdgePoints();
        this.drawPlayerShape();
    }

    restart() {
        this.currentLevel = 1;
        this.currentScore = 0;
        this.levelHistory = [];
        this.init();
        this.resultDiv.textContent = '';
    }

    nextLevel() {
        if (this.currentLevel < 5) {
            this.currentLevel++;
            this.init();
            this.resultDiv.textContent = '';
        } else {
            this.stopTimer();
            this.resultDiv.textContent = "恭喜！你已完成所有关卡！总分: " + this.currentScore;
        }
    }

    checkSimilarity() {
        const targetArea = this.calculateArea(this.targetShape);
        const playerArea = this.calculateArea(this.squarePoints);
        const similarity = Math.min(targetArea, playerArea) / Math.max(targetArea, playerArea);
        const similarityPercent = similarity * 100;
        
        const timeSpent = this.stopTimer();
        const levelScore = this.updateScore(similarity);
        this.currentScore += levelScore;
        
        // 记录本关成绩
        this.levelHistory.push({
            time: timeSpent,
            score: levelScore
        });
        
        this.resultDiv.textContent = `相似度: ${similarityPercent.toFixed(2)}%, 得分: ${levelScore}`;
        
        if (similarityPercent >= 90) {
            this.resultDiv.textContent += " - 恭喜通过！";
            // 延迟一秒后自动进入下一关
            setTimeout(() => this.nextLevel(), 1000);
        } else {
            // 未通过继续计时
            this.startTimer();
        }
        
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
}

// 启动游戏
window.onload = () => new ShapeGame(); 