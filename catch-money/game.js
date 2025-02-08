class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 加载背景图
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'images/background.png';
        
        // 加载音效
        this.sounds = {
            bgm: new Audio('audios/bgm.wav'),
            correct: new Audio('audios/correct.mp3'),
            freeze: new Audio('audios/freeze.wav')
        };
        
        // 设置背景音乐循环
        this.sounds.bgm.loop = true;
        
        // 初始化游戏状态
        this.gameStarted = false;
        this.money = 0;
        this.isFrozen = false;
        this.frozenTimer = 0;
        this.gameTime = 60000;  // 60秒游戏时间
        this.isGameOver = false;  // 游戏是否结束
        
        // 盘子属性
        this.plate = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            width: 150,  // 盘子宽度翻倍
            height: 50,  // 盘子高度翻倍
            speed: 8
        };

        // 红包和作业数组
        this.items = [];
        
        // 加载图片
        this.images = {
            plate: new Image(),
            redPacket: new Image(),
            homework: new Image()
        };
        this.images.plate.src = 'images/plate.png';  // 确保这是一个盘子或手的图片
        this.images.redPacket.src = 'images/red-packet.png';  // 确保这是一个红包图片
        this.images.homework.src = 'images/homework.png';  // 确保这是一个作业本图片

        // 获取按钮元素
        this.startButton = document.getElementById('start-game');
        this.restartButton = document.getElementById('restart');

        // 绑定事件
        this.bindEvents();
        
        // 开始游戏循环
        this.lastSpawnTime = 0;
        this.spawnInterval = 400;  // 生成间隔减半，增加频率
        
        // 初始化时绘制一次画面
        this.draw();
    }

    bindEvents() {
        // 添加开始游戏按钮事件
        this.startButton.addEventListener('click', () => {
            this.gameStarted = true;
            this.gameStartTime = Date.now();
            // 开始播放背景音乐
            this.sounds.bgm.play().catch(e => console.log('BGM播放失败:', e));
            this.startButton.style.display = 'none';
            this.restartButton.style.display = 'inline-block';
            this.gameLoop();
        });

        // 添加重新开始按钮事件
        this.restartButton.addEventListener('click', () => {
            // 停止背景音乐
            this.sounds.bgm.pause();
            this.sounds.bgm.currentTime = 0;
            window.location.reload();
        });

        // 监听鼠标移动
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isFrozen && this.gameStarted) {  // 只在游戏开始后响应鼠标移动
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                this.plate.x = Math.max(this.plate.width/2, 
                    Math.min(mouseX, this.canvas.width - this.plate.width/2));
            }
        });
    }

    spawnItem() {
        if (!this.gameStarted) return;
        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval) {
            // 90%概率生成红包，10%概率生成作业
            const isHomework = Math.random() < 0.1;
            
            this.items.push({
                x: Math.random() * (this.canvas.width - 30),
                y: -30,
                width: 50,   // 物品宽度翻倍
                height: 50,  // 物品高度翻倍
                speed: (2.5 + Math.random() * 1.5),  // 速度减半
                type: isHomework ? 'homework' : 'redPacket'
            });
            
            this.lastSpawnTime = now;
            this.spawnInterval = 400;  // 保持较快的生成频率
        }
    }

    updateItems() {
        // 检查游戏是否结束
        if (this.gameStarted && !this.isGameOver) {
            const currentTime = Date.now();
            const elapsedTime = currentTime - this.gameStartTime;
            if (elapsedTime >= this.gameTime) {
                this.isGameOver = true;
                // 停止背景音乐
                this.sounds.bgm.pause();
                return;
            }
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += item.speed;

            // 检查是否接住
            if (!this.isFrozen && 
                item.y + item.height > this.plate.y &&
                item.y < this.plate.y + this.plate.height &&
                item.x + item.width > this.plate.x - this.plate.width/2 &&
                item.x < this.plate.x + this.plate.width/2) {
                
                if (item.type === 'redPacket') {
                    this.money += 100;
                    // 播放接到红包的音效
                    this.sounds.correct.currentTime = 0;
                    this.sounds.correct.play().catch(e => console.log('音效播放失败:', e));
                } else {
                    this.isFrozen = true;
                    this.frozenTimer = 5000;
                    // 播放接到作业的音效
                    this.sounds.freeze.currentTime = 0;
                    this.sounds.freeze.play().catch(e => console.log('音效播放失败:', e));
                }
                this.items.splice(i, 1);
                continue;
            }

            // 移除超出画布的物品
            if (item.y > this.canvas.height) {
                this.items.splice(i, 1);
                console.log('物品超出画布');  // 添加调试信息
            }
        }

        // 更新冻结状态
        if (this.isFrozen) {
            this.frozenTimer -= 16;
            if (this.frozenTimer <= 0) {
                this.isFrozen = false;
            }
        }
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景图
        if (this.backgroundImage.complete) {
            this.ctx.drawImage(
                this.backgroundImage,
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );
        }

        // 如果游戏还没开始，显示提示文字
        if (!this.gameStarted) {
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('点击"开始游戏"按钮开始', this.canvas.width/2, this.canvas.height/2);
            return;
        }

        // 如果游戏结束，显示结算信息
        if (this.isGameOver) {
            this.ctx.save();
            // 半透明黑色背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 显示结算信息
            this.ctx.font = 'bold 40px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏结束！', this.canvas.width/2, this.canvas.height/2 - 50);
            this.ctx.fillStyle = '#FFD700';  // 金色
            this.ctx.fillText(`恭喜你，获得 ￥${this.money} 元红包！`, 
                this.canvas.width/2, this.canvas.height/2 + 20);
            this.ctx.restore();
            return;
        }

        // 绘制调试信息
        this.ctx.font = 'bold 24px Arial';  // 更大的字体
        this.ctx.fillStyle = '#333';
        // 显示剩余时间
        const remainingTime = Math.max(0, Math.ceil((this.gameTime - (Date.now() - this.gameStartTime)) / 1000));
        this.ctx.fillText(`剩余时间: ${remainingTime}秒`, this.canvas.width - 180, 40);

        // 绘制盘子
        if (this.images.plate.complete) {
            this.ctx.save();
            if (this.isFrozen) {
                this.ctx.globalAlpha = 0.5;
            }
            // 如果图片加载失败，绘制一个简单的盘子
            if (this.images.plate.naturalWidth === 0) {
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(
                    this.plate.x - this.plate.width/2,
                    this.plate.y,
                    this.plate.width,
                    this.plate.height
                );
            } else {
                this.ctx.drawImage(
                    this.images.plate,
                    this.plate.x - this.plate.width/2,
                    this.plate.y,
                    this.plate.width,
                    this.plate.height
                );
            }
            this.ctx.restore();
        }

        // 绘制物品
        for (const item of this.items) {
            const img = item.type === 'redPacket' ? 
                this.images.redPacket : this.images.homework;
            // 如果图片加载失败，绘制简单的替代形状
            if (!img.complete || img.naturalWidth === 0) {
                this.ctx.fillStyle = item.type === 'redPacket' ? 'red' : 'blue';
                this.ctx.fillRect(item.x, item.y, item.width, item.height);
            } else {
                this.ctx.drawImage(img, item.x, item.y, item.width, item.height);
            }
        }

        // 绘制得分
        this.ctx.font = 'bold 32px Arial';  // 更大更粗的字体
        this.ctx.fillStyle = '#FF0000';  // 更鲜艳的红色
        this.ctx.fillText(`￥${this.money}`, 20, 100);  // 位置往下移

        // 如果被冻结，显示倒计时
        if (this.isFrozen) {
            this.ctx.font = '20px Arial';
            this.ctx.fillStyle = 'blue';
            this.ctx.fillText(`冻结: ${Math.ceil(this.frozenTimer/1000)}秒`, 
                this.canvas.width - 180, 80);  // 调整位置以避免与时间重叠
        }
    }

    gameLoop() {
        if (!this.gameStarted || this.isGameOver) return;
        this.spawnItem();
        this.updateItems();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.onload = () => {
    new Game();
}; 