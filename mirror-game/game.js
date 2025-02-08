class Mirror {
    constructor(x, y, angle = 45) {
        this.x = x;
        this.y = y;
        this.angle = angle; // 角度（相对于水平线）
        this.isDragging = false;
        this.isRotating = false;
        // 加载镜子图片
        this.mirrorImage = new Image();
        this.mirrorImage.src = 'images/mirror.png';
        this.width = 50;   // 镜子图片宽度
        this.height = 10;  // 镜子图片高度
    }

    draw(ctx) {
        const radians = this.angle * Math.PI / 180;
        // 绘制镜子图片
        if (this.mirrorImage.complete) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(radians);
            ctx.drawImage(
                this.mirrorImage,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
            ctx.restore();
        }

        // 绘制旋转手柄
        const dx = Math.cos(radians) * this.width / 2;
        const dy = Math.sin(radians) * this.width / 2;
        ctx.beginPath();
        ctx.arc(this.x + dx, this.y + dy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA500';
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mirrors = [];
        this.lightSource = { 
            x: 30,
            y: this.canvas.height / 2, 
            angle: Math.PI / 4,
            rayAngle: Math.random() * Math.PI / 2 - Math.PI / 4  // 随机角度 (-45度到45度)
        };
        this.target = { 
            x: this.canvas.width - 50,
            y: 300,
            width: 40,
            height: 40
        };
        // 初始化目标动画
        this.targetFrames = [];
        this.currentFrame = 0;  // 从appear_1开始
        for (let i = 1; i <= 12; i++) {
            const img = new Image();
            img.src = `images/appear_${i}.png`;
            this.targetFrames.push(img);
        }
        this.targetAnimationTimer = 0;
        this.targetAnimationInterval = 200;  // 每帧间隔200ms

        // 加载背景图片
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'images/castle.png';

        // 加载障碍物动画帧
        this.obstacleFrames = [];
        for (let i = 0; i <= 10; i++) {
            const img = new Image();
            img.src = `images/bluebat/skeleton-fly_${i.toString().padStart(2, '0')}.png`;
            this.obstacleFrames.push(img);
        }
        this.obstacleFrame = 0;
        this.obstacleAnimationTimer = 0;
        this.obstacleAnimationInterval = 100;  // 每帧100ms

        // 随机生成障碍物
        this.obstacles = [];
        const obstacleCount = Math.floor(Math.random() * 16) + 15;  // 15到30之间的随机数
        // 将画布分成多个区域
        const gridCols = 4;
        const gridRows = 3;
        const cellWidth = this.canvas.width / gridCols;
        const cellHeight = this.canvas.height / gridRows;

        for (let i = 0; i < obstacleCount; i++) {
            // 随机选择一个网格单元
            const gridX = Math.floor(Math.random() * gridCols);
            const gridY = Math.floor(Math.random() * gridRows);
            
            // 在选定的网格单元内随机生成位置
            const x = gridX * cellWidth + Math.random() * (cellWidth - 120);  // 减去障碍物宽度
            const y = gridY * cellHeight + Math.random() * (cellHeight - 120);  // 减去障碍物高度
            
            // 检查是否太靠近光源或目标
            const tooCloseToSource = Math.hypot(x - this.lightSource.x, y - this.lightSource.y) < 150;
            const tooCloseToTarget = Math.hypot(x - this.target.x, y - this.target.y) < 150;
            
            if (!tooCloseToSource && !tooCloseToTarget) {
                this.obstacles.push({
                    x: x,
                    y: y,
                    width: 120,
                    height: 120
                });
            } else {
                i--;  // 重试
            }
        }

        this.selectedMirror = null;
        this.isSuccess = false;
        this.lightColor = 'rgba(255, 180, 80, 0.7)';  // 更淡的橙色
        this.gameStarted = false;  // 添加游戏状态标志
        this.laughSound = new Audio('audios/laugh.mp3');  // 添加音效
        this.startButton = document.getElementById('start-game');
        this.restartButton = document.getElementById('restart');

        // 加载光源图片
        this.flashlightImage = new Image();
        this.flashlightImage.src = 'images/flashlight.png';
        this.flashlightSize = 40;
        this.flashlightLength = 30;  // 手电筒的长度，用于计算光线起点
        
        // 加载消失音效
        this.disappearSound = new Audio('audios/aaa.mp3');

        // 目标状态
        this.targetAppearing = true;  // 新增：控制出现动画
        this.targetDisappearing = false;
        this.targetVisible = true;

        this.initializeLevel();
        this.addEventListeners();
        this.gameLoop();
    }

    initializeLevel() {
        this.mirrors = [];
        this.isSuccess = false;
        this.unusedMirrors = 3;  // 固定3个镜子
        document.getElementById('mirrors-left').textContent = this.unusedMirrors;
    }

    addEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        this.restartButton.addEventListener('click', () => {
            window.location.reload();
        });
        
        this.startButton.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.laughSound.play();
                this.startButton.disabled = true;
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
            const handleX = mirror.x + Math.cos(radians) * mirror.width / 2;
            const handleY = mirror.y + Math.sin(radians) * mirror.width / 2;
            const handleDx = x - handleX;
            const handleDy = y - handleY;
            if (Math.sqrt(handleDx * handleDx + handleDy * handleDy) < 10) {
                this.selectedMirror = mirror;
                mirror.isRotating = true;
                return;
            }
        }

        // 放置新镜子
        if (this.unusedMirrors > 0 && this.mirrors.length < 3) {  // 确保镜子数量不超过3个
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
        // 增加碰撞检测的精度
        for (let obstacle of this.obstacles) {
            // 使用实际的障碍物区域进行碰撞检测
            const rect = {
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
            };

            // 检查线段是否与矩形相交
            const edges = [
                {start: {x: rect.x, y: rect.y}, end: {x: rect.x + rect.width, y: rect.y}},  // 上边
                {start: {x: rect.x + rect.width, y: rect.y}, end: {x: rect.x + rect.width, y: rect.y + rect.height}},  // 右边
                {start: {x: rect.x + rect.width, y: rect.y + rect.height}, end: {x: rect.x, y: rect.y + rect.height}},  // 下边
                {start: {x: rect.x, y: rect.y + rect.height}, end: {x: rect.x, y: rect.y}}  // 左边
            ];

            for (let edge of edges) {
                const intersection = this.lineIntersection(start, end, edge.start, edge.end);
                if (intersection.intersects) {
                    return {
                        hit: true,
                        point: intersection.point
                    };
                }
            }
        }
        return { hit: false };
    }

    lineIntersection(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(denominator) < 1e-8) return { intersects: false };

        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return {
                intersects: true,
                point: {
                    x: p1.x + ua * (p2.x - p1.x),
                    y: p1.y + ua * (p2.y - p1.y)
                }
            };
        }
        return { intersects: false };
    }

    traceLightPath() {
        // 计算光线起点（从手电筒头部射出）
        let currentPoint = {
            x: this.lightSource.x + Math.cos(this.lightSource.angle) * this.flashlightSize/2,
            y: this.lightSource.y + Math.sin(this.lightSource.angle) * this.flashlightSize/2 - 10
        };
        let currentAngle = this.lightSource.rayAngle;
        let hitTarget = false;

        // 初始化绘制
        this.ctx.beginPath();
        this.ctx.moveTo(currentPoint.x, currentPoint.y);

        for (let i = 0; i < 10; i++) {
            const rayDirX = Math.cos(currentAngle);
            const rayDirY = Math.sin(currentAngle);

            // 首先检查是否击中目标
            if (this.targetVisible && !this.targetDisappearing && !this.targetAppearing) {
                const rayEnd = {
                    x: currentPoint.x + rayDirX * 1000,
                    y: currentPoint.y + rayDirY * 1000
                };
                
                // 检查光线是否穿过目标
                const targetHit = this.lineCircleIntersection(
                    currentPoint,
                    rayEnd,
                    {x: this.target.x, y: this.target.y},
                    20
                );
                
                if (targetHit) {
                    this.targetDisappearing = true;
                    this.currentFrame = 11;
                    this.disappearSound.currentTime = 0;
                    this.disappearSound.play()
                        .catch(e => console.log('音效播放失败:', e));
                    hitTarget = true;
                    this.ctx.lineTo(this.target.x, this.target.y);
                    break;
                }
            }

            // 寻找最近的交点
            let nearestPoint = null;
            let nearestDistance = Infinity;
            let nearestMirror = null;
            let obstacleHit = null;

            // 检查障碍物碰撞
            const rayEnd = {
                x: currentPoint.x + rayDirX * 1000,
                y: currentPoint.y + rayDirY * 1000
            };
            const collision = this.checkObstacleCollision(currentPoint, rayEnd);
            if (collision.hit) {
                const distance = Math.hypot(
                    collision.point.x - currentPoint.x,
                    collision.point.y - currentPoint.y
                );
                nearestDistance = distance;
                obstacleHit = collision.point;
            }

            // 检查镜子反射
            for (const mirror of this.mirrors) {
                // 计算镜子的端点
                const radians = mirror.angle * Math.PI / 180;
                const dx = Math.cos(radians) * mirror.width / 2;
                const dy = Math.sin(radians) * mirror.width / 2;
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
                    const distance = Math.hypot(
                        intersectX - currentPoint.x,
                        intersectY - currentPoint.y
                    );
                    
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestPoint = { x: intersectX, y: intersectY };
                        nearestMirror = mirror;
                        obstacleHit = null;  // 如果镜子更近，清除障碍物碰撞
                    }
                }
            }

            // 绘制到交点或边界
            if (obstacleHit) {
                // 光线被障碍物阻挡
                this.ctx.lineTo(obstacleHit.x, obstacleHit.y);
                break;
            } else if (nearestPoint) {
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
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // 增强发光效果
        this.ctx.shadowColor = this.lightColor;
        this.ctx.shadowBlur = 20;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // 添加光线渐变动画
        this.ctx.save();
        const gradient = this.ctx.createLinearGradient(
            currentPoint.x, currentPoint.y,
            currentPoint.x + Math.cos(currentAngle) * 100,
            currentPoint.y + Math.sin(currentAngle) * 100
        );
        gradient.addColorStop(0, this.lightColor);
        gradient.addColorStop(0.5, 'rgba(255, 180, 80, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 102, 0, 0)');
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 8;
        this.ctx.globalAlpha = 0.35;  // 进一步降低透明度
        this.ctx.stroke();
        this.ctx.restore();

        // 更新游戏状态
        if (hitTarget && !this.isSuccess) {
            this.isSuccess = true;
            // 添加成功特效
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 255, 150, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(this.target.x, this.target.y, 30, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
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

    drawLightSource() {
        // 绘制光源图片
        this.ctx.save();
        this.ctx.translate(this.lightSource.x, this.lightSource.y);
        this.ctx.rotate(this.lightSource.angle - Math.PI / 2);
        this.ctx.drawImage(
            this.flashlightImage,
            -this.flashlightSize / 2,
            -this.flashlightSize / 2,
            this.flashlightSize,
            this.flashlightSize
        );
        this.ctx.restore();
    }

    draw() {
        // 绘制背景
        if (this.backgroundImage.complete) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#F0F7FF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 绘制障碍物
        // 更新障碍物动画
        this.obstacleAnimationTimer += 16;
        if (this.obstacleAnimationTimer >= this.obstacleAnimationInterval) {
            this.obstacleFrame = (this.obstacleFrame + 1) % 11;
            this.obstacleAnimationTimer = 0;
        }

        for (let obstacle of this.obstacles) {
            if (this.obstacleFrames[this.obstacleFrame].complete) {
                this.ctx.drawImage(
                    this.obstacleFrames[this.obstacleFrame],
                    obstacle.x,
                    obstacle.y,
                    obstacle.width,
                    obstacle.height
                );
            }
        }

        // 绘制光源
        this.drawLightSource();

        // 绘制镜子
        for (let mirror of this.mirrors) {
            mirror.draw(this.ctx);
        }

        if (this.gameStarted) {
            // 处理目标出现动画
            if (this.targetAppearing) {
                this.targetAnimationTimer += 16;
                if (this.targetAnimationTimer >= this.targetAnimationInterval) {
                    this.targetAnimationTimer = 0;
                    if (this.currentFrame < 11) {
                        this.currentFrame++;
                    } else {
                        this.targetAppearing = false;
                    }
                }
            }
            // 处理目标消失动画
            else if (this.targetDisappearing) {
                this.targetAnimationTimer += 16;
                if (this.targetAnimationTimer >= this.targetAnimationInterval) {
                    this.targetAnimationTimer = 0;
                    if (this.currentFrame > 0) {
                        this.currentFrame--;
                    } else {
                        this.targetVisible = false;
                    }
                }
            }

            // 绘制目标（如果可见）
            if (this.targetVisible) {
                this.ctx.drawImage(
                    this.targetFrames[11 - this.currentFrame],  // 反转帧索引
                    this.target.x - this.target.width/2,
                    this.target.y - this.target.height/2,
                    this.target.width,
                    this.target.height
                );
            } else {
                // 显示游戏胜利消息
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, this.canvas.height/2 - 50, this.canvas.width, 100);
                this.ctx.font = 'bold 36px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('恭喜通关！', this.canvas.width/2, this.canvas.height/2);
                this.ctx.font = '24px Arial';
                this.ctx.fillText('点击"重新开始"开始新的游戏', this.canvas.width/2, this.canvas.height/2 + 40);
                this.ctx.restore();
            }

            // 绘制光路
            this.traceLightPath();
        }
    }

    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    init() {
        // 等待图片加载完成后再开始游戏
        this.flashlightImage.onload = () => {
            this.draw();  // 开始游戏循环
        };
    }

    // 添加新方法：检查线段是否与圆相交
    lineCircleIntersection(lineStart, lineEnd, circleCenter, radius) {
        // 计算线段向量
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        // 计算线段起点到圆心的向量
        const fx = lineStart.x - circleCenter.x;
        const fy = lineStart.y - circleCenter.y;
        
        // 计算二次方程系数
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - radius * radius;
        
        // 计算判别式
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            return false;  // 不相交
        }
        
        // 计算交点参数 t
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        // 检查交点是否在线段上
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 