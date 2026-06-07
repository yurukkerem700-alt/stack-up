import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private tapText!: Phaser.GameObjects.Text;
  private blocks: Phaser.GameObjects.Rectangle[] = [];
  private blockIndex = 0;
  private logoY = 0;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Animated background blocks (decorative tower)
    this.createDecorativeTower();

    // Dark overlay for readability
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

    // Title
    this.logoY = height * 0.28;
    this.titleText = this.add.text(width / 2, this.logoY, 'STACK\nUP!', {
      fontFamily: 'Bangers',
      fontSize: `${Math.min(width * 0.18, 120)}px`,
      color: '#ffffff',
      align: 'center',
      stroke: '#1a1a2e',
      strokeThickness: 8,
      letterSpacing: 6,
      lineSpacing: -10,
    }).setOrigin(0.5);

    // Glow effect behind title
    const glow = this.add.ellipse(width / 2, this.logoY, width * 0.7, 180, 0xff6b35, 0.15);
    glow.setDepth(-1);

    // Subtitle
    this.subtitleText = this.add.text(width / 2, this.logoY + 100, 'How high can you go?', {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.04, 22)}px`,
      color: '#ffd166',
      align: 'center',
    }).setOrigin(0.5);

    // High score
    const highScore = localStorage.getItem('stackup_highscore') || '0';
    this.highScoreText = this.add.text(width / 2, height * 0.55, `🏆 BEST: ${highScore}`, {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.05, 28)}px`,
      color: '#06d6a0',
      align: 'center',
    }).setOrigin(0.5);

    // Tap to start
    this.tapText = this.add.text(width / 2, height * 0.72, 'TAP TO START', {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.055, 30)}px`,
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    // Pulsing tap text
    this.tweens.add({
      targets: this.tapText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title float animation
    this.tweens.add({
      targets: this.titleText,
      y: this.logoY - 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Animate decorative blocks
    this.blocks.forEach((block, i) => {
      this.tweens.add({
        targets: block,
        alpha: 0.6 + (i % 3) * 0.15,
        duration: 1200 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 80,
      });
    });

    // Input
    this.input.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Keyboard
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }

  private createDecorativeTower() {
    const { width, height } = this.scale;
    const blockH = 28;
    const baseWidth = width * 0.5;
    const towerX = width / 2;
    const startY = height * 0.85;
    const numBlocks = 14;

    for (let i = 0; i < numBlocks; i++) {
      const w = baseWidth - i * 8;
      const color = this.getBlockColor(i);
      const block = this.add.rectangle(
        towerX + (Math.random() - 0.5) * 10,
        startY - i * blockH,
        w, blockH, color, 0.5
      );
      block.setStrokeStyle(1, 0xffffff, 0.15);
      this.blocks.push(block);
    }
  }

  private getBlockColor(index: number): number {
    const colors = [
      0xff6b35, 0xff8c42, 0xffd166, 0x06d6a0,
      0x118ab2, 0x073b4c, 0xef476f, 0x8338ec,
      0xff006e, 0xfb5607, 0xffbe0b, 0x3a86ff,
      0x8ac926, 0xff595e,
    ];
    return colors[index % colors.length];
  }
}
