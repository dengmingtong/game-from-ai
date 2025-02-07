class Mirror {
    constructor(x, y, angle = 45) {
        this.x = x;
        this.y = y;
        this.angle = angle; // 角度（相对于水平线）
        this.length = 50;   // 镜子长度
        this.isDragging = false;
        this.isRotating = false;
    }

    draw(ctx) {
        const radians = this.angle * Math.PI / 180;
        const dx = Math.cos(radians) * this.length / 2;
        const dy = Math.sin(radians) * this.length / 2;

        // 绘制镜子
        ctx.beginPath();
        ctx.moveTo(this.x - dx, this.y - dy);
        ctx.lineTo(this.x + dx, this.y + dy);
        ctx.strokeStyle = '#4A90E2'; // 改为蓝色镜子
        ctx.lineWidth = 5; // 加粗镜子线条
        ctx.stroke();

        // 添加镜子标签
        ctx.font = '14px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText('Mirror', this.x - 20, this.y - 10);

        // 绘制旋转手柄
        ctx.beginPath();
        ctx.arc(this.x + dx, this.y + dy, 8, 0, Math.PI * 2); // 增大手柄尺寸
        ctx.fillStyle = '#FFA500'; // 改为橙色手柄
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.level = 1;
        this.mirrors = [];
        this.unusedMirrors = 3;
        this.lightSource = { x: 50, y: 300 };
        this.target = { x: 750, y: 300 };
        this.obstacles = [];
        this.selectedMirror = null;
        this.isSuccess = false;
        this.lightColor = '#FF6600';
        this.rayAngle = 0;

        this.initializeLevel();
        this.addEventListeners();
        this.gameLoop();
    }

    initializeLevel() {
        this.mirrors = [];
        this.isSuccess = false;
        document.getElementById('level').textContent = this.level;
        document.getElementById('mirrors-left').textContent = this.unusedMirrors;
        document.getElementById('next-level').disabled = true;

        // 设置不同关卡的配置
        switch(this.level) {
            case 1:
                this.unusedMirrors = 3;
                this.obstacles = [];
                break;
            case 2:
                this.unusedMirrors = 3;
                this.obstacles = [
                    { x: 400, y: 300, width: 50, height: 200 }
                ];
                break;
            case 3:
                this.unusedMirrors = 4;
                this.obstacles = [
                    { x: 300, y: 200, width: 50, height: 200 },
                    { x: 500, y: 300, width: 50, height: 200 }
                ];
                break;
            // 可以添加更多关卡
        }
    }

    addEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        
        document.getElementById('restart').addEventListener('click', () => {
            this.initializeLevel();
        });
        
        document.getElementById('next-level').addEventListener('click', () => {
            if (this.isSuccess) {
                this.level++;
                this.initializeLevel();
            }
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否点击现有镜子
        for (let mirror of this.mirrors) {
            const dx = x - mirror.x;
            const dy = y - mirror.y;
            if (Math.sqrt(dx * dx + dy * dy) < 25) {
                this.selectedMirror = mirror;
                mirror.isDragging = true;
                return;
            }
            
            // 检查是否点击旋转手柄
            const radians = mirror.angle * Math.PI / 180;
            const handleX = mirror.x + Math.cos(radians) * mirror.length / 2;
            const handleY = mirror.y + Math.sin(radians) * mirror.length / 2;
            const handleDx = x - handleX;
            const handleDy = y - handleY;
            if (Math.sqrt(handleDx * handleDx + handleDy * handleDy) < 10) {
                this.selectedMirror = mirror;
                mirror.isRotating = true;
                return;
            }
        }

        // 放置新镜子
        if (this.unusedMirrors > 0) {
            const newMirror = new Mirror(x, y);
            this.mirrors.push(newMirror);
            this.selectedMirror = newMirror;
            newMirror.isDragging = true;
            this.unusedMirrors--;
            document.getElementById('mirrors-left').textContent = this.unusedMirrors;
        }
    }

    handleMouseMove(e) {
        if (!this.selectedMirror) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.selectedMirror.isDragging) {
            this.selectedMirror.x = x;
            this.selectedMirror.y = y;
        } else if (this.selectedMirror.isRotating) {
            const dx = x - this.selectedMirror.x;
            const dy = y - this.selectedMirror.y;
            this.selectedMirror.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        }
    }

    handleMouseUp() {
        if (this.selectedMirror) {
            this.selectedMirror.isDragging = false;
            this.selectedMirror.isRotating = false;
            this.selectedMirror = null;
        }
    }

    // 检查光线是否被障碍物阻挡
    checkObstacleCollision(start, end) {
        for (let obstacle of this.obstacles) {
            // 简单的线段与矩形相交检测
            const lineStart = { x: start.x, y: start.y };
            const lineEnd = { x: end.x, y: end.y };
            
            // 矩形的四条边
            const edges = [
                { start: { x: obstacle.x, y: obstacle.y }, end: { x: obstacle.x + obstacle.width, y: obstacle.y } },
                { start: { x: obstacle.x + obstacle.width, y: obstacle.y }, end: { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height } },
                { start: { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height }, end: { x: obstacle.x, y: obstacle.y + obstacle.height } },
                { start: { x: obstacle.x, y: obstacle.y + obstacle.height }, end: { x: obstacle.x, y: obstacle.y } }
            ];

            for (let edge of edges) {
                if (this.lineIntersection(lineStart, lineEnd, edge.start, edge.end)) {
                    return true;
                }
            }
        }
        return false;
    }

    // 检查两条线段是否相交
    lineIntersection(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (denominator === 0) return false;

        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    traceLightPath() {
        let currentPoint = { ...this.lightSource };
        let currentAngle = 0; // 水平向右的初始角度
        let hitTarget = false;

        // 初始化绘制
        this.ctx.beginPath();
        this.ctx.moveTo(currentPoint.x, currentPoint.y);

        for (let i = 0; i < 10; i++) { // 最多反射10次
            const rayDirX = Math.cos(currentAngle);
            const rayDirY = Math.sin(currentAngle);

            // 寻找最近的交点
            let nearestPoint = null;
            let nearestDistance = Infinity;
            let nearestMirror = null;

            // 检查所有镜子
            for (const mirror of this.mirrors) {
                // 计算镜子的端点
                const radians = mirror.angle * Math.PI / 180;
                const dx = Math.cos(radians) * mirror.length / 2;
                const dy = Math.sin(radians) * mirror.length / 2;
                const x1 = mirror.x - dx;
                const y1 = mirror.y - dy;
                const x2 = mirror.x + dx;
                const y2 = mirror.y + dy;

                // 计算交点
                const denominator = (y2 - y1) * rayDirX - (x2 - x1) * rayDirY;
                if (Math.abs(denominator) < 0.0001) continue;

                const t1 = ((x2 - x1) * (currentPoint.y - y1) - (y2 - y1) * (currentPoint.x - x1)) / denominator;
                const t2 = (rayDirX * (currentPoint.y - y1) - rayDirY * (currentPoint.x - x1)) / denominator;

                if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
                    const intersectX = currentPoint.x + rayDirX * t1;
                    const intersectY = currentPoint.y + rayDirY * t1;
                    
                    if (t1 < nearestDistance) {
                        nearestDistance = t1;
                        nearestPoint = { x: intersectX, y: intersectY };
                        nearestMirror = mirror;
                    }
                }
            }

            // 绘制到交点或边界
            if (nearestPoint) {
                this.ctx.lineTo(nearestPoint.x, nearestPoint.y);
                currentPoint = nearestPoint;

                // 精确的反射计算
                const mirrorAngle = nearestMirror.angle * Math.PI / 180;
                
                // 计算镜面方向向量
                const mirrorDirX = Math.cos(mirrorAngle);
                const mirrorDirY = Math.sin(mirrorAngle);
                
                // 计算法线向量（垂直于镜面）
                let normalX = -mirrorDirY; // 默认法线方向
                let normalY = mirrorDirX;
                
                // 确定正确的法线方向（根据入射方向）
                const incidentX = Math.cos(currentAngle);
                const incidentY = Math.sin(currentAngle);
                const dot = incidentX * normalX + incidentY * normalY;
                
                // 如果入射方向与法线方向相反，翻转法线
                if (dot > 0) {
                    normalX = -normalX;
                    normalY = -normalY;
                }

                // 计算反射向量：R = I - 2(I·N)N
                const reflectX = incidentX - 2 * dot * normalX;
                const reflectY = incidentY - 2 * dot * normalY;
                
                // 更新光线角度
                currentAngle = Math.atan2(reflectY, reflectX);
            } else {
                // 绘制到画布边界
                const endX = currentPoint.x + rayDirX * 1000;
                const endY = currentPoint.y + rayDirY * 1000;
                this.ctx.lineTo(endX, endY);
                break;
            }
        }

        // 设置光线样式
        this.ctx.strokeStyle = this.lightColor;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 添加发光效果
        this.ctx.shadowColor = this.lightColor;
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // 更新游戏状态
        if (hitTarget && !this.isSuccess) {
            this.isSuccess = true;
            document.getElementById('next-level').disabled = false;
        }
    }

    calculateReflection(incidentAngle, mirrorAngle) {
        // 计算反射角度
        const normalAngle = mirrorAngle + 90;
        return 2 * normalAngle * Math.PI / 180 - incidentAngle;
    }

    checkTargetHit(start, direction) {
        const dx = Math.cos(direction);
        const dy = Math.sin(direction);
        const distance = Math.sqrt(
            (this.target.x - start.x) * (this.target.x - start.x) +
            (this.target.y - start.y) * (this.target.y - start.y)
        );
        
        return {
            point: this.target,
            distance: distance
        };
    }

    draw() {
        // 清除画布，使用柔和的背景色
        this.ctx.fillStyle = '#F0F7FF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制障碍物
        this.ctx.fillStyle = '#8899AA';
        for (let obstacle of this.obstacles) {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }

        // 绘制光源
        this.ctx.beginPath();
        this.ctx.arc(this.lightSource.x, this.lightSource.y, 12, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fill();
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.fillText('Light Source', this.lightSource.x - 40, this.lightSource.y - 20);

        // 绘制目标
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = this.isSuccess ? '#4CAF50' : '#FF6B6B';
        this.ctx.fill();
        this.ctx.fillStyle = '#333';
        this.ctx.fillText('Target', this.target.x - 20, this.target.y - 25);

        // 绘制镜子
        for (let mirror of this.mirrors) {
            mirror.draw(this.ctx);
        }

        // 绘制光路
        this.traceLightPath();
    }

    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 