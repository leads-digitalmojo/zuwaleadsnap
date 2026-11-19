import { useState, useEffect } from "react";
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

  const [spacingText, setSpacingText] = useState(String(spacingValue));

  useEffect(() => {
    // Keep local text in sync when config.spacingValue changes externally
    if (parseFloat(spacingText) !== spacingValue) {
      setSpacingText(String(spacingValue));
    }
  }, [spacingValue]);

  function handleSpacingChange(val: string) {
    // Allow digits and a single optional decimal point, or blank while typing
    if (/^[0-9]*\.?[0-9]*$/.test(val)) {
      setSpacingText(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        onChange({ ...config, spacingValue: parsed });
      }
    }
  }

  function handleSpacingBlur() {
    const parsed = parseFloat(spacingText);
    if (isNaN(parsed) || parsed <= 0) {
      const fallback = spacingValue > 0 ? spacingValue : 1;
      setSpacingText(String(fallback));
      onChange({ ...config, spacingValue: fallback });
    } else {
      setSpacingText(String(parsed));
    }
  }

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
            <label className="field-label" htmlFor="point-spacing">Point Spacing</label>
            <div className="spacing-input-row">
              <input
                id="point-spacing"
                className="text-input"
                type="text"
                inputMode="decimal"
                placeholder="1"
                value={spacingText}
                onChange={(e) => handleSpacingChange(e.target.value)}
                onBlur={handleSpacingBlur}
              />
              <div className="unit-toggle">
                <button
                  type="button"
                  className={unit === "km" ? "active" : ""}
                  onClick={() => setField("unit", "km")}
                >
                  km
                </button>
                <button
                  type="button"
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
