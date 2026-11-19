import type { GridConfig, GridShape, GridSize } from "../types";
import { IconAlertTriangle, IconArrowRight } from "./Icons";

const COST_PER_POINT = 0.0006;

function countPoints(size: GridSize, shape: GridShape): number {
  if (shape === "square") return size * size;
  // Approximate circle count using same logic as backend grid.ts
  const half = Math.floor(size / 2);
  let count = 0;
  for (let row = -half; row <= half; row++) {
    for (let col = -half; col <= half; col++) {
      if (Math.sqrt(row * row + col * col) <= half * 1.02) count++;
    }
  }
  return count;
}

interface Props {
  config: GridConfig;
  onChange: (c: GridConfig) => void;
  onRun: () => void;
  isRunning: boolean;
  validationErrors: string[];
}

export function GridConfigCard({ config, onChange, onRun, isRunning, validationErrors }: Props) {
  const { gridSize, shape, spacingValue, unit } = config;

  const spacingKm = unit === "mi" ? spacingValue * 1.60934 : spacingValue;
  const pointCount = countPoints(gridSize, shape);
  const cacheNote = "Cached points are free — cost shown assumes all points are fresh.";

  function setField<K extends keyof GridConfig>(key: K, value: GridConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>
          <span className="step-badge">3</span>
          Grid Configuration
        </h2>
      </div>
      <div className="card-body">
        <div className="grid-config-row">
          <div className="field-group">
            <label className="field-label" htmlFor="grid-size">Grid Size</label>
            <select
              id="grid-size"
              className="select-input"
              value={gridSize}
              onChange={(e) => setField("gridSize", parseInt(e.target.value) as GridSize)}
            >
              <option value={3}>3 × 3 (9 pts)</option>
              <option value={5}>5 × 5 (25 pts)</option>
              <option value={7}>7 × 7 (49 pts)</option>
              <option value={9}>9 × 9 (81 pts)</option>
              <option value={11}>11 × 11 (121 pts)</option>
              <option value={13}>13 × 13 (169 pts)</option>
              <option value={15}>15 × 15 (225 pts)</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="grid-shape">Shape</label>
            <select
              id="grid-shape"
              className="select-input"
              value={shape}
              onChange={(e) => setField("shape", e.target.value as GridShape)}
            >
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Point Spacing</label>
            <div className="spacing-input-row">
              <input
                className="text-input"
                type="number"
                min="0.1"
                max={unit === "mi" ? "31" : "50"}
                step="0.1"
                value={spacingValue}
                onChange={(e) => setField("spacingValue", parseFloat(e.target.value) || 1)}
              />
              <div className="unit-toggle">
                <button
                  className={unit === "km" ? "active" : ""}
                  onClick={() => setField("unit", "km")}
                >
                  km
                </button>
                <button
                  className={unit === "mi" ? "active" : ""}
                  onClick={() => setField("unit", "mi")}
                >
                  mi
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cost-estimate">
          <div>
            <div className="label">Estimated API cost</div>
            <div className="sub" title={cacheNote}>
              {pointCount} points × $0.0006 (cache may reduce this)
            </div>
          </div>
          <div className="value">
            ${(pointCount * COST_PER_POINT).toFixed(4)} USD
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            {validationErrors.map((e) => (
              <div key={e} className="validation-error" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn-run"
          onClick={onRun}
          disabled={isRunning || validationErrors.length > 0}
        >
          {isRunning ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span className="spinner spinner-sm" />
              <span>Running scan…</span>
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span>Run the Scan</span>
              <IconArrowRight size={15} />
              <span>{pointCount} grid points</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
