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
        this.backgroundImg = document.getElementById('backgroundImg');
        this.ufoImg = document.getElementById('ufoImg');
        this.targets = [];
        this.fallingTargets = []; // 新增：存储坠落中的目标
        this.cannon = new Cannon(this.canvas);
        this.bullets = [];
        this.bulletSpeed = 3; // 降低子弹速度，从5改为3
        this.gameOver = false;
        this.keys = {}; // 用于跟踪按键状态
        this.explosionSound = document.getElementById('explosionSound');
        this.shootSound = document.getElementById('shootSound');
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = 0.15;  // 设置音量为30%
        this.bgMusic.loop = true;  // 确保循环播放
        // 直接开始播放背景音乐
        this.bgMusic.play()
            .then(() => console.log('背景音乐开始播放'))
            .catch(() => {
                // 如果自动播放失败，则等待用户交互后播放
                console.log('自动播放失败，等待用户交互...');
                this.playBackgroundMusic();
            });
        this.explosionImg = new Image();
        this.explosionImg.src = 'images/explosion.png'; // 假设图片保存在images文件夹
        this.explosions = []; // 存储正在播放的爆炸效果
        this.explosionFrameWidth = 192/4;  // 每帧宽度 (4列)
        this.explosionFrameHeight = 192/4; // 每帧高度 (4行)
        this.maxLevel = 5;  // 总关卡数
        this.bulletsPerLevel = {  // 每关初始炮弹数
            1: 25,
            2: 20,
            3: 18,
            4: 15,
            5: 10
        };
        this.remainingBullets = this.bulletsPerLevel[1];  // 剩余炮弹数
        this.canShoot = true;  // 是否可以发射
        this.gameMessage = '';  // 游戏消息
        this.messageTimer = 0;  // 消息显示计时器

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
        const targetCount = 10;  // 每关固定10个飞碟
        
        for (let i = 0; i < targetCount; i++) {
            this.targets.push({
                x: Math.random() * (this.canvas.width - 100) + 50,
                y: Math.random() * 200 + 50,
                speedX: (Math.random() - 0.5) * 3 + (this.level * 0.1),
                speedY: (Math.random() - 0.5) * 2.5 + (this.level * 0.1),
                width: 40,
                height: 24
            });
        }
        
        // 更新UI显示
        this.updateUI();
    }

    shoot() {
        if (!this.canShoot || this.remainingBullets <= 0) return;
        
        const muzzlePos = this.cannon.getMuzzlePosition();
        const bullet = new Bullet(
            muzzlePos.x,
            muzzlePos.y,
            this.cannon.angle + Math.PI,
            this.bulletSpeed
        );
        this.bullets.push(bullet);
        this.remainingBullets--;
        this.canShoot = false;  // 禁止发射直到当前炮弹消失
        
        this.shootSound.currentTime = 0;
        this.shootSound.play();
        
        this.updateUI();
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
                
                if (bullet.x < target.x + target.width/2 &&
                    bullet.x > target.x - target.width/2 &&
                    bullet.y < target.y + target.height/2 &&
                    bullet.y > target.y - target.height/2) {
                    // 添加爆炸效果
                    this.explosions.push({
                        x: target.x,
                        y: target.y,
                        frame: 0,
                        maxFrame: 16, // 4x4 = 16帧
                        frameTime: 0,
                        frameInterval: 50 // 每50ms更新一帧
                    });

                    // 击中目标，添加到坠落数组
                    const fallingTarget = {
                        ...target,
                        rotation: 0,
                        rotationSpeed: (Math.random() - 0.5) * 0.2, // 随机旋转速度
                        speedX: target.speedX * 0.5 + bullet.speed * Math.cos(bullet.angle) * 0.3, // 继承部分子弹速度
                        speedY: target.speedY * 0.5 + bullet.speed * Math.sin(bullet.angle) * 0.3 + 2, // 向下坠落
                        opacity: 1
                    };
                    this.fallingTargets.push(fallingTarget);
                    this.targets.splice(j, 1);
                    this.bullets.splice(i, 1);
                    this.score += 10;
                    this.explosionSound.currentTime = 0;
                    this.explosionSound.play();
                    document.getElementById('score').textContent = this.score;
                    this.updateUI();  // 更新UI显示，包括剩余飞碟数量
                    break;
                }
            }
        }

        // 更新坠落中的目标
        for (let i = this.fallingTargets.length - 1; i >= 0; i--) {
            const target = this.fallingTargets[i];
            
            // 更新位置
            target.x += target.speedX;
            target.y += target.speedY;
            target.speedY += 0.2; // 重力加速度
            target.rotation += target.rotationSpeed;
            target.opacity -= 0.01; // 逐渐消失

            // 如果完全透明或超出画布，则移除
            if (target.opacity <= 0 || target.y > this.canvas.height + target.height) {
                this.fallingTargets.splice(i, 1);
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

        // 检查是否可以发射
        if (!this.canShoot && this.bullets.length === 0) {
            this.canShoot = true;
        }

        // 检查游戏失败
        if (this.remainingBullets <= 0 && this.bullets.length === 0 && this.targets.length > 0) {
            this.gameOver = true;
            this.showMessage('游戏结束！请刷新页面重新开始', 5000);
            return;
        }

        // 检查是否过关
        if (this.targets.length === 0) {
            if (this.level < this.maxLevel) {
                this.level++;
                this.remainingBullets += this.bulletsPerLevel[this.level];  // 累加下一关的炮弹
                this.showMessage(`恭喜通过第${this.level-1}关！`, 2000);
                this.initTargets();
            } else {
                this.gameOver = true;
                this.showMessage('恭喜通关！你是最棒的！', 5000);
            }
        }

        // 更新爆炸动画
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.frameTime += 16; // 假设60fps，约16ms每帧

            if (explosion.frameTime >= explosion.frameInterval) {
                explosion.frame++;
                explosion.frameTime = 0;

                // 动画播放完毕，移除爆炸效果
                if (explosion.frame >= explosion.maxFrame) {
                    this.explosions.splice(i, 1);
                }
            }
        }

        // 更新消息计时器
        if (this.messageTimer > 0) {
            this.messageTimer -= 16;  // 假设60fps
            if (this.messageTimer <= 0) {
                this.gameMessage = '';
            }
        }
    }

    showMessage(message, duration) {
        this.gameMessage = message;
        this.messageTimer = duration;
    }

    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('bullets').textContent = this.remainingBullets;
        document.getElementById('ufos').textContent = this.targets.length;
    }

    draw() {
        // 绘制背景
        this.ctx.drawImage(this.backgroundImg, 0, 0, this.canvas.width, this.canvas.height);

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

        // 绘制坠落中的目标
        for (const target of this.fallingTargets) {
            this.ctx.save();
            this.ctx.translate(target.x, target.y);
            this.ctx.rotate(target.rotation);
            this.ctx.globalAlpha = target.opacity;
            this.ctx.drawImage(
                this.ufoImg,
                -target.width/2,
                -target.height/2,
                target.width,
                target.height
            );
            this.ctx.restore();
        }

        // 绘制爆炸效果
        for (const explosion of this.explosions) {
            const frameX = (explosion.frame % 4) * this.explosionFrameWidth;
            const frameY = Math.floor(explosion.frame / 4) * this.explosionFrameHeight;
            
            this.ctx.drawImage(
                this.explosionImg,
                frameX, frameY,
                this.explosionFrameWidth, this.explosionFrameHeight,
                explosion.x - this.explosionFrameWidth/2,
                explosion.y - this.explosionFrameHeight/2,
                this.explosionFrameWidth, this.explosionFrameHeight
            );
        }

        // 绘制游戏消息
        if (this.gameMessage) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, this.canvas.height/2 - 40, this.canvas.width, 80);
            this.ctx.font = 'bold 36px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.gameMessage, this.canvas.width/2, this.canvas.height/2 + 10);
            this.ctx.restore();
        }
    }

    playBackgroundMusic() {
        // 在用户首次交互时播放音乐
        const startMusic = () => {
            if (this.bgMusic.paused) {
                this.bgMusic.play()
                    .then(() => console.log('背景音乐开始播放'))
                    .catch(e => console.log('无法播放背景音乐:', e));
            }
            // 移除事件监听器
            window.removeEventListener('keydown', startMusic);
            window.removeEventListener('click', startMusic);
        };

        // 监听键盘和鼠标事件
        window.addEventListener('keydown', startMusic);
        window.addEventListener('click', startMusic);
    }

    gameLoop() {
        if (!this.gameOver) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        } else {
            this.bgMusic.pause();  // 游戏结束时停止背景音乐
        }
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 