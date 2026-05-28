import { useState, useRef, useCallback } from "react";
import { X, Plus, Minus, RotateCcw, ChevronDown, ChevronUp, MapPin } from "lucide-react";

const DISTRICTS = [
  { id: "1010", num: 1,  name: "Innere Stadt",          cx: 281.0, cy: 304.4, path: "M 276.4,324.6 L 289.4,324.0 L 303.0,299.2 L 282.3,283.6 L 263.2,292.6 L 262.3,308.9 L 270.3,318.1 L 276.4,324.6 Z" },
  { id: "1020", num: 2,  name: "Leopoldstadt",           cx: 353.9, cy: 313.1, path: "M 303.0,299.2 L 367.7,353.7 L 460.0,397.5 L 375.8,307.9 L 321.5,244.6 L 278.6,269.2 L 282.3,283.6 L 303.0,299.2 Z" },
  { id: "1030", num: 3,  name: "Landstraße",             cx: 320.0, cy: 339.0, path: "M 317.7,377.3 L 329.8,360.0 L 367.7,353.7 L 303.0,299.2 L 289.4,324.0 L 297.5,349.9 L 317.7,377.3 Z" },
  { id: "1040", num: 4,  name: "Wieden",                 cx: 282.9, cy: 339.9, path: "M 280.5,359.2 L 297.5,349.9 L 289.4,324.0 L 276.4,324.6 L 267.2,331.1 L 280.5,359.2 Z" },
  { id: "1050", num: 5,  name: "Margareten",             cx: 261.6, cy: 351.7, path: "M 253.7,369.3 L 280.5,359.2 L 267.2,331.1 L 242.6,349.1 L 253.7,369.3 Z" },
  { id: "1060", num: 6,  name: "Mariahilf",              cx: 254.6, cy: 333.0, path: "M 242.6,349.1 L 267.2,331.1 L 276.4,324.6 L 270.3,318.1 L 239.1,332.9 L 238.8,349.4 L 242.6,349.1 Z" },
  { id: "1070", num: 7,  name: "Neubau",                 cx: 249.8, cy: 317.3, path: "M 239.1,332.9 L 270.3,318.1 L 262.3,308.9 L 237.9,305.2 L 235.9,314.8 L 239.1,332.9 Z" },
  { id: "1080", num: 8,  name: "Josefstadt",             cx: 251.2, cy: 299.5, path: "M 237.9,305.2 L 262.3,308.9 L 263.2,292.6 L 241.3,290.8 L 239.1,297.4 L 237.9,305.2 Z" },
  { id: "1090", num: 9,  name: "Alsergrund",             cx: 263.6, cy: 273.7, path: "M 241.3,290.8 L 263.2,292.6 L 282.3,283.6 L 278.6,269.2 L 270.4,244.7 L 259.4,254.1 L 242.9,286.3 L 241.3,290.8 Z" },
  { id: "1100", num: 10, name: "Favoriten",              cx: 308.6, cy: 429.4, path: "M 375.9,498.6 L 374.8,459.3 L 366.1,438.8 L 317.7,377.3 L 297.5,349.9 L 280.5,359.2 L 253.7,369.3 L 234.0,412.8 L 241.7,426.0 L 292.1,438.4 L 276.0,479.6 L 276.4,480.2 L 307.8,486.8 L 342.1,502.3 L 356.2,491.8 L 375.9,498.6 Z" },
  { id: "1110", num: 11, name: "Simmering",              cx: 388.2, cy: 402.1, path: "M 374.8,459.3 L 398.8,457.2 L 434.0,418.7 L 483.4,413.6 L 460.0,397.5 L 367.7,353.7 L 329.8,360.0 L 317.7,377.3 L 366.1,438.8 L 374.8,459.3 Z" },
  { id: "1120", num: 12, name: "Meidling",               cx: 219.9, cy: 386.1, path: "M 234.0,412.8 L 253.7,369.3 L 242.6,349.1 L 238.8,349.4 L 212.3,354.9 L 195.4,388.3 L 172.7,406.2 L 226.9,421.2 L 234.0,412.8 Z" },
  { id: "1130", num: 13, name: "Hietzing",               cx: 108.5, cy: 374.4, path: "M 172.7,406.2 L 195.4,388.3 L 212.3,354.9 L 204.0,351.9 L 135.6,337.2 L 94.0,315.0 L 54.5,318.8 L 43.9,354.1 L 18.8,387.1 L 35.3,397.3 L 41.3,423.1 L 76.6,426.1 L 86.2,434.2 L 123.1,411.2 L 146.4,420.2 L 172.7,406.2 Z" },
  { id: "1140", num: 14, name: "Penzing",                cx: 99.0,  cy: 277.9, path: "M 54.5,318.8 L 94.0,315.0 L 135.6,337.2 L 204.0,351.9 L 199.1,317.7 L 164.4,307.4 L 163.5,293.4 L 119.2,277.1 L 123.4,236.9 L 102.3,240.3 L 91.5,214.2 L 55.4,184.1 L 39.0,215.0 L 23.3,273.3 L 38.7,273.0 L 54.5,318.8 Z" },
  { id: "1150", num: 15, name: "Rudolfsheim-Fünfhaus",   cx: 219.8, cy: 334.1, path: "M 212.3,354.9 L 238.8,349.4 L 239.1,332.9 L 235.9,314.8 L 199.1,317.7 L 204.0,351.9 L 212.3,354.9 Z" },
  { id: "1160", num: 16, name: "Ottakring",              cx: 187.4, cy: 291.9, path: "M 119.2,277.1 L 163.5,293.4 L 164.4,307.4 L 199.1,317.7 L 235.9,314.8 L 237.9,305.2 L 239.1,297.4 L 213.4,279.2 L 150.8,265.0 L 119.2,277.1 Z" },
  { id: "1170", num: 17, name: "Hernals",                cx: 167.5, cy: 248.4, path: "M 241.3,290.8 L 242.9,286.3 L 235.5,274.1 L 187.3,247.1 L 167.9,212.7 L 163.9,196.7 L 145.3,201.3 L 123.4,236.9 L 119.2,277.1 L 150.8,265.0 L 213.4,279.2 L 239.1,297.4 L 241.3,290.8 Z" },
  { id: "1180", num: 18, name: "Währing",                cx: 216.6, cy: 250.3, path: "M 242.9,286.3 L 259.4,254.1 L 237.0,250.1 L 167.9,212.7 L 187.3,247.1 L 235.5,274.1 L 242.9,286.3 Z" },
  { id: "1190", num: 19, name: "Döbling",                cx: 230.9, cy: 196.8, path: "M 167.9,212.7 L 237.0,250.1 L 259.4,254.1 L 270.4,244.7 L 284.4,214.5 L 285.5,187.1 L 262.5,142.1 L 246.4,138.2 L 204.5,162.5 L 168.7,170.1 L 163.9,196.7 L 167.9,212.7 Z" },
  { id: "1200", num: 20, name: "Brigittenau",            cx: 292.8, cy: 235.3, path: "M 278.6,269.2 L 321.5,244.6 L 285.5,187.1 L 284.4,214.5 L 270.4,244.7 L 278.6,269.2 Z" },
  { id: "1210", num: 21, name: "Floridsdorf",            cx: 338.8, cy: 145.8, path: "M 321.5,244.6 L 342.6,225.1 L 363.2,222.0 L 375.8,189.5 L 398.2,186.5 L 428.7,159.6 L 380.7,123.4 L 377.0,69.1 L 363.3,61.3 L 317.4,56.5 L 298.5,68.4 L 301.5,90.1 L 272.6,144.4 L 262.5,142.1 L 285.5,187.1 L 321.5,244.6 Z" },
  { id: "1220", num: 22, name: "Donaustadt",             cx: 456.4, cy: 282.2, path: "M 571.9,445.2 L 559.5,403.3 L 538.4,406.7 L 514.9,374.0 L 522.6,342.6 L 514.9,323.0 L 528.5,288.6 L 538.0,238.9 L 519.3,230.5 L 529.9,186.5 L 493.3,183.0 L 473.5,163.4 L 485.0,137.3 L 467.2,126.8 L 438.1,120.7 L 441.0,149.5 L 428.7,159.6 L 398.2,186.5 L 375.8,189.5 L 363.2,222.0 L 342.6,225.1 L 321.5,244.6 L 375.8,307.9 L 460.0,397.5 L 483.4,413.6 L 524.8,447.8 L 570.6,465.3 L 571.9,445.2 Z" },
  { id: "1230", num: 23, name: "Liesing",                cx: 172.8, cy: 448.0, path: "M 69.4,480.9 L 79.9,486.5 L 84.9,482.9 L 138.2,468.9 L 181.1,477.8 L 182.1,486.9 L 201.2,499.5 L 218.6,459.7 L 276.0,479.6 L 292.1,438.4 L 241.7,426.0 L 234.0,412.8 L 226.9,421.2 L 172.7,406.2 L 146.4,420.2 L 123.1,411.2 L 86.2,434.2 L 76.6,426.1 L 57.9,438.2 L 75.7,464.7 L 69.4,480.9 Z" },
];

const INITIAL_VB = { x: 18, y: 56, w: 556, h: 448 };

/**
 * Computes approximate polygon area from an SVG path string (shoelace formula).
 * Used to sort districts largest-first so smaller districts render on top.
 * @param {string} pathStr
 * @returns {number}
 */
function pathArea(pathStr) {
  const coords = [...pathStr.matchAll(/[\d.]+,[\d.]+/g)].map((m) => m[0].split(",").map(Number));
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % coords.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

// Render largest districts first so small inner districts sit on top
const SORTED_DISTRICTS = [...DISTRICTS].sort((a, b) => pathArea(b.path) - pathArea(a.path));

/**
 * Interactive SVG map of Vienna's 23 districts with pan, zoom, and district selection.
 * @param {object} props
 * @param {string} props.value - Currently selected district ID (e.g. "1010").
 * @param {(id: string) => void} props.onChange - Called with the new district ID, or "" to clear.
 */
export default function ViennaMap({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  const [collapsed, setCollapsed] = useState(true);
  const [vb, setVb] = useState(INITIAL_VB);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const hasMoved = useRef(false);
  const svgRef = useRef(null);

  const selected = DISTRICTS.find((d) => d.id === value);
  const hoveredDistrict = DISTRICTS.find((d) => d.id === hovered);

  const clampVb = (next) => {
    const minW = 80;
    const maxW = INITIAL_VB.w;
    const w = Math.min(Math.max(next.w, minW), maxW);
    const h = Math.min(Math.max(next.h, minW * (INITIAL_VB.h / INITIAL_VB.w)), maxW * (INITIAL_VB.h / INITIAL_VB.w));
    return { x: next.x, y: next.y, w, h };
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    setVb((prev) => {
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      const svgMx = prev.x + mx * prev.w;
      const svgMy = prev.y + my * prev.h;
      return clampVb({ x: svgMx - mx * newW, y: svgMy - my * newH, w: newW, h: newH });
    });
  }, []);

  const zoomBy = (factor) => {
    setVb((prev) => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      return clampVb({ x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH });
    });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    hasMoved.current = false;
    setDragging(true);
    dragRef.current = { clientX: e.clientX, clientY: e.clientY, vb: { ...vb } };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.clientX) / rect.width) * dragRef.current.vb.w;
    const dy = ((e.clientY - dragRef.current.clientY) / rect.height) * dragRef.current.vb.h;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved.current = true;
    setVb({ ...dragRef.current.vb, x: dragRef.current.vb.x - dx, y: dragRef.current.vb.y - dy });
  };

  const stopDrag = () => setDragging(false);

  const handleDistrictClick = (id) => {
    if (hasMoved.current) return;
    onChange(id === value ? "" : id);
  };

  // Attach wheel with passive:false to allow preventDefault
  const svgRefCallback = useCallback((node) => {
    if (svgRef.current) svgRef.current.removeEventListener("wheel", handleWheel);
    svgRef.current = node;
    if (node) node.addEventListener("wheel", handleWheel, { passive: false });
  }, [handleWheel]);

  const viewBoxStr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const isZoomed = vb.w < INITIAL_VB.w - 1;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300"
        >
          <MapPin className="w-3.5 h-3.5" />
          Karte: Wien
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.05]"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Status label */}
          <div className="h-5">
            {selected ? (
              <p className="text-sm font-semibold text-blue-400">
                {selected.num}. Bezirk – {selected.name}
              </p>
            ) : hoveredDistrict ? (
              <p className="text-sm text-slate-400">
                {hoveredDistrict.num}. Bezirk – {hoveredDistrict.name}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Bezirk anklicken zur Auswahl</p>
            )}
          </div>

          {/* Map container */}
          <div className="relative border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-input)]">
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => zoomBy(1 / 1.4)}
                className="w-7 h-7 flex items-center justify-center bg-[var(--color-bg-elev-1)] border border-[var(--color-border)] rounded-lg text-slate-400 hover:bg-[var(--color-bg-elev-2)] hover:text-slate-200 transition-colors"
                title="Hineinzoomen"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => zoomBy(1.4)}
                disabled={!isZoomed}
                className="w-7 h-7 flex items-center justify-center bg-[var(--color-bg-elev-1)] border border-[var(--color-border)] rounded-lg text-slate-400 hover:bg-[var(--color-bg-elev-2)] hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Herauszoomen"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              {isZoomed && (
                <button
                  type="button"
                  onClick={() => setVb(INITIAL_VB)}
                  className="w-7 h-7 flex items-center justify-center bg-[var(--color-bg-elev-1)] border border-[var(--color-border)] rounded-lg text-slate-400 hover:bg-[var(--color-bg-elev-2)] hover:text-slate-200 transition-colors"
                  title="Ansicht zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <svg
              ref={svgRefCallback}
              viewBox={viewBoxStr}
              className="w-full select-none"
              style={{ maxHeight: "280px", cursor: dragging ? "grabbing" : "grab" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
            >
              {SORTED_DISTRICTS.map((d) => {
                const isSelected = d.id === value;
                const isHovered = d.id === hovered;
                return (
                  <g key={d.id}>
                    <path
                      d={d.path}
                      fill={isSelected ? "#3b82f6" : isHovered ? "rgba(59,130,246,0.25)" : "#1e293b"}
                      stroke="#0b1220"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      className="transition-colors duration-100"
                      style={{ cursor: dragging ? "grabbing" : "pointer" }}
                      onClick={() => handleDistrictClick(d.id)}
                      onMouseEnter={() => !dragging && setHovered(d.id)}
                      onMouseLeave={() => setHovered(null)}
                    />
                    <text
                      x={d.cx}
                      y={d.cy + 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={isSelected ? "#fff" : "#94a3b8"}
                      className="pointer-events-none select-none"
                    >
                      {d.num}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hint */}
            <p className="absolute bottom-1.5 left-3 text-xs text-slate-500 pointer-events-none">
              Scrollen zum Zoomen · Ziehen zum Verschieben
            </p>
          </div>
        </>
      )}
    </div>
  );
}
