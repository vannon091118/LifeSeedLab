import type { GameState, Tower, Enemy, Projectile, Position } from './types';
import { GRID_COLS, GRID_ROWS, CELL_SIZE } from './config';

const PATH_COLOR = '#1a1a2e';
const GRID_COLOR = '#16213e';
const TOWER_RANGE_COLOR = 'rgba(100, 200, 255, 0.08)';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private cellSize: number = CELL_SIZE;
  private hoverCell: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    // fit grid into available space with padding
    const padX = 40;
    const padY = 40;
    const availW = w - padX * 2;
    const availH = h - padY * 2;
    const cellW = Math.floor(availW / GRID_COLS);
    const cellH = Math.floor(availH / GRID_ROWS);
    this.cellSize = Math.min(cellW, cellH, CELL_SIZE);

    this.width = GRID_COLS * this.cellSize;
    this.height = GRID_ROWS * this.cellSize;
    this.offsetX = Math.floor((w - this.width) / 2);
    this.offsetY = Math.floor((h - this.height) / 2);

    this.canvas.width = w * devicePixelRatio;
    this.canvas.height = h * devicePixelRatio;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  setHover(x: number, y: number): void {
    const gx = Math.floor((x - this.offsetX) / this.cellSize);
    const gy = Math.floor((y - this.offsetY) / this.cellSize);
    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      this.hoverCell = { x: gx, y: gy };
    } else {
      this.hoverCell = null;
    }
  }

  getGridFromPixel(x: number, y: number): { x: number; y: number } | null {
    const gx = Math.floor((x - this.offsetX) / this.cellSize);
    const gy = Math.floor((y - this.offsetY) / this.cellSize);
    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      return { x: gx, y: gy };
    }
    return null;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;

    // clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    this.drawGrid(ctx);
    this.drawPath(ctx, state.path);

    // tower ranges on hover
    if (this.hoverCell) {
      const tower = state.towers.find(t => t.gridX === this.hoverCell!.x && t.gridY === this.hoverCell!.y);
      if (tower) {
        this.drawRange(ctx, tower.pos, tower.variant.stats.range);
      }
    }

    // hover cell highlight
    if (this.hoverCell) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.hoverCell.x * this.cellSize,
        this.hoverCell.y * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }

    this.drawTowers(ctx, state.towers);
    this.drawEnemies(ctx, state.enemies);
    this.drawProjectiles(ctx, state.projectiles);

    ctx.restore();

    // HUD
    this.drawHUD(ctx, state);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(this.width, y * this.cellSize);
      ctx.stroke();
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D, path: Position[]): void {
    if (path.length < 2) return;

    ctx.fillStyle = PATH_COLOR;
    const cs = this.cellSize;

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const ax = a.x * cs;
      const ay = a.y * cs;
      const bx = b.x * cs;
      const by = b.y * cs;

      const angle = Math.atan2(by - ay, bx - ax);
      const perpX = Math.sin(angle) * cs * 0.4;
      const perpY = -Math.cos(angle) * cs * 0.4;

      ctx.beginPath();
      ctx.moveTo(ax - perpX, ay - perpY);
      ctx.lineTo(ax + perpX, ay + perpY);
      ctx.lineTo(bx + perpX, by + perpY);
      ctx.lineTo(bx - perpX, by - perpY);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawRange(ctx: CanvasRenderingContext2D, pos: Position, range: number): void {
    ctx.fillStyle = TOWER_RANGE_COLOR;
    ctx.beginPath();
    ctx.arc(pos.x * this.cellSize, pos.y * this.cellSize, range * this.cellSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawTowers(ctx: CanvasRenderingContext2D, towers: Tower[]): void {
    const cs = this.cellSize;
    const pad = cs * 0.15;

    for (const t of towers) {
      const x = t.pos.x * cs;
      const y = t.pos.y * cs;
      const s = cs - pad * 2;

      // tower body
      ctx.fillStyle = t.variant.color;
      ctx.shadowColor = t.variant.color;
      ctx.shadowBlur = 8;

      if (t.variant.type === 'wall') {
        // square for wall
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else if (t.variant.type === 'support') {
        // diamond for support
        ctx.beginPath();
        ctx.moveTo(x, y - s / 2);
        ctx.lineTo(x + s / 2, y);
        ctx.lineTo(x, y + s / 2);
        ctx.lineTo(x - s / 2, y);
        ctx.closePath();
        ctx.fill();
      } else {
        // circle for shooter
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // HP bar
      const hpRatio = t.hp / t.variant.stats.hp;
      if (hpRatio < 1) {
        const barW = cs * 0.7;
        const barH = 4;
        const barX = x - barW / 2;
        const barY = y - s / 2 - 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#f87171';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      }
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]): void {
    const cs = this.cellSize;

    for (const e of enemies) {
      const x = e.pos.x * cs;
      const y = e.pos.y * cs;
      const r = e.type === 'tank' ? cs * 0.3 : e.type === 'swarm' ? cs * 0.15 : cs * 0.2;

      // glow
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 6;

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // HP bar
      const hpRatio = e.hp / e.maxHp;
      const barW = r * 2.5;
      const barH = 3;
      const barX = x - barW / 2;
      const barY = y - r - 6;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
    const cs = this.cellSize;

    for (const p of projectiles) {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.arc(p.pos.x * cs, p.pos.y * cs, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
    const w = this.canvas.width / devicePixelRatio;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, 32);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`💰 ${state.money}`, 12, 22);

    ctx.fillStyle = '#f87171';
    ctx.fillText(`❤️ ${state.lives}`, 120, 22);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`🌊 Wave ${state.wave}/${state.waveConfigs.length}`, 230, 22);

    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`⏱ Tick ${state.tick}`, 420, 22);

    if (state.phase === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, w, this.canvas.height / devicePixelRatio);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', w / 2, this.canvas.height / devicePixelRatio / 2);
      ctx.textAlign = 'start';
    }
  }
}
