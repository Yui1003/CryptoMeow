
import Phaser from 'phaser';

interface CatSprite extends Phaser.GameObjects.Sprite {
  catData?: any;
  coinTimer?: Phaser.Time.TimerEvent;
  isWorking?: boolean;
}

export class FarmScene extends Phaser.Scene {
  private cats: CatSprite[] = [];
  private farmData: any = null;
  private callbacks: any = {};
  private backgroundTiles: Phaser.GameObjects.TileSprite[] = [];
  private timeOfDay: number = 0;
  private weatherParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private noCatsMessage?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'FarmScene' });
  }

  preload() {
    // Create fallback textures first
    this.createEnvironmentSprites();
    this.createAllFallbackTextures();
    
    // Try to load actual assets but don't depend on them
    this.load.on('loaderror', (file: any) => {
      console.warn('Asset failed to load, using fallback:', file.key);
    });

    // Load cat sprites based on actual file structure
    // House Cat = Classical
    this.load.image('basic_idle', 'assets/AllCats/Classical/IdleCat.png');
    this.load.image('basic_jump', 'assets/AllCats/Classical/JumpCat.png');
    
    // Farm Cat = TigerCatFree  
    this.load.image('farm_idle', 'assets/AllCats/TigerCatFree/IdleCatt.png');
    this.load.image('farm_jump', 'assets/AllCats/TigerCatFree/JumpCattt.png');
    
    // Business Cat = BlackCat
    this.load.image('business_idle', 'assets/AllCats/BlackCat/IdleCatb.png');
    this.load.image('business_jump', 'assets/AllCats/BlackCat/JumpCabt.png');
    
    // Ninja Cat = BatmanCatFree
    this.load.image('ninja_idle', 'assets/AllCats/BatmanCatFree/IdleCatt.png');
    this.load.image('ninja_jump', 'assets/AllCats/BatmanCatFree/JumpCattt.png');
    
    // Cyber Cat = ThreeColorFree
    this.load.image('cyber_idle', 'assets/AllCats/ThreeColorFree/IdleCatt.png');
    this.load.image('cyber_jump', 'assets/AllCats/ThreeColorFree/JumpCattt.png');
    
    // Golden Cat = EgyptCatFree
    this.load.image('golden_idle', 'assets/AllCats/EgyptCatFree/IdleCatb.png');
    this.load.image('golden_jump', 'assets/AllCats/EgyptCatFree/JumpCabt.png');
    
    // Load cat materials
    this.load.image('cat_bed', 'assets/CatMaterials/CatBedBlue.png');
    this.load.image('cat_bowls', 'assets/CatMaterials/CatBowls.png');
    this.load.image('blue_ball', 'assets/CatMaterials/BlueBall-Sheet.png');
    this.load.image('orange_ball', 'assets/CatMaterials/OrangeBall-Sheet.png');
    this.load.image('pink_ball', 'assets/CatMaterials/PinkBall-Sheet.png');
    this.load.image('mouse_toy', 'assets/CatMaterials/Mouse-Sheet.png');
  }

  

  create() {
    this.createBackground();
    this.createAnimations();
    this.createLighting();
    this.setupInput();
    this.startGameLoop();
  }

  private createAnimations() {
    const catTypes = ['basic', 'farm', 'business', 'ninja', 'cyber', 'golden'];
    
    catTypes.forEach(type => {
      // Only create animation if both textures exist
      if (this.textures.exists(`${type}_idle`) && this.textures.exists(`${type}_jump`)) {
        // Create idle animation (alternating between idle and slight bounce)
        this.anims.create({
          key: `${type}_idle`,
          frames: [
            { key: `${type}_idle` },
            { key: `${type}_idle` },
            { key: `${type}_idle` },
            { key: `${type}_jump` },
            { key: `${type}_idle` },
            { key: `${type}_idle` }
          ],
          frameRate: 3,
          repeat: -1
        });
        
        // Create working animation (more active jumping)
        this.anims.create({
          key: `${type}_working`,
          frames: [
            { key: `${type}_jump` },
            { key: `${type}_idle` },
            { key: `${type}_jump` },
            { key: `${type}_idle` }
          ],
          frameRate: 4,
          repeat: -1
        });
      }
    });
  }

  private createEnvironmentSprites() {
    // Create coin sprite
    const coinCanvas = this.add.renderTexture(0, 0, 16, 16);
    const coinGraphics = this.add.graphics();
    coinGraphics.fillStyle(0xFFD700);
    coinGraphics.fillCircle(8, 8, 6);
    coinGraphics.lineStyle(1, 0xFFA500);
    coinGraphics.strokeCircle(8, 8, 6);
    coinCanvas.draw(coinGraphics);
    coinGraphics.destroy();
    this.textures.addRenderTexture('coin', coinCanvas);

    // Create house sprite
    const houseCanvas = this.add.renderTexture(0, 0, 48, 48);
    const houseGraphics = this.add.graphics();
    houseGraphics.fillStyle(0x8B4513);
    houseGraphics.fillRect(8, 24, 32, 20);
    houseGraphics.fillStyle(0xFF0000);
    houseGraphics.fillTriangle(24, 8, 8, 24, 40, 24);
    houseCanvas.draw(houseGraphics);
    houseGraphics.destroy();
    this.textures.addRenderTexture('house', houseCanvas);
  }

  private createAllFallbackTextures() {
    const catTypes = ['basic', 'farm', 'business', 'ninja', 'cyber', 'golden'];
    catTypes.forEach(catId => {
      this.createFallbackCatTexture(catId);
    });
  }

  private createFallbackCatTexture(catId: string): string {
    const colors: { [key: string]: number } = {
      'basic': 0xFFB366,
      'farm': 0x8B4513,
      'business': 0x2F4F4F,
      'ninja': 0x2C2C2C,
      'cyber': 0x4169E1,
      'golden': 0xFFD700
    };

    const color = colors[catId] || 0xFFB366;
    const textureKey = `fallback_${catId}`;
    
    // Create fallback cat texture - larger and more visible
    const catCanvas = this.add.renderTexture(0, 0, 120, 120);
    const catGraphics = this.add.graphics();
    
    // Cat body (oval)
    catGraphics.fillStyle(color);
    catGraphics.fillEllipse(60, 75, 70, 45);
    
    // Cat head (circle)
    catGraphics.fillEllipse(60, 40, 50, 40);
    
    // Cat ears (triangles)
    catGraphics.fillTriangle(35, 25, 45, 10, 50, 25);
    catGraphics.fillTriangle(70, 25, 75, 10, 85, 25);
    
    // Ear insides
    catGraphics.fillStyle(0xFF69B4);
    catGraphics.fillTriangle(40, 22, 43, 15, 47, 22);
    catGraphics.fillTriangle(73, 22, 77, 15, 80, 22);
    
    // Cat eyes (circles)
    catGraphics.fillStyle(0x00FF00);
    catGraphics.fillCircle(48, 35, 5);
    catGraphics.fillCircle(72, 35, 5);
    
    // Eye pupils
    catGraphics.fillStyle(0x000000);
    catGraphics.fillCircle(48, 35, 2);
    catGraphics.fillCircle(72, 35, 2);
    
    // Cat nose (triangle)
    catGraphics.fillStyle(0xFF69B4);
    catGraphics.fillTriangle(57, 42, 63, 42, 60, 48);
    
    // Cat mouth
    catGraphics.lineStyle(2, 0x000000);
    catGraphics.beginPath();
    catGraphics.moveTo(60, 48);
    catGraphics.lineTo(55, 55);
    catGraphics.moveTo(60, 48);
    catGraphics.lineTo(65, 55);
    catGraphics.strokePath();
    
    // Cat whiskers
    catGraphics.lineStyle(1, 0x000000);
    catGraphics.beginPath();
    catGraphics.moveTo(30, 40);
    catGraphics.lineTo(45, 42);
    catGraphics.moveTo(75, 42);
    catGraphics.lineTo(90, 40);
    catGraphics.moveTo(30, 48);
    catGraphics.lineTo(45, 48);
    catGraphics.moveTo(75, 48);
    catGraphics.lineTo(90, 48);
    catGraphics.strokePath();
    
    // Cat tail
    catGraphics.fillStyle(color);
    catGraphics.fillEllipse(100, 80, 25, 12);
    
    // Paws
    catGraphics.fillCircle(45, 95, 8);
    catGraphics.fillCircle(75, 95, 8);
    
    catCanvas.draw(catGraphics);
    catGraphics.destroy();
    this.textures.addRenderTexture(textureKey, catCanvas);
    
    console.log(`Created fallback texture for ${catId}`);
    return textureKey;
  }

  private createBackground() {
    // Create a beautiful farm background
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Create gradient background
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x228B22, 0x228B22, 1);
    gradient.fillRect(0, 0, width, height);
    
    // Add grass texture pattern
    const tileSize = 80;
    const rows = Math.ceil(height / tileSize) + 1;
    const cols = Math.ceil(width / tileSize) + 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize;
        const y = row * tileSize + height * 0.3; // Start grass from middle-down
        
        if (y < height) {
          const grassShade = (row + col) % 3;
          const colors = [0x228B22, 0x32CD32, 0x2E8B57];
          const alpha = 0.6 + (grassShade * 0.1);
          
          const tile = this.add.rectangle(x, y, tileSize, tileSize, colors[grassShade], alpha);
          tile.setOrigin(0, 0);
          
          // Add some random grass details
          if (Math.random() < 0.3) {
            const detail = this.add.circle(
              x + Math.random() * tileSize,
              y + Math.random() * tileSize,
              2 + Math.random() * 3,
              0x006400,
              0.5
            );
          }
          
          this.backgroundTiles.push(tile as any);
        }
      }
    }
  }

  private createLighting() {
    // Day/night cycle overlay
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000080,
      0
    );

    this.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 0.3 },
      duration: 30000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const clickedObjects = this.physics.overlapRect(pointer.x, pointer.y, 1, 1);
      // Handle clicks on cats, buildings, etc.
    });
  }

  private startGameLoop() {
    // Main game loop for animations and updates
    this.time.addEvent({
      delay: 100,
      callback: this.updateGame,
      callbackScope: this,
      loop: true
    });
  }

  private updateGame() {
    this.updateCats();
    this.updateTimeOfDay();
  }

  private updateCats() {
    this.cats.forEach(cat => {
      if (cat.catData && !cat.isWorking) {
        // Random chance for cat to start working
        if (Math.random() < 0.01) {
          this.startCatWorking(cat);
        }
      }
    });
  }

  private startCatWorking(cat: CatSprite) {
    cat.isWorking = true;
    
    // Switch to working animation if available
    const workingAnimKey = `${cat.catData.catId}_working`;
    if (this.anims.exists(workingAnimKey)) {
      cat.play(workingAnimKey);
    }
    
    // Move cat to a work position
    const workX = Phaser.Math.Between(100, this.cameras.main.width - 100);
    const workY = Phaser.Math.Between(100, this.cameras.main.height - 100);
    
    this.tweens.add({
      targets: cat,
      x: workX,
      y: workY,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        this.createCoinAnimation(cat);
        setTimeout(() => {
          cat.isWorking = false;
          // Switch back to idle animation
          const idleAnimKey = `${cat.catData.catId}_idle`;
          if (this.anims.exists(idleAnimKey)) {
            cat.play(idleAnimKey);
          }
        }, 3000);
      }
    });
  }

  private createCoinAnimation(cat: CatSprite) {
    const coin = this.add.sprite(cat.x, cat.y - 20, 'coin');
    
    // Floating coin animation
    this.tweens.add({
      targets: coin,
      y: coin.y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        coin.destroy();
      }
    });

    // Add sparkle effect
    const sparkles = this.add.particles(cat.x, cat.y - 20, 'coin', {
      scale: { start: 0.1, end: 0 },
      speed: { min: 20, max: 40 },
      lifespan: 800,
      quantity: 3
    });

    setTimeout(() => sparkles.destroy(), 1000);
  }

  private updateTimeOfDay() {
    this.timeOfDay += 0.001;
    if (this.timeOfDay > Math.PI * 2) {
      this.timeOfDay = 0;
    }
  }

  // Public methods for React integration
  setCallbacks(callbacks: any) {
    this.callbacks = callbacks;
  }

  updateFarmData(farmData: any) {
    this.farmData = farmData;
    console.log('Farm data updated:', farmData);
    this.syncCatsWithData();
  }

  private syncCatsWithData() {
    if (!this.farmData) {
      console.log('No farm data available');
      return;
    }

    if (!this.farmData.cats || this.farmData.cats.length === 0) {
      console.log('No cats in farm data, clearing existing cats');
      // Clear all cats if none in data
      this.cats.forEach(cat => cat.destroy());
      this.cats = [];
      
      // Show helpful message
      this.showNoCatsMessage();
      return;
    }

    console.log('Syncing cats:', this.farmData.cats);

    // Clear no cats message if it exists
    if (this.noCatsMessage) {
      this.noCatsMessage.destroy();
      this.noCatsMessage = undefined;
    }

    // Remove excess cats
    while (this.cats.length > this.farmData.cats.length) {
      const cat = this.cats.pop();
      if (cat) cat.destroy();
    }

    // Add or update cats
    this.farmData.cats.forEach((catData: any, index: number) => {
      if (index >= this.cats.length) {
        console.log('Creating new cat:', catData);
        this.createCat(catData);
      } else {
        console.log('Updating existing cat:', catData);
        this.updateCat(this.cats[index], catData);
      }
    });
  }

  private createCat(catData: any) {
    console.log('Creating cat with data:', catData);
    
    const x = Phaser.Math.Between(200, this.cameras.main.width - 200);
    const y = Phaser.Math.Between(350, this.cameras.main.height - 150);
    
    // Try real texture first, fall back to generated texture
    const realTextureKey = `${catData.catId}_idle`;
    const fallbackTextureKey = `fallback_${catData.catId}`;
    let cat: CatSprite;
    
    if (this.textures.exists(realTextureKey)) {
      cat = this.add.sprite(x, y, realTextureKey) as CatSprite;
      cat.setScale(0.3); // Scale down real assets to appropriate size
      console.log(`Using real texture for ${catData.catId}`);
      
      // Start the idle animation for real textures
      cat.play(`${catData.catId}_idle`);
    } else {
      cat = this.add.sprite(x, y, fallbackTextureKey) as CatSprite;
      cat.setScale(0.8); // Larger scale for fallback graphics
      console.log(`Using fallback texture for ${catData.catId} - real texture ${realTextureKey} not found`);
    }
    
    cat.catData = catData;
    cat.setInteractive();
    cat.setDepth(20); // Ensure cats appear above background
    
    // Create simple bed and bowls using graphics if assets don't load
    this.createCatAccessories(x, y, catData.catId);
    
    // Add name tag with better styling
    const nameText = this.add.text(x, y - 80, `${catData.catId.toUpperCase()}\nLevel ${catData.level}`, {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 6 },
      fontStyle: 'bold'
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(25);
    
    // Click handler for popup
    cat.on('pointerdown', () => {
      console.log('Cat clicked:', catData);
      if (this.callbacks.onCatClick) {
        this.callbacks.onCatClick(catData);
      }
    });

    // Hover effects
    cat.on('pointerover', () => {
      cat.setTint(0xdddddd);
      this.input.setDefaultCursor('pointer');
    });
    
    cat.on('pointerout', () => {
      cat.clearTint();
      this.input.setDefaultCursor('default');
    });

    this.cats.push(cat);
    console.log('Cat created successfully, total cats:', this.cats.length);
  }

  private updateCat(cat: CatSprite, catData: any) {
    cat.catData = catData;
    // Update cat appearance based on level, etc.
  }

  private createCatAccessories(x: number, y: number, catId: string) {
    // Create bed - use real texture if available, otherwise graphics
    if (this.textures.exists('cat_bed')) {
      const bed = this.add.image(x - 30, y + 40, 'cat_bed');
      bed.setScale(0.3);
      bed.setDepth(5);
    } else {
      const bedGraphics = this.add.graphics();
      bedGraphics.fillStyle(0x4169E1);
      bedGraphics.fillRoundedRect(x - 40, y + 30, 25, 15, 3);
      bedGraphics.fillStyle(0x87CEEB);
      bedGraphics.fillRoundedRect(x - 38, y + 32, 21, 8, 2);
      bedGraphics.setDepth(5);
    }
    
    // Create bowls - use real texture if available, otherwise graphics
    if (this.textures.exists('cat_bowls')) {
      const bowls = this.add.image(x + 40, y + 40, 'cat_bowls');
      bowls.setScale(0.3);
      bowls.setDepth(5);
    } else {
      const bowlGraphics = this.add.graphics();
      bowlGraphics.fillStyle(0x808080);
      bowlGraphics.fillCircle(x + 35, y + 35, 8);
      bowlGraphics.fillCircle(x + 50, y + 35, 8);
      bowlGraphics.fillStyle(0x8B4513);
      bowlGraphics.fillCircle(x + 35, y + 35, 6);
      bowlGraphics.fillStyle(0x4169E1);
      bowlGraphics.fillCircle(x + 50, y + 35, 6);
      bowlGraphics.setDepth(5);
    }
    
    // Add random cat toys for variety
    const toys = ['blue_ball', 'orange_ball', 'pink_ball', 'mouse_toy'];
    const randomToy = toys[Math.floor(Math.random() * toys.length)];
    
    if (this.textures.exists(randomToy)) {
      const toy = this.add.image(x + 60, y + 20, randomToy);
      toy.setScale(0.2);
      toy.setDepth(5);
      
      // Add a subtle bounce animation to the toy
      this.tweens.add({
        targets: toy,
        y: toy.y - 5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createUpgradeEffect(cat: CatSprite) {
    // Create upgrade visual effect
    const effect = this.add.particles(cat.x, cat.y, 'coin', {
      scale: { start: 0.3, end: 0 },
      speed: { min: 50, max: 100 },
      lifespan: 1000,
      quantity: 10,
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 30), quantity: 10 }
    });

    setTimeout(() => effect.destroy(), 1500);
  }

  private showNoCatsMessage() {
    // Remove existing message if any
    if (this.noCatsMessage) {
      this.noCatsMessage.destroy();
    }

    // Create message
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    this.noCatsMessage = this.add.text(centerX, centerY, 
      '🐱 No cats in your farm yet!\n\nGo to the Cat Shop tab to buy your first cat!', 
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 20, y: 20 }
      }
    );
    this.noCatsMessage.setOrigin(0.5);
    this.noCatsMessage.setDepth(100);
  }
}
