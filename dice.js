class DiceGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.dice = [];
        this.diceCount = 1;
        this.isRolling = false;
        this.results = [];
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // シーン、カメラ、レンダラーの初期化
        this.scene = new THREE.Scene();
        
        const container = document.getElementById('three-container');
        console.log('Container found:', container);
        console.log('Container size:', container.clientWidth, container.clientHeight);
        
        // コンテナのサイズを使用してカメラとレンダラーを初期化
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const aspectRatio = containerWidth / containerHeight;
        
        this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(containerWidth, containerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0xf0f0f0);
        container.appendChild(this.renderer.domElement);
        
        console.log('Renderer created and added to container');
        
        // ライティング
        this.setupLighting();
        
        // 床を作成
        this.createFloor();
        
        // テスト用の立方体を追加（確実に見えるように）
        const testGeometry = new THREE.BoxGeometry(1, 1, 1);
        const testMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const testCube = new THREE.Mesh(testGeometry, testMaterial);
        testCube.position.set(0, 3, 0);
        this.scene.add(testCube);
        console.log('Test cube added');
        
        // 初期サイコロの作成
        this.createDice();
        
        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // 環境光（明るくする）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // 指向性ライト（明るくする）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // 追加のポイントライト
        const pointLight1 = new THREE.PointLight(0xffffff, 0.8);
        pointLight1.position.set(0, 8, 0);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xffffff, 0.6);
        pointLight2.position.set(-5, 5, 5);
        this.scene.add(pointLight2);
    }
    
    createFloor() {
        // 床のジオメトリとマテリアルを作成
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.8
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2; // 水平にする
        floor.position.y = 0;
        floor.receiveShadow = true;
        
        this.scene.add(floor);
    }
    
    createDiceGeometry() {
        // サイコロのジオメトリを作成（大きくする）
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        
        // サイコロの面にドットを描画するためのテクスチャを作成
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // 各面のテクスチャを作成（ドット表示）
        const materials = [];
        const faces = [
            { dots: 1, color: '#ffffff' }, // 1
            { dots: 2, color: '#ffffff' }, // 2
            { dots: 3, color: '#ffffff' }, // 3
            { dots: 4, color: '#ffffff' }, // 4
            { dots: 5, color: '#ffffff' }, // 5
            { dots: 6, color: '#ffffff' }  // 6
        ];
        
        faces.forEach(face => {
            // 各面用の個別キャンバスを作成
            const faceCanvas = document.createElement('canvas');
            faceCanvas.width = 512;
            faceCanvas.height = 512;
            const faceCtx = faceCanvas.getContext('2d');
            
            // 背景を描画（白いサイコロ）
            faceCtx.fillStyle = '#ffffff';
            faceCtx.fillRect(0, 0, 512, 512);
            
            // 枠線を描画
            faceCtx.strokeStyle = '#000000';
            faceCtx.lineWidth = 4;
            faceCtx.strokeRect(0, 0, 512, 512);
            
            // ドットを描画
            faceCtx.fillStyle = '#000000';
            this.drawDots(faceCtx, face.dots);
            
            // テクスチャを作成
            const texture = new THREE.CanvasTexture(faceCanvas);
            const material = new THREE.MeshPhongMaterial({ 
                map: texture,
                shininess: 30,
                specular: 0x111111
            });
            materials.push(material);
        });
        
        return { geometry, materials };
    }
    
    drawDots(ctx, count) {
        const centerX = 256;
        const centerY = 256;
        const dotSize = 40;
        const spacing = 80;
        
        switch(count) {
            case 1:
                this.drawDot(ctx, centerX, centerY, dotSize);
                break;
            case 2:
                this.drawDot(ctx, centerX - spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY + spacing/2, dotSize);
                break;
            case 3:
                this.drawDot(ctx, centerX - spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX, centerY, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY + spacing/2, dotSize);
                break;
            case 4:
                this.drawDot(ctx, centerX - spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX - spacing/2, centerY + spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY + spacing/2, dotSize);
                break;
            case 5:
                this.drawDot(ctx, centerX - spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX, centerY, dotSize);
                this.drawDot(ctx, centerX - spacing/2, centerY + spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY + spacing/2, dotSize);
                break;
            case 6:
                this.drawDot(ctx, centerX - spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY - spacing/2, dotSize);
                this.drawDot(ctx, centerX - spacing/2, centerY, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY, dotSize);
                this.drawDot(ctx, centerX - spacing/2, centerY + spacing/2, dotSize);
                this.drawDot(ctx, centerX + spacing/2, centerY + spacing/2, dotSize);
                break;
        }
    }
    
    drawDot(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    createDice() {
        // 既存のサイコロを削除
        this.dice.forEach(dice => {
            this.scene.remove(dice.mesh);
        });
        this.dice = [];
        
        // ドット付きテクスチャを使用したサイコロを作成
        const { geometry, materials } = this.createDiceGeometry();
        
        // 指定された数のサイコロを作成
        for (let i = 0; i < this.diceCount; i++) {
            const mesh = new THREE.Mesh(geometry, materials);
            // サイコロの数に応じて間隔を調整
            const spacing = Math.max(3, 6 - this.diceCount);
            mesh.position.set((i - (this.diceCount - 1) / 2) * spacing, 2, 0);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            this.scene.add(mesh);
            this.dice.push({
                mesh: mesh,
                value: 1,
                isRolling: false,
                velocity: new THREE.Vector3(0, 0, 0),
                angularVelocity: new THREE.Vector3(0, 0, 0),
                position: new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z),
                rotation: new THREE.Euler(0, 0, 0)
            });
        }
        
        // カメラの位置を調整（サイコロが見えるように近づける）
        this.camera.position.set(0, 3, 5);
        this.camera.lookAt(0, 2, 0);
        
        // サイコロを少し回転させて見やすくする
        this.dice.forEach(dice => {
            dice.mesh.rotation.x = 0.2;
            dice.mesh.rotation.y = 0.2;
        });
        
        console.log('Dice created:', this.dice.length);
    }
    
    rollDice() {
        if (this.isRolling) return;
        
        this.isRolling = true;
        this.results = [];
        
        // ボタンを無効化
        const rollButton = document.getElementById('roll-button');
        rollButton.disabled = true;
        rollButton.textContent = '振り中...';
        
        // 各サイコロに個別の物理パラメータを設定
        this.dice.forEach((dice, index) => {
            dice.isRolling = true;
            
            // 個別の投げる方向と力（ランダム）
            const throwAngle = (Math.random() - 0.5) * Math.PI / 3; // ±30度
            const throwForce = 8 + Math.random() * 4; // 8-12の力
            const throwHeight = 3 + Math.random() * 2; // 3-5の高さ
            
            // 初期位置（投げる位置）
            dice.position.set(
                (index - (this.diceCount - 1) / 2) * 4,
                throwHeight,
                -2
            );
            
            // 初期速度（放物線の軌道）
            dice.velocity.set(
                Math.sin(throwAngle) * throwForce,
                6 + Math.random() * 2, // 上向きの速度
                Math.cos(throwAngle) * throwForce
            );
            
            // 個別の回転速度（ランダム）
            dice.angularVelocity.set(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            
            // 重力と摩擦の定数
            dice.gravity = 0.02;
            dice.friction = 0.95;
            dice.bounce = 0.4;
            
            // アニメーション開始時間を個別に設定
            dice.animationStartTime = Date.now();
        });
    }
    
    updateDicePhysics(dice) {
        if (!dice.isRolling) return;
        
        // 時間ベースの物理シミュレーション
        const dt = this.deltaTime;
        
        // 重力を適用（時間ベース）
        dice.velocity.y -= dice.gravity * dt;
        
        // 位置を更新（時間ベース）
        dice.position.x += dice.velocity.x * dt;
        dice.position.y += dice.velocity.y * dt;
        dice.position.z += dice.velocity.z * dt;
        
        // 床との衝突判定
        if (dice.position.y <= 1) { // サイコロの半径（1）で床に接触
            dice.position.y = 1;
            
            // 床での反射
            if (dice.velocity.y < 0) {
                dice.velocity.y *= -dice.bounce;
                dice.velocity.x *= dice.friction;
                dice.velocity.z *= dice.friction;
            }
            
            // 速度が十分小さくなったら停止
            if (Math.abs(dice.velocity.y) < 0.1 && 
                Math.abs(dice.velocity.x) < 0.1 && 
                Math.abs(dice.velocity.z) < 0.1) {
                this.stopDice(dice);
            }
            
            // タイムアウト処理（5秒で強制停止）
            if (Date.now() - dice.animationStartTime > 5000) {
                this.stopDice(dice);
            }
        }
        
        // 回転を更新（時間ベース）
        dice.rotation.x += dice.angularVelocity.x * dt;
        dice.rotation.y += dice.angularVelocity.y * dt;
        dice.rotation.z += dice.angularVelocity.z * dt;
        
        // 回転速度を減衰（時間ベース）
        const angularDecay = Math.pow(0.99, dt * 60); // 60FPS基準で正規化
        dice.angularVelocity.multiplyScalar(angularDecay);
        
        // メッシュの位置と回転を更新
        dice.mesh.position.copy(dice.position);
        dice.mesh.rotation.set(dice.rotation.x, dice.rotation.y, dice.rotation.z);
    }
    
    stopDice(dice) {
        dice.isRolling = false;
        
        // サイコロの値を決定（実際の向きに基づく）
        const value = this.calculateDiceValue(dice);
        dice.value = value;
        this.results.push(value);
        
        // 全てのサイコロが止まったら結果を表示
        if (this.results.length === this.diceCount) {
            this.showResults();
        }
    }
    
    calculateDiceValue(dice) {
        // サイコロの現在の回転から、上向きの面を計算
        const rotation = dice.mesh.rotation;
        
        // 各面の法線ベクトルを計算
        const faces = [
            { normal: new THREE.Vector3(0, 1, 0), value: 1 },   // 上面
            { normal: new THREE.Vector3(0, -1, 0), value: 6 },  // 下面
            { normal: new THREE.Vector3(1, 0, 0), value: 4 },   // 右面
            { normal: new THREE.Vector3(-1, 0, 0), value: 3 },  // 左面
            { normal: new THREE.Vector3(0, 0, 1), value: 2 },   // 前面
            { normal: new THREE.Vector3(0, 0, -1), value: 5 }   // 後面
        ];
        
        // ワールド座標での上向きベクトル
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        let maxDot = -1;
        let resultValue = 1;
        
        // 各面の法線ベクトルをワールド座標に変換して比較
        faces.forEach(face => {
            const worldNormal = face.normal.clone();
            worldNormal.applyQuaternion(dice.mesh.quaternion);
            
            const dot = worldNormal.dot(worldUp);
            if (dot > maxDot) {
                maxDot = dot;
                resultValue = face.value;
            }
        });
        
        return resultValue;
    }
    
    showResults() {
        // 結果表示
        const diceResults = document.getElementById('dice-results');
        const totalResult = document.getElementById('total-result');
        
        diceResults.innerHTML = '';
        this.results.forEach((result, index) => {
            const resultElement = document.createElement('span');
            resultElement.className = 'dice-result';
            resultElement.textContent = result;
            diceResults.appendChild(resultElement);
        });
        
        const total = this.results.reduce((sum, value) => sum + value, 0);
        totalResult.textContent = `合計: ${total}`;
        
        // ボタンを有効化
        const rollButton = document.getElementById('roll-button');
        rollButton.disabled = false;
        rollButton.textContent = 'サイコロを振る';
        
        this.isRolling = false;
    }
    
    setupEventListeners() {
        // サイコロを振るボタン
        document.getElementById('roll-button').addEventListener('click', () => {
            this.rollDice();
        });
        
        // サイコロの数変更
        document.getElementById('dice-count').addEventListener('change', (e) => {
            this.diceCount = parseInt(e.target.value);
            this.createDice();
        });
    }
    
    animate(currentTime = 0) {
        requestAnimationFrame((time) => this.animate(time));
        
        // デルタタイムを計算
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
        }
        this.deltaTime = (currentTime - this.lastTime) / 1000; // 秒に変換
        this.lastTime = currentTime;
        
        // 物理シミュレーションを実行（時間ベース）
        this.dice.forEach(dice => {
            this.updateDicePhysics(dice);
        });
        
        this.renderer.render(this.scene, this.camera);
        
        // デバッグ用：初回のみログ出力
        if (!this.debugLogged) {
            console.log('Animation started, dice count:', this.dice.length);
            this.debugLogged = true;
        }
    }
    
    onWindowResize() {
        const container = document.getElementById('three-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // カメラとレンダラーのアスペクト比を同期
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// ページ読み込み完了後にゲームを開始
document.addEventListener('DOMContentLoaded', () => {
    new DiceGame();
});
