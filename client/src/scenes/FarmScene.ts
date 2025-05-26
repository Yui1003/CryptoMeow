
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

    // Load cat sprites as spritesheets with more appropriate frame dimensions
    // Most cat sprites appear to be around 32x32 or 48x48 pixels per frame
    
    // House Cat = Classical
    this.load.spritesheet('basic_idle_sheet', '/assets/AllCats/Classical/IdleCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    this.load.spritesheet('basic_jump_sheet', '/assets/AllCats/Classical/JumpCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    
    // Farm Cat = TigerCatFree  
    this.load.spritesheet('farm_idle_sheet', '/assets/AllCats/TigerCatFree/IdleCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    this.load.spritesheet('farm_jump_sheet', '/assets/AllCats/TigerCatFree/JumpCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    
    // Business Cat = BlackCat
    this.load.spritesheet('business_idle_sheet', '/assets/AllCats/BlackCat/IdleCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    this.load.spritesheet('business_jump_sheet', '/assets/AllCats/BlackCat/JumpCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    
    // Ninja Cat = BatmanCatFree
    this.load.spritesheet('ninja_idle_sheet', '/assets/AllCats/BatmanCatFree/IdleCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    this.load.spritesheet('ninja_jump_sheet', '/assets/AllCats/BatmanCatFree/JumpCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    
    // Cyber Cat = ThreeColorFree
    this.load.spritesheet('cyber_idle_sheet', '/assets/AllCats/ThreeColorFree/IdleCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    this.load.spritesheet('cyber_jump_sheet', '/assets/AllCats/ThreeColorFree/JumpCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    
    // Golden Cat = EgyptCatFree (note: this folder has JumpCab.png instead of JumpCat.png)
    this.load.spritesheet('golden_idle_sheet', '/assets/AllCats/EgyptCatFree/IdleCat.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    this.load.spritesheet('golden_jump_sheet', '/assets/AllCats/EgyptCatFree/JumpCab.png', { 
      frameWidth: 32, frameHeight: 32 
    });
    
    // Load cat materials with error handling
    this.load.image('cat_bed', '/assets/CatMaterials/CatBedBlue.png');
    this.load.image('cat_bowls', '/assets/CatMaterials/CatBowls.png');
    this.load.image('blue_ball', '/assets/CatMaterials/BlueBall-Sheet.png');
    this.load.image('orange_ball', '/assets/CatMaterials/OrangeBall-Sheet.png');
    this.load.image('pink_ball', '/assets/CatMaterials/PinkBall-Sheet.png');
    this.load.image('mouse_toy', '/assets/CatMaterials/Mouse-Sheet.png');
    
    // Create fallback textures for cat materials in case assets don't load
    this.load.on('filecomplete', (key: string) => {
      console.log(`Asset loaded successfully: ${key}`);
    });
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
      const idleSheetKey = `${type}_idle_sheet`;
      const jumpSheetKey = `${type}_jump_sheet`;
      
      // Only create animation if both spritesheets exist
      if (this.textures.exists(idleSheetKey) && this.textures.exists(jumpSheetKey)) {
        try {
          // Get the texture to determine frame count
          const idleTexture = this.textures.get(idleSheetKey);
          const jumpTexture = this.textures.get(jumpSheetKey);
          
          // Calculate frame counts (using 32px frame width now)
          const idleFrameCount = Math.floor(idleTexture.source[0].width / 32);
          const jumpFrameCount = Math.floor(jumpTexture.source[0].width / 32);
          
          console.log(`Creating animations for ${type}: idle frames=${idleFrameCount}, jump frames=${jumpFrameCount}`);
          
          // Ensure we have at least 1 frame
          const safeIdleFrames = Math.max(1, idleFrameCount);
          const safeJumpFrames = Math.max(1, jumpFrameCount);
          
          // Create idle animation using all frames from idle spritesheet
          this.anims.create({
            key: `${type}_idle`,
            frames: this.anims.generateFrameNumbers(idleSheetKey, { 
              start: 0, 
              end: safeIdleFrames - 1
            }),
            frameRate: 8,
            repeat: -1
          });
          
          // Create jump animation using all frames from jump spritesheet
          this.anims.create({
            key: `${type}_jump`,
            frames: this.anims.generateFrameNumbers(jumpSheetKey, { 
              start: 0, 
              end: safeJumpFrames - 1
            }),
            frameRate: 12,
            repeat: -1
          });
          
          // Create working animation that alternates between idle and jump
          const workingFrames = [];
          // Add some idle frames
          for (let i = 0; i < Math.min(3, safeIdleFrames); i++) {
            workingFrames.push({ key: idleSheetKey, frame: i, duration: 150 });
          }
          // Add jump frames
          for (let i = 0; i < safeJumpFrames; i++) {
            workingFrames.push({ key: jumpSheetKey, frame: i, duration: 100 });
          }
          // Add more idle frames
          for (let i = 0; i < Math.min(2, safeIdleFrames); i++) {
            workingFrames.push({ key: idleSheetKey, frame: i, duration: 200 });
          }
          
          this.anims.create({
            key: `${type}_working`,
            frames: workingFrames,
            repeat: -1
          });
          
          
          
          console.log(`Successfully created animations for ${type}`);
        } catch (error) {
          console.warn(`Failed to create animations for ${type}:`, error);
        }
      } else {
        console.log(`Skipping animations for ${type} - textures not found`);
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
    
    // Create fallback textures for cat materials
    this.createFallbackMaterialTextures();
  }

  private createFallbackMaterialTextures() {
    console.log('Creating fallback material textures');
    
    // Create fallback cat bed
    if (!this.textures.exists('cat_bed')) {
      const bedCanvas = this.add.renderTexture(0, 0, 80, 50);
      const bedGraphics = this.add.graphics();
      bedGraphics.fillStyle(0x4169E1);
      bedGraphics.fillRoundedRect(0, 0, 80, 50, 10);
      bedGraphics.fillStyle(0x87CEEB);
      bedGraphics.fillRoundedRect(10, 10, 60, 30, 8);
      bedCanvas.draw(bedGraphics);
      bedGraphics.destroy();
      this.textures.addRenderTexture('cat_bed', bedCanvas);
      console.log('Created fallback cat bed texture');
    }
    
    // Create fallback cat bowls
    if (!this.textures.exists('cat_bowls')) {
      const bowlCanvas = this.add.renderTexture(0, 0, 80, 40);
      const bowlGraphics = this.add.graphics();
      // Food bowl
      bowlGraphics.fillStyle(0x808080);
      bowlGraphics.fillCircle(20, 20, 15);
      bowlGraphics.fillStyle(0x8B4513);
      bowlGraphics.fillCircle(20, 20, 12);
      // Water bowl
      bowlGraphics.fillStyle(0x808080);
      bowlGraphics.fillCircle(60, 20, 15);
      bowlGraphics.fillStyle(0x4169E1);
      bowlGraphics.fillCircle(60, 20, 12);
      bowlCanvas.draw(bowlGraphics);
      bowlGraphics.destroy();
      this.textures.addRenderTexture('cat_bowls', bowlCanvas);
      console.log('Created fallback cat bowls texture');
    }
    
    // Create fallback toy textures
    const toys = [
      { key: 'blue_ball', color: 0x0000FF },
      { key: 'orange_ball', color: 0xFF8C00 },
      { key: 'pink_ball', color: 0xFF69B4 }
    ];
    
    toys.forEach(toy => {
      if (!this.textures.exists(toy.key)) {
        const toyCanvas = this.add.renderTexture(0, 0, 30, 30);
        const toyGraphics = this.add.graphics();
        toyGraphics.fillStyle(toy.color);
        toyGraphics.fillCircle(15, 15, 12);
        toyGraphics.fillStyle(0xFFFFFF);
        toyGraphics.fillCircle(12, 12, 4);
        toyCanvas.draw(toyGraphics);
        toyGraphics.destroy();
        this.textures.addRenderTexture(toy.key, toyCanvas);
        console.log(`Created fallback texture for ${toy.key}`);
      }
    });
    
    // Create fallback mouse toy
    if (!this.textures.exists('mouse_toy')) {
      const mouseCanvas = this.add.renderTexture(0, 0, 40, 20);
      const mouseGraphics = this.add.graphics();
      mouseGraphics.fillStyle(0x808080);
      mouseGraphics.fillEllipse(20, 10, 25, 12);
      mouseGraphics.fillCircle(30, 10, 6);
      mouseGraphics.fillCircle(35, 7, 2);
      mouseGraphics.fillCircle(35, 13, 2);
      mouseCanvas.draw(mouseGraphics);
      mouseGraphics.destroy();
      this.textures.addRenderTexture('mouse_toy', mouseCanvas);
      console.log('Created fallback mouse toy texture');
    }
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
    const catCanvas = this.add.renderTexture(0, 0, 160, 160);
    const catGraphics = this.add.graphics();
    
    // Cat body (oval)
    catGraphics.fillStyle(color);
    catGraphics.fillEllipse(80, 95, 90, 60);
    
    // Cat head (circle)
    catGraphics.fillEllipse(80, 50, 65, 55);
    
    // Cat ears (triangles)
    catGraphics.fillTriangle(45, 30, 60, 10, 65, 30);
    catGraphics.fillTriangle(95, 30, 100, 10, 115, 30);
    
    // Ear insides
    catGraphics.fillStyle(0xFF69B4);
    catGraphics.fillTriangle(52, 27, 57, 18, 62, 27);
    catGraphics.fillTriangle(98, 27, 103, 18, 108, 27);
    
    // Cat eyes (circles)
    catGraphics.fillStyle(0x00FF00);
    catGraphics.fillCircle(65, 45, 7);
    catGraphics.fillCircle(95, 45, 7);
    
    // Eye pupils
    catGraphics.fillStyle(0x000000);
    catGraphics.fillCircle(65, 45, 3);
    catGraphics.fillCircle(95, 45, 3);
    
    // Cat nose (triangle)
    catGraphics.fillStyle(0xFF69B4);
    catGraphics.fillTriangle(75, 55, 85, 55, 80, 62);
    
    // Cat mouth
    catGraphics.lineStyle(3, 0x000000);
    catGraphics.beginPath();
    catGraphics.moveTo(80, 62);
    catGraphics.lineTo(72, 72);
    catGraphics.moveTo(80, 62);
    catGraphics.lineTo(88, 72);
    catGraphics.strokePath();
    
    // Cat whiskers
    catGraphics.lineStyle(2, 0x000000);
    catGraphics.beginPath();
    catGraphics.moveTo(35, 50);
    catGraphics.lineTo(58, 53);
    catGraphics.moveTo(102, 53);
    catGraphics.lineTo(125, 50);
    catGraphics.moveTo(35, 62);
    catGraphics.lineTo(58, 62);
    catGraphics.moveTo(102, 62);
    catGraphics.lineTo(125, 62);
    catGraphics.strokePath();
    
    // Cat tail
    catGraphics.fillStyle(color);
    catGraphics.fillEllipse(135, 100, 35, 16);
    
    // Paws
    catGraphics.fillCircle(60, 125, 12);
    catGraphics.fillCircle(100, 125, 12);
    
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
    
    // Switch to jump animation for working
    const jumpAnimKey = `${cat.catData.catId}_jump`;
    if (this.anims.exists(jumpAnimKey)) {
      cat.play(jumpAnimKey);
      console.log(`Cat ${cat.catData.catId} started working with jump animation`);
    }
    
    // Calculate grass area bounds and keep cats within grass
    const grassStartY = this.cameras.main.height * 0.3;
    const workX = Phaser.Math.Between(150, this.cameras.main.width - 150);
    const workY = Phaser.Math.Between(grassStartY + 50, this.cameras.main.height - 150);
    
    const nameText = (cat as any).nameText;
    
    this.tweens.add({
      targets: cat,
      x: workX,
      y: workY,
      duration: 2000,
      ease: 'Power2',
      onUpdate: () => {
        // Update name tag position to follow cat
        if (nameText) {
          nameText.setPosition(cat.x, cat.y - 120);
        }
      },
      onComplete: () => {
        this.createCoinAnimation(cat);
        setTimeout(() => {
          cat.isWorking = false;
          // Switch back to idle animation
          const idleAnimKey = `${cat.catData.catId}_idle`;
          if (this.anims.exists(idleAnimKey)) {
            cat.play(idleAnimKey);
            console.log(`Cat ${cat.catData.catId} returned to idle animation`);
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
      this.cats.forEach(cat => {
        // Destroy name text first
        const nameText = (cat as any).nameText;
        if (nameText) {
          nameText.destroy();
        }
        cat.destroy();
      });
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
      if (cat) {
        // Destroy name text first
        const nameText = (cat as any).nameText;
        if (nameText) {
          nameText.destroy();
        }
        cat.destroy();
      }
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
    
    // Calculate grass area bounds (grass starts from 30% down)
    const grassStartY = this.cameras.main.height * 0.3;
    const x = Phaser.Math.Between(200, this.cameras.main.width - 200);
    const y = Phaser.Math.Between(grassStartY + 50, this.cameras.main.height - 150);
    
    // Try spritesheet texture first, fall back to generated texture
    const spritesheetKey = `${catData.catId}_idle_sheet`;
    const fallbackTextureKey = `fallback_${catData.catId}`;
    let cat: CatSprite;
    
    if (this.textures.exists(spritesheetKey)) {
      cat = this.add.sprite(x, y, spritesheetKey) as CatSprite;
      cat.setScale(6.0); // Much bigger scale for spritesheet assets to match screenshot
      console.log(`Using spritesheet texture for ${catData.catId}`);
      
      // Start the idle animation for real textures
      const idleAnimKey = `${catData.catId}_idle`;
      if (this.anims.exists(idleAnimKey)) {
        cat.play(idleAnimKey);
        console.log(`Playing idle animation: ${idleAnimKey}`);
      }
    } else {
      cat = this.add.sprite(x, y, fallbackTextureKey) as CatSprite;
      cat.setScale(2.5); // Bigger scale for fallback graphics to match screenshot
      console.log(`Using fallback texture for ${catData.catId} - spritesheet ${spritesheetKey} not found`);
    }
    
    // Ensure cat is visible immediately
    cat.setVisible(true);
    cat.setAlpha(1);
    
    cat.catData = catData;
    cat.setInteractive();
    cat.setDepth(20); // Ensure cats appear above background
    
    // Create simple bed and bowls using graphics if assets don't load
    this.createCatAccessories(x, y, catData.catId);
    
    // Add name tag with better styling and attach it to the cat
    const displayName = catData.catId.toUpperCase();
    const nameText = this.add.text(x, y - 120, `${displayName}\nLevel ${catData.level}`, {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#000000cc',
      padding: { x: 12, y: 8 },
      fontStyle: 'bold'
    });
    nameText.setOrigin(0.5);
    nameText.setDepth(25);
    
    // Store reference to name tag on cat for movement updates
    (cat as any).nameText = nameText;
    
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
    
    // Update the name tag with new level information
    const nameText = (cat as any).nameText;
    if (nameText) {
      const displayName = catData.catId.toUpperCase();
      nameText.setText(`${displayName}\nLevel ${catData.level}`);
    }
  }

  private createCatAccessories(x: number, y: number, catId: string) {
    console.log(`Creating accessories for cat at ${x}, ${y}`);
    
    // Create bed - use real texture if available, otherwise fallback graphics
    if (this.textures.exists('cat_bed')) {
      const bed = this.add.image(x - 80, y + 85, 'cat_bed');
      bed.setScale(1.0);
      bed.setDepth(6);
      bed.setVisible(true);
      console.log('Added real cat bed texture');
    } else {
      const bedGraphics = this.add.graphics();
      bedGraphics.fillStyle(0x4169E1);
      bedGraphics.fillRoundedRect(x - 120, y + 60, 80, 50, 10);
      bedGraphics.fillStyle(0x87CEEB);
      bedGraphics.fillRoundedRect(x - 110, y + 70, 60, 30, 8);
      bedGraphics.fillStyle(0xFFFFFF);
      bedGraphics.fillCircle(x - 80, y + 75, 15);
      bedGraphics.setDepth(5);
      bedGraphics.setVisible(true);
      console.log('Added fallback cat bed graphics');
    }
    
    // Create bowls - use real texture if available, otherwise fallback graphics
    if (this.textures.exists('cat_bowls')) {
      const bowls = this.add.image(x + 80, y + 85, 'cat_bowls');
      bowls.setScale(1.0);
      bowls.setDepth(6);
      bowls.setVisible(true);
      console.log('Added real cat bowls texture');
    } else {
      const bowlGraphics = this.add.graphics();
      bowlGraphics.fillStyle(0x808080);
      bowlGraphics.fillCircle(x + 60, y + 85, 20);
      bowlGraphics.fillStyle(0x8B4513);
      bowlGraphics.fillCircle(x + 60, y + 85, 16);
      bowlGraphics.fillStyle(0x808080);
      bowlGraphics.fillCircle(x + 100, y + 85, 20);
      bowlGraphics.fillStyle(0x4169E1);
      bowlGraphics.fillCircle(x + 100, y + 85, 16);
      bowlGraphics.setDepth(5);
      bowlGraphics.setVisible(true);
      console.log('Added fallback cat bowls graphics');
    }
    
    // Create toy
    const toys = ['blue_ball', 'orange_ball', 'pink_ball', 'mouse_toy'];
    const randomToy = toys[Math.floor(Math.random() * toys.length)];
    
    if (this.textures.exists(randomToy)) {
      const toy = this.add.image(x + 120, y + 40, randomToy);
      toy.setScale(0.8);
      toy.setDepth(6);
      toy.setVisible(true);
      console.log(`Added real toy texture: ${randomToy}`);
      
      this.tweens.add({
        targets: toy,
        y: toy.y - 15,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      // Create fallback toy graphics
      const toyColors = {
        'blue_ball': 0x0000FF,
        'orange_ball': 0xFF8C00,
        'pink_ball': 0xFF69B4,
        'mouse_toy': 0x808080
      };
      
      const color = toyColors[randomToy as keyof typeof toyColors] || 0xFF69B4;
      const toyGraphics = this.add.graphics();
      
      if (randomToy === 'mouse_toy') {
        toyGraphics.fillStyle(color);
        toyGraphics.fillEllipse(x + 120, y + 40, 25, 15);
        toyGraphics.fillCircle(x + 135, y + 40, 8);
        toyGraphics.fillCircle(x + 145, y + 35, 3);
        toyGraphics.fillCircle(x + 145, y + 45, 3);
        toyGraphics.lineStyle(3, color);
        toyGraphics.beginPath();
        toyGraphics.moveTo(x + 105, y + 40);
        toyGraphics.lineTo(x + 90, y + 30);
        toyGraphics.lineTo(x + 85, y + 45);
        toyGraphics.strokePath();
      } else {
        toyGraphics.fillStyle(color);
        toyGraphics.fillCircle(x + 120, y + 40, 15);
        toyGraphics.fillStyle(0xFFFFFF);
        toyGraphics.fillCircle(x + 115, y + 35, 5);
      }
      toyGraphics.setDepth(5);
      toyGraphics.setVisible(true);
      console.log(`Added fallback toy graphics: ${randomToy}`);
      
      this.tweens.add({
        targets: toyGraphics,
        y: toyGraphics.y - 15,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    
    console.log(`Created accessories for ${catId} cat`);
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
