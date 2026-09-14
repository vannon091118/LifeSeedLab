// Owner: RenderLayer (map tiles). LOC ≤ 200.
// P5: Zeichnet die Spieler-Tiles im Papier-Style. Reine Präsentation —
// liest NUR den Tile-Typ, niemals Gameplay-Entscheidungen.

const INK = '#2b2b26';

export function drawMapTile(
  ctx: CanvasRenderingContext2D,
  tile: string,
  gx: number,
  gy: number,
  cell: number,
): void {
  const x = gx * cell;
  const y = gy * cell;
  ctx.save();

  switch (tile) {
    case 'pot': {
      // Blumentopf: Terrakotta-Trapez mit Rand — die Platzier-Fläche für Pflanzen
      const pad = cell * 0.12;
      ctx.fillStyle = '#c96f3b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + pad, y + pad);
      ctx.lineTo(x + cell - pad, y + pad);
      ctx.lineTo(x + cell - pad * 1.8, y + cell - pad);
      ctx.quadraticCurveTo(x + cell / 2, y + cell - pad * 0.4, x + pad * 1.8, y + cell - pad);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a3552b';
      ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell * 0.16);
      ctx.strokeRect(x + pad, y + pad, cell - pad * 2, cell * 0.16);
      break;
    }
    case 'path': {
      // Weg-Platte: sandiger Stein mit Körnung — Gegner bevorzugen diese Zelle
      const pad = cell * 0.06;
      ctx.fillStyle = '#d9c9a3';
      ctx.strokeStyle = 'rgba(43,43,38,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, cell * 0.12);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(43,43,38,0.12)';
      for (let i = 0; i < 5; i++) {
        const px = x + pad + ((i * 37 + gx * 13) % (cell - pad * 2 - 4));
        const py = y + pad + ((i * 53 + gy * 7) % (cell - pad * 2 - 4));
        ctx.fillRect(px, py, 2, 2);
      }
      break;
    }
    case 'boulder': {
      // Findling: grauer Block mit Ink-Kontur — blockiert die Zelle
      ctx.fillStyle = '#9a948a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.18, y + cell * 0.78);
      ctx.lineTo(x + cell * 0.12, y + cell * 0.42);
      ctx.lineTo(x + cell * 0.38, y + cell * 0.18);
      ctx.lineTo(x + cell * 0.68, y + cell * 0.22);
      ctx.lineTo(x + cell * 0.88, y + cell * 0.5);
      ctx.lineTo(x + cell * 0.8, y + cell * 0.78);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(43,43,38,0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.3, y + cell * 0.4);
      ctx.lineTo(x + cell * 0.5, y + cell * 0.6);
      ctx.stroke();
      break;
    }
    case 'decor': {
      // Deko: kleine Blumen-Markierung, begehbar, rein kosmetisch
      ctx.strokeStyle = '#5a8f4e';
      ctx.lineWidth = 1.6;
      const cx = x + cell * 0.5;
      const cy = y + cell * 0.62;
      ctx.beginPath();
      ctx.moveTo(cx, cy + cell * 0.2);
      ctx.quadraticCurveTo(cx + 2, cy, cx, cy - cell * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#c96f8e';
      for (const [dx, dy] of [[-3, -4], [3, -4], [0, -7], [-2, -1], [2, -1]] as const) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f5efdc';
      ctx.beginPath(); ctx.arc(cx, cy - 4, 1.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default:
      break; // unbekannter Typ: nichts zeichnen (Validierung fängt das ab)
  }
  ctx.restore();
}
