class Cannon {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = canvas.width / 2;
        this.y = canvas.height - 30;  // 原来是 -50，改为 -30，使炮台位置更靠下
        this.angle = Math.PI/2; // 初始角度为90度（正上方）
        this.towerImg = document.getElementById('towerImg');
        this.cannonImg = document.getElementById('cannonImg');
        
        // 设置炮塔和炮管的尺寸（原尺寸的35%，即原来70%的一半）
        this.towerWidth = 80 * 0.35;   // 原80 → 28
        this.towerHeight = 80 * 0.35;  // 原80 → 28
        this.cannonWidth = 40 * 0.35;  // 原40 → 14
        this.cannonHeight = 100 * 0.35; // 原100 → 35
        
        // 角度限制（相对于正上方的左右各40度）
        this.minAngle = Math.PI/2 - Math.PI/4.5;  // 90度 - 40度 = 50度
        this.maxAngle = Math.PI/2 + Math.PI/4.5;  // 90度 + 40度 = 130度
        this.rotateSpeed = Math.PI/360;  // 改为2.5度 (原来是5度，现在减半)
    }

    draw() {
        this.ctx.save();
        
        // 绘制炮塔（固定部分）
        const towerX = this.x - this.towerWidth / 2;
        const towerY = this.y - this.towerHeight / 2;
        this.ctx.drawImage(this.towerImg, towerX, towerY, this.towerWidth, this.towerHeight);
        
        // 绘制炮管（可旋转部分）
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.angle - Math.PI/2);
        this.ctx.drawImage(
            this.cannonImg, 
            -this.cannonWidth / 2,
            -this.cannonHeight * 0.75, // 炮管向上偏移
            this.cannonWidth,
            this.cannonHeight
        );
        
        this.ctx.restore();
    }

    rotate(direction) {
        // direction: 1 表示向左旋转，-1 表示向右旋转
        const newAngle = this.angle - direction * this.rotateSpeed; // 反转方向
        if (newAngle >= this.minAngle && newAngle <= this.maxAngle) {
            this.angle = newAngle;
        }
    }

    getMuzzlePosition() {
        // 首先计算炮管底部的位置（炮台中心）
        const baseX = this.x;
        const baseY = this.y;
        
        // 计算炮管长度方向的单位向量
        const actualAngle = this.angle;  // 移除 - Math.PI/2，使用炮管的原始角度
        const dirX = Math.cos(actualAngle);
        const dirY = Math.sin(actualAngle);
        
        // 从炮台中心开始，沿着炮管方向移动到炮口位置
        return {
            x: baseX - dirX * this.cannonHeight * 0.75,  // 使用减号
            y: baseY - dirY * this.cannonHeight * 0.75   // 使用减号
        };
    }
}

class Bullet {
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.bulletImg = document.getElementById('bulletImg');
        this.width = 10;    // 原20 → 10
        this.height = 15;   // 原30 → 15
    }

    update() {
        // 保持移动方向不变
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI/2); // 旋转90度使子弹头部朝前
        ctx.drawImage(
            this.bulletImg,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.ufoImg = document.getElementById('ufoImg'); // 添加UFO图片引用
        this.targets = [];
        this.cannon = new Cannon(this.canvas);
        this.bullets = [];
        this.bulletSpeed = 3; // 降低子弹速度，从5改为3
        this.gameOver = false;
        this.keys = {}; // 用于跟踪按键状态

        // 初始化事件监听
        this.initEventListeners();
        // 初始化目标
        this.initTargets();
        // 开始游戏循环
        this.gameLoop();
    }

    initEventListeners() {
        // 添加键盘事件监听
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // 阻止空格键滚动页面
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    initTargets() {
        this.targets = [];
        const targetCount = 5 + this.level * 2; // 随关卡增加目标数量
        
        for (let i = 0; i < targetCount; i++) {
            this.targets.push({
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * 200 + 50, // 在上方区域生成目标
                speedX: (Math.random() - 0.5) * 4 * this.level, // 随关卡增加速度
                speedY: (Math.random() - 0.5) * 2 * this.level,
                width: 40,  // UFO的宽度
                height: 24  // UFO的高度
            });
        }
    }

    shoot() {
        const muzzlePos = this.cannon.getMuzzlePosition();
        const bullet = new Bullet(
            muzzlePos.x,
            muzzlePos.y,
            this.cannon.angle + Math.PI,  // 添加 Math.PI（180度）来反转方向
            this.bulletSpeed
        );
        this.bullets.push(bullet);
    }

    update() {
        if (this.gameOver) return;

        // 处理炮管旋转
        if (this.keys['ArrowLeft']) {
            this.cannon.rotate(1);  // 向左旋转
        }
        if (this.keys['ArrowRight']) {
            this.cannon.rotate(-1); // 向右旋转
        }

        // 添加空格键发射检测
        if (this.keys['Space']) {
            this.shoot();
            this.keys['Space'] = false; // 重置空格键状态，防止连续发射
        }

        // 更新子弹位置
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update();
            
            // 移除超出画布的子弹
            if (this.bullets[i].x < 0 || 
                this.bullets[i].x > this.canvas.width ||
                this.bullets[i].y < 0 || 
                this.bullets[i].y > this.canvas.height) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 检测子弹与目标的碰撞
            for (let j = this.targets.length - 1; j >= 0; j--) {
                const target = this.targets[j];
                const bullet = this.bullets[i];
                
                // 使用矩形碰撞检测
                if (bullet.x < target.x + target.width/2 &&
                    bullet.x > target.x - target.width/2 &&
                    bullet.y < target.y + target.height/2 &&
                    bullet.y > target.y - target.height/2) {
                    // 击中目标
                    this.targets.splice(j, 1);
                    this.bullets.splice(i, 1);
                    this.score += 10;
                    document.getElementById('score').textContent = this.score;
                    break;
                }
            }
        }

        // 更新目标位置
        for (let target of this.targets) {
            target.x += target.speedX;
            target.y += target.speedY;

            // 边界反弹
            if (target.x < target.width/2 || target.x > this.canvas.width - target.width/2) {
                target.speedX *= -1;
            }
            if (target.y < target.height/2 || target.y > this.canvas.height/2) {
                target.speedY *= -1;
            }
        }

        // 检查是否过关
        if (this.targets.length === 0) {
            this.level++;
            this.initTargets();
        }
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#F0F7FF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制UFO目标
        for (const target of this.targets) {
            this.ctx.drawImage(
                this.ufoImg,
                target.x - target.width/2,
                target.y - target.height/2,
                target.width,
                target.height
            );
        }

        // 绘制子弹
        for (const bullet of this.bullets) {
            bullet.draw(this.ctx);
        }

        // 绘制炮台
        this.cannon.draw();

        // 绘制分数和生命值
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(`关卡: ${this.level}`, 10, 30);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 