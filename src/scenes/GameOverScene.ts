import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private score: number = 0;
  private highScore: number = 0;
  private combo: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number; combo: number }) {
    this.score = data.score || 0;
    this.combo = data.combo || 0;
    this.highScore = parseInt(localStorage.getItem('stackup_highscore') || '0', 10);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('stackup_highscore', String(this.highScore));
    }
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Game Over text
    const goText = this.add.text(width / 2, height * 0.22, 'GAME OVER', {
      fontFamily: 'Bangers',
      fontSize: `${Math.min(width * 0.14, 80)}px`,
      color: '#ef476f',
      stroke: '#1a1a2e',
      strokeThickness: 6,
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Score display
    this.add.text(width / 2, height * 0.38, `${this.score}`, {
      fontFamily: 'Bangers',
      fontSize: `${Math.min(width * 0.22, 130)}px`,
      color: '#ffd166',
      stroke: '#1a1a2e',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.50, 'FLOORS', {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.045, 24)}px`,
      color: '#ffd166',
      letterSpacing: 8,
    }).setOrigin(0.5);

    // High score
    const isNewRecord = this.score >= this.highScore && this.score > 0;
    const hsLabel = isNewRecord ? '🎉 NEW RECORD!' : '🏆 BEST';
    const hsColor = isNewRecord ? '#06d6a0' : '#8ac926';

    this.add.text(width / 2, height * 0.60, `${hsLabel}  ${this.highScore}`, {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.05, 28)}px`,
      color: hsColor,
    }).setOrigin(0.5);

    // Max combo
    if (this.combo > 1) {
      this.add.text(width / 2, height * 0.68, `🔥 MAX COMBO: x${this.combo}`, {
        fontFamily: 'Orbitron',
        fontSize: `${Math.min(width * 0.04, 22)}px`,
        color: '#ff6b35',
      }).setOrigin(0.5);
    }

    // Share button
    const shareBtn = this.add.rectangle(width / 2, height * 0.80, width * 0.6, 52, 0x118ab2, 0.9);
    shareBtn.setStrokeStyle(2, 0xffffff, 0.3);
    const shareLabel = this.add.text(width / 2, height * 0.80, '📤 SHARE SCORE', {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.04, 20)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);

    shareBtn.setInteractive({ useHandCursor: true });
    shareBtn.on('pointerdown', () => {
      this.shareScore();
    });

    // Restart button
    const restartBtn = this.add.rectangle(width / 2, height * 0.89, width * 0.6, 52, 0xff6b35, 0.9);
    restartBtn.setStrokeStyle(2, 0xffffff, 0.3);
    const restartLabel = this.add.text(width / 2, height * 0.89, '🔄 PLAY AGAIN', {
      fontFamily: 'Orbitron',
      fontSize: `${Math.min(width * 0.04, 20)}px`,
      color: '#ffffff',
    }).setOrigin(0.5);

    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Keyboard restart
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });

    // Animate game over text
    this.tweens.add({
      targets: goText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private shareScore() {
    const text = `🏗️ Stack Up!\nI built ${this.score} floors! 🏆 Best: ${this.highScore}\nCan you beat me? 👉`;
    if (navigator.share) {
      navigator.share({
        title: 'Stack Up!',
        text: text,
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        const { width, height } = this.scale;
        const copied = this.add.text(width / 2, height * 0.74, '✅ Copied to clipboard!', {
          fontFamily: 'Orbitron',
          fontSize: '16px',
          color: '#06d6a0',
        }).setOrigin(0.5);
        this.time.delayedCall(1500, () => copied.destroy());
      }).catch(() => {});
    }
  }
}
