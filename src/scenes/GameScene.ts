import Phaser from 'phaser';
import { Howl } from 'howler';

// Color palette - rainbow progression
const BLOCK_COLORS = [
  0xff6b35, 0xff8c42, 0xffd166, 0x06d6a0,
  0x118ab2, 0x073b4c, 0xef476f, 0x8338ec,
  0xff006e, 0xfb5607, 0xffbe0b, 0x3a86ff,
  0x8ac926, 0xff595e, 0x6a4c93, 0x1982c4,
];

const BLOCK_HEIGHT = 28;
const BASE_BLOCK_WIDTH = 250;
const PERFECT_THRESHOLD = 5;
const INITIAL_SPEED = 4.0;
const SPEED_INCREMENT = 0.25;
const MAX_SPEED = 16;

// Active block always appears at this Y (percentage from top)
const ACTIVE_Y_PERCENT = 0.38;

export class GameScene extends Phaser.Scene {
  // Audio
  private dropSound!: Howl;
  private perfectSound!: Howl;
  private gameoverSound!: Howl;
  private comboSound!: Howl;
  private audioInitialized = false;

  // Game objects
  private stackedBlocks: { obj: Phaser.GameObjects.Rectangle; x: number; width: number }[] = [];
  private currentBlock: Phaser.GameObjects.Rectangle | null = null;
  private fallingPieces: Phaser.GameObjects.Rectangle[] = [];
  private particles: { obj: Phaser.GameObjects.Arc; vx: number; vy: number; life: number }[] = [];

  // Game state
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private currentWidth = BASE_BLOCK_WIDTH;
  private moveDirection = 1;
  private moveSpeed = INITIAL_SPEED;
  private isGameOver = false;
  private isDropping = false;
  private activeY = 0; // Fixed Y where the moving block always sits

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private perfectFlash!: Phaser.GameObjects.Text;

  // Background elements
  private stars: Phaser.GameObjects.Arc[] = [];
  private clouds: Phaser.GameObjects.Ellipse[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Reset state
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentWidth = BASE_BLOCK_WIDTH;
    this.moveDirection = 1;
    this.moveSpeed = INITIAL_SPEED;
    this.isGameOver = false;
    this.isDropping = false;
    this.stackedBlocks = [];
    this.fallingPieces = [];
    this.particles = [];

    // Active block Y position (fixed on screen)
    this.activeY = height * ACTIVE_Y_PERCENT;

    // Init audio on first interaction
    if (!this.audioInitialized) {
      this.initAudio();
      this.audioInitialized = true;
    }

    // Background
    this.createBackground();

    // Base platform — positioned below active Y
    const baseY = this.activeY + BLOCK_HEIGHT;
    const base = this.add.rectangle(
      width / 2, baseY,
      BASE_BLOCK_WIDTH, BLOCK_HEIGHT,
      BLOCK_COLORS[0]
    );
    base.setStrokeStyle(1, 0xffffff, 0.25);
    base.setDepth(10);
    this.stackedBlocks.push({ obj: base, x: width / 2, width: BASE_BLOCK_WIDTH });

    // HUD (scrollFactor 0 = stays on screen)
    this.scoreText = this.add.text(width / 2, 40, '0', {
      fontFamily: 'Bangers',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#1a1a2e',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

    this.comboText = this.add.text(width / 2, 85, '', {
      fontFamily: 'Orbitron',
      fontSize: '22px',
      color: '#ffd166',
      stroke: '#1a1a2e',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0);

    this.perfectFlash = this.add.text(width / 2, height * 0.2, '', {
      fontFamily: 'Bangers',
      fontSize: '72px',
      color: '#06d6a0',
      stroke: '#1a1a2e',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(100).setAlpha(0).setScrollFactor(0);

    // Spawn first moving block
    this.spawnBlock();

    // Input
    this.input.on('pointerdown', () => {
      this.dropBlock();
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.dropBlock();
    });
  }

  private initAudio() {
    this.dropSound = new Howl({ src: ['/sfx/drop.wav'], volume: 0.5 });
    this.perfectSound = new Howl({ src: ['/sfx/perfect.ogg'], volume: 0.7 });
    this.gameoverSound = new Howl({ src: ['/sfx/gameover.ogg'], volume: 0.6 });
    this.comboSound = new Howl({ src: ['/sfx/perfect.ogg'], volume: 0.9, rate: 1.3 });
  }

  private createBackground() {
    const { width, height } = this.scale;

    // Sky gradient background (fixed on screen)
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x16213e);
    bg.setDepth(-10).setScrollFactor(0);

    // Stars (fixed on screen)
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 0.5,
        0xffffff,
        Math.random() * 0.5 + 0.2
      );
      star.setDepth(-9).setScrollFactor(0);
      this.stars.push(star);

      this.tweens.add({
        targets: star,
        alpha: Math.random() * 0.3 + 0.1,
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }

    // Clouds (fixed on screen)
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const cloud = this.add.ellipse(
        Math.random() * width,
        100 + Math.random() * height,
        80 + Math.random() * 120,
        30 + Math.random() * 20,
        0xffffff,
        0.08
      );
      cloud.setDepth(-8).setScrollFactor(0);
      this.clouds.push(cloud);

      this.tweens.add({
        targets: cloud,
        x: cloud.x + 30 + Math.random() * 40,
        duration: 8000 + Math.random() * 12000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private getBlockColor(): number {
    return BLOCK_COLORS[this.score % BLOCK_COLORS.length];
  }

  private spawnBlock() {
    if (this.isGameOver) return;

    const { width } = this.scale;
    const startX = this.moveDirection > 0 ? -this.currentWidth : width + this.currentWidth;

    this.currentBlock = this.add.rectangle(
      startX, this.activeY,
      this.currentWidth, BLOCK_HEIGHT,
      this.getBlockColor()
    );
    this.currentBlock.setStrokeStyle(1, 0xffffff, 0.25);
    this.currentBlock.setDepth(10);
    this.isDropping = false;
  }

  private dropBlock() {
    if (!this.currentBlock || this.isDropping || this.isGameOver) return;

    this.isDropping = true;
    const block = this.currentBlock;
    const lastStack = this.stackedBlocks[this.stackedBlocks.length - 1];

    const blockLeft = block.x - block.width / 2;
    const blockRight = block.x + block.width / 2;
    const stackLeft = lastStack.x - lastStack.width / 2;
    const stackRight = lastStack.x + lastStack.width / 2;

    // Calculate overlap
    const overlapLeft = Math.max(blockLeft, stackLeft);
    const overlapRight = Math.min(blockRight, stackRight);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      this.missBlock(block);
      return;
    }

    const isPerfect = Math.abs(overlapWidth - lastStack.width) < PERFECT_THRESHOLD;

    if (isPerfect) {
      this.handlePerfectPlacement(block, lastStack);
    } else {
      this.handleImperfectPlacement(block, overlapLeft, overlapRight, overlapWidth);
    }

    this.dropSound.play();
  }

  private handlePerfectPlacement(
    block: Phaser.GameObjects.Rectangle,
    lastStack: { obj: Phaser.GameObjects.Rectangle; x: number; width: number }
  ) {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score++;

    const snappedX = lastStack.x;
    const snappedWidth = lastStack.width;

    block.x = snappedX;
    block.width = snappedWidth;
    block.setSize(snappedWidth, BLOCK_HEIGHT);
    block.setFillStyle(this.getBlockColor());

    this.stackedBlocks.push({ obj: block, x: snappedX, width: snappedWidth });

    // Visual feedback
    this.showPerfectText();
    this.spawnPerfectParticles(snappedX, this.activeY);
    this.pulseBlock(block);

    if (this.combo >= 3) {
      this.comboSound.play();
    } else {
      this.perfectSound.play();
    }

    // Combo bonus: grow block slightly
    if (this.combo >= 3) {
      const bonusWidth = Math.min(this.combo * 2, 20);
      const newWidth = Math.min(snappedWidth + bonusWidth, BASE_BLOCK_WIDTH);
      block.width = newWidth;
      block.setSize(newWidth, BLOCK_HEIGHT);
      this.stackedBlocks[this.stackedBlocks.length - 1].width = newWidth;
    }

    this.updateComboDisplay();
    this.advanceTower();
  }

  private handleImperfectPlacement(
    block: Phaser.GameObjects.Rectangle,
    overlapLeft: number,
    overlapRight: number,
    overlapWidth: number
  ) {
    this.combo = 0;
    this.score++;

    const blockLeft = block.x - block.width / 2;

    // Determine which side to cut
    const cutLeft = blockLeft < overlapLeft;
    let fallingPieceX: number;
    let fallingPieceWidth: number;

    if (cutLeft) {
      fallingPieceWidth = overlapLeft - blockLeft;
      fallingPieceX = blockLeft + fallingPieceWidth / 2;
    } else {
      fallingPieceWidth = (blockLeft + block.width) - overlapRight;
      fallingPieceX = overlapRight + fallingPieceWidth / 2;
    }

    // Create falling piece
    if (fallingPieceWidth > 1) {
      const fallingPiece = this.add.rectangle(
        fallingPieceX, this.activeY,
        fallingPieceWidth, BLOCK_HEIGHT,
        this.getBlockColor()
      );
      fallingPiece.setDepth(9);
      this.fallingPieces.push(fallingPiece);

      this.tweens.add({
        targets: fallingPiece,
        y: fallingPiece.y + 600,
        alpha: 0,
        rotation: (cutLeft ? -1 : 1) * 0.5,
        duration: 800,
        ease: 'Quad.easeIn',
        onComplete: () => {
          fallingPiece.destroy();
          const idx = this.fallingPieces.indexOf(fallingPiece);
          if (idx > -1) this.fallingPieces.splice(idx, 1);
        },
      });
    }

    // Resize current block to overlap
    const overlapCenter = (overlapLeft + overlapRight) / 2;
    block.x = overlapCenter;
    block.width = overlapWidth;
    block.setSize(overlapWidth, BLOCK_HEIGHT);

    this.currentWidth = overlapWidth;
    this.stackedBlocks.push({ obj: block, x: overlapCenter, width: overlapWidth });

    this.cameras.main.shake(120, 0.005);
    this.updateComboDisplay();

    if (overlapWidth < 8) {
      this.gameOver();
      return;
    }

    this.advanceTower();
  }

  private missBlock(block: Phaser.GameObjects.Rectangle) {
    this.tweens.add({
      targets: block,
      y: block.y + 600,
      alpha: 0,
      rotation: this.moveDirection * 0.8,
      duration: 800,
      ease: 'Quad.easeIn',
    });

    this.currentBlock = null;
    this.gameOver();
  }

  private advanceTower() {
    // Update score
    this.scoreText.setText(String(this.score));

    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Shift ALL stacked blocks down by BLOCK_HEIGHT
    // This keeps the active area at a fixed screen position
    this.shiftTowerDown();

    // Increase speed
    this.moveSpeed = Math.min(this.moveSpeed + SPEED_INCREMENT, MAX_SPEED);

    // Alternate direction
    this.moveDirection *= -1;

    // Spawn next block at the same activeY
    this.time.delayedCall(80, () => {
      this.spawnBlock();
    });
  }

  private shiftTowerDown() {
    const { height } = this.scale;
    const shiftY = BLOCK_HEIGHT;

    // Move all stacked blocks down
    for (const b of this.stackedBlocks) {
      this.tweens.add({
        targets: b.obj,
        y: b.obj.y + shiftY,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }

    // Move falling pieces down too
    for (const fp of this.fallingPieces) {
      fp.y += shiftY;
    }

    // Clean up blocks that went off screen bottom
    this.time.delayedCall(200, () => {
      for (let i = this.stackedBlocks.length - 1; i >= 0; i--) {
        const b = this.stackedBlocks[i];
        if (b.obj.y > height + 100) {
          b.obj.destroy();
          this.stackedBlocks.splice(i, 1);
        }
      }
    });
  }

  private showPerfectText() {
    const { height } = this.scale;
    const messages = this.combo >= 5
      ? ['INSANE!', 'UNSTOPPABLE!', 'GODLIKE!']
      : this.combo >= 3
        ? ['AMAZING!', 'ON FIRE!', 'INCREDIBLE!']
        : ['PERFECT!', 'NICE!', 'GREAT!'];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    this.perfectFlash.setText(msg);
    if (this.combo >= 5) {
      this.perfectFlash.setColor('#ff006e');
    } else if (this.combo >= 3) {
      this.perfectFlash.setColor('#ff6b35');
    } else {
      this.perfectFlash.setColor('#06d6a0');
    }
    this.perfectFlash.setAlpha(1).setScale(0.5).setY(height * 0.2);

    this.tweens.killTweensOf(this.perfectFlash);
    this.tweens.add({
      targets: this.perfectFlash,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      y: this.perfectFlash.y - 60,
      duration: 900,
      ease: 'Cubic.easeOut',
    });
  }

  private updateComboDisplay() {
    if (this.combo >= 2) {
      this.comboText.setText(`🔥 COMBO x${this.combo}`);
      this.comboText.setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }
  }

  private pulseBlock(block: Phaser.GameObjects.Rectangle) {
    this.tweens.add({
      targets: block,
      scaleX: 1.08,
      scaleY: 1.15,
      duration: 80,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private spawnPerfectParticles(x: number, y: number) {
    const count = 12 + this.combo * 4;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 80 + Math.random() * 150;
      const size = 2 + Math.random() * 4;
      const color = [0xffd166, 0x06d6a0, 0xff6b35, 0x8338ec, 0xff006e][Math.floor(Math.random() * 5)];

      const particle = this.add.circle(x, y, size, color);
      particle.setDepth(20);
      this.particles.push({
        obj: particle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        life: 1,
      });
    }
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.gameoverSound.play();
    this.cameras.main.shake(300, 0.01);

    this.stackedBlocks.forEach((b, i) => {
      this.time.delayedCall(i * 20, () => {
        const origColor = b.obj.fillColor;
        b.obj.setFillStyle(0xef476f);
        this.time.delayedCall(200, () => {
          b.obj.setFillStyle(origColor);
        });
      });
    });

    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        combo: this.maxCombo,
      });
    });
  }

  update(_time: number, delta: number) {
    if (this.isGameOver) return;

    const dt = delta / 1000;

    // Move current block horizontally (always at activeY)
    if (this.currentBlock && !this.isDropping) {
      const { width } = this.scale;
      this.currentBlock.x += this.moveDirection * this.moveSpeed * (60 * dt);

      const halfW = this.currentBlock.width / 2;
      if (this.currentBlock.x + halfW > width + 50) {
        this.moveDirection = -1;
      } else if (this.currentBlock.x - halfW < -50) {
        this.moveDirection = 1;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 400 * dt;
      p.obj.x += p.vx * dt;
      p.obj.y += p.vy * dt;
      p.life -= dt * 1.5;
      p.obj.setAlpha(Math.max(0, p.life));
      p.obj.setScale(Math.max(0, p.life));

      if (p.life <= 0) {
        p.obj.destroy();
        this.particles.splice(i, 1);
      }
    }
  }
}
