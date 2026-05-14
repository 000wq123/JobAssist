import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Minus, RotateCcw, ChevronDown, ChevronUp, MapPin } from "lucide-react";

const CITY_DATA = {
  graz: {
    name: "Graz",
    relations: [
      { id: "R102537", name: "I. Innere Stadt" },
      { id: "R102553", name: "II. St. Leonhard" },
      { id: "R102572", name: "III. Geidorf" },
      { id: "R102586", name: "IV. Lend" },
      { id: "R102590", name: "V. Gries" },
      { id: "R102593", name: "VI. Jakomini" },
      { id: "R102546", name: "VII. Liebenau" },
      { id: "R102600", name: "VIII. St. Peter" },
      { id: "R102614", name: "IX. Waltendorf" },
      { id: "R102615", name: "X. Ries" },
      { id: "R102628", name: "XI. Mariatrost" },
      { id: "R102639", name: "XII. Andritz" },
      { id: "R102648", name: "XIII. Gösting" },
      { id: "R102653", name: "XIV. Eggenberg" },
      { id: "R102660", name: "XV. Wetzelsdorf" },
      { id: "R102661", name: "XVI. Straßgang" },
      { id: "R102662", name: "XVII. Puntigam" },
    ],
  },
  linz: {
    name: "Linz",
    relations: [
      { id: "R7338687", name: "Innere Stadt" },
      { id: "R7338686", name: "Urfahr" },
      { id: "R7338682", name: "Franckviertel" },
      { id: "R7338683", name: "Kaplanhof" },
      { id: "R7338681", name: "Bulgariplatz" },
      { id: "R7338679", name: "Bindermichl" },
      { id: "R7338680", name: "Froschberg" },
      { id: "R7338678", name: "Spallerhof" },
      { id: "R7338677", name: "Neue Heimat" },
      { id: "R7338676", name: "Kleinmünchen" },
      { id: "R7338672", name: "Pöstlingberg" },
      { id: "R7338685", name: "St. Magdalena" },
      { id: "R7338684", name: "Dornach-Auhof" },
      { id: "R7338675", name: "Hafen" },
      { id: "R7338674", name: "Ebelsberg" },
      { id: "R7338673", name: "Pichling" },
    ],
  },
  innsbruck: {
    name: "Innsbruck",
    relations: [
      { id: "R8182617", name: "Innere Stadt" },
      { id: "R8182616", name: "Wilten" },
      { id: "R8182615", name: "Pradl" },
      { id: "R8182614", name: "Amras" },
      { id: "R8379594", name: "Hötting" },
      { id: "R8379593", name: "Mühlau" },
      { id: "R8379592", name: "Arzl" },
      { id: "R8182613", name: "Igls" },
      { id: "R8182612", name: "Vill" },
    ],
  },
  salzburg: {
    name: "Salzburg",
    relations: [
      { id: "R7489993", name: "Altstadt" },
      { id: "R7489977", name: "Neustadt" },
      { id: "R7489978", name: "Mülln" },
      { id: "R7489972", name: "Schallmoos" },
      { id: "R7489983", name: "Lehen" },
      { id: "R7489981", name: "Maxglan" },
      { id: "R7489971", name: "Taxham" },
      { id: "R7489975", name: "Parsch" },
      { id: "R7489984", name: "Langwied" },
    ],
  },
};

const SVG_W = 560;
const SVG_H = 448;
const PAD = 20;

/**
 * Projects geographic coordinates (lon/lat) to SVG pixel coordinates.
 * @param {number} lon
 * @param {number} lat
 * @param {number} lonMin
 * @param {number} lonMax
 * @param {number} latMin
 * @param {number} latMax
 * @returns {[number, number]}
 */
function project(lon, lat, lonMin, lonMax, latMin, latMax) {
  return [
    ((lon - lonMin) / (lonMax - lonMin)) * (SVG_W - 2 * PAD) + PAD,
    ((latMax - lat) / (latMax - latMin)) * (SVG_H - 2 * PAD) + PAD,
  ];
}

/**
 * Converts an array of [lon, lat] coordinate pairs to an SVG path string.
 * @param {[number, number][]} rawCoords
 * @param {number} lonMin
 * @param {number} lonMax
 * @param {number} latMin
 * @param {number} latMax
 * @returns {string}
 */
function coordsToPath(rawCoords, lonMin, lonMax, latMin, latMax) {
  return rawCoords
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat, lonMin, lonMax, latMin, latMax);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}

/**
 * Estimates polygon area from an SVG path string using the shoelace formula.
 * Used to z-sort districts so smaller ones render on top.
 * @param {string} pathStr
 * @returns {number}
 */
function shoelaceArea(pathStr) {
  const coords = [...pathStr.matchAll(/([\d.]+),([\d.]+)/g)].map((m) => [
    parseFloat(m[1]),
    parseFloat(m[2]),
  ]);
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % coords.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/**
 * Clamps a viewBox object to prevent over-zooming or panning out of bounds.
 * @param {{ x: number, y: number, w: number, h: number }} vb
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function clampVb(vb) {
  const MIN_W = 50;
  const MAX_W = SVG_W * 2;
  const w = Math.max(MIN_W, Math.min(MAX_W, vb.w));
  const h = w * (SVG_H / SVG_W);
  return { ...vb, w, h };
}

/**
 * Generic interactive SVG map for any supported city loaded via GeoJSON.
 * Supports pan, zoom, district hover and selection.
 * @param {object} props
 * @param {string} props.cityKey - Key into CITY_DATA config (e.g. "graz", "linz").
 * @param {(districtName: string|null) => void} props.onSelect
 * @param {string|null} props.selected - Currently selected district name.
 */
export default function CityMap({ cityKey, onSelect, selected }) {
  const config = CITY_DATA[cityKey];
  const [collapsed, setCollapsed] = useState(true);
  const [districts, setDistricts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const INITIAL_VB = { x: 0, y: 0, w: SVG_W, h: SVG_H };
  const [vb, setVb] = useState(INITIAL_VB);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const hasMoved = useRef(false);
  const svgRef = useRef(null);

  useEffect(() => {
    if (collapsed || !config || districts) return;

    const cacheKey = `citymap_${cityKey}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setDistricts(JSON.parse(cached));
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    setLoading(true);
    setError(null);

    const ids = config.relations.map((r) => r.id).join(",");
    fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${ids}&format=json&polygon_geojson=1`,
      { headers: { "User-Agent": "AustrianJobSearchApp/1.0 (contact@jobapp.at)" } }
    )
      .then((r) => r.json())
      .then((data) => {
        // Compute global bounds
        let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
        for (const feature of data) {
          if (!feature.geojson?.coordinates) continue;
          const rings =
            feature.geojson.type === "MultiPolygon"
              ? feature.geojson.coordinates.map((p) => p[0])
              : [feature.geojson.coordinates[0]];
          for (const ring of rings) {
            for (const [lon, lat] of ring) {
              lonMin = Math.min(lonMin, lon);
              lonMax = Math.max(lonMax, lon);
              latMin = Math.min(latMin, lat);
              latMax = Math.max(latMax, lat);
            }
          }
        }

        const processed = data
          .map((feature) => {
            const rel = config.relations.find(
              (r) => `R${feature.osm_id}` === r.id
            );
            if (!rel || !feature.geojson?.coordinates) return null;

            const rings =
              feature.geojson.type === "MultiPolygon"
                ? feature.geojson.coordinates.map((p) => p[0])
                : [feature.geojson.coordinates[0]];

            // Use the largest ring as the main outline
            const mainRing = rings.sort((a, b) => b.length - a.length)[0];
            const path = coordsToPath(mainRing, lonMin, lonMax, latMin, latMax);

            // Centroid
            const projected = mainRing.map(([lon, lat]) =>
              project(lon, lat, lonMin, lonMax, latMin, latMax)
            );
            const cx = projected.reduce((s, [x]) => s + x, 0) / projected.length;
            const cy = projected.reduce((s, [, y]) => s + y, 0) / projected.length;

            return { id: rel.id, name: rel.name, path, cx, cy };
          })
          .filter(Boolean);

        sessionStorage.setItem(cacheKey, JSON.stringify(processed));
        setDistricts(processed);
        setLoading(false);
      })
      .catch(() => {
        setError("Kartendaten konnten nicht geladen werden.");
        setLoading(false);
      });
  }, [collapsed, cityKey, config, districts]);

  const sortedDistricts = districts
    ? [...districts].sort((a, b) => shoelaceArea(b.path) - shoelaceArea(a.path))
    : [];

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

  const svgCallbackRef = useCallback(
    (node) => {
      if (svgRef.current) svgRef.current.removeEventListener("wheel", handleWheel);
      svgRef.current = node;
      if (node) node.addEventListener("wheel", handleWheel, { passive: false });
    },
    [handleWheel]
  );

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    hasMoved.current = false;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startVb: { ...vb },
      scaleX: vb.w / rect.width,
      scaleY: vb.h / rect.height,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
    setVb((prev) => ({
      ...prev,
      x: dragRef.current.startVb.x - dx * dragRef.current.scaleX,
      y: dragRef.current.startVb.y - dy * dragRef.current.scaleY,
    }));
  };

  const handleMouseUp = () => setDragging(false);

  if (!config) return null;

  const selectedDistrict = districts?.find((d) => d.name === selected);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 mb-2"
      >
        <MapPin className="w-3.5 h-3.5" />
        Karte: {config.name}
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
      </button>

      {!collapsed && (
        <div className="border border-[#1f2937] rounded-lg overflow-hidden bg-[#0b1220]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#111827] border-b border-[#1f2937]">
            <span className="text-xs text-slate-400 truncate">
              {hovered ? (
                hovered
              ) : selectedDistrict ? (
                <span className="text-blue-400 font-medium">
                  ✓ {selectedDistrict.name}
                </span>
              ) : (
                "Bezirk auswählen"
              )}
            </span>
            <div className="flex gap-1 flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() =>
                  setVb((v) => clampVb({ ...v, w: v.w / 1.3, h: v.h / 1.3 }))
                }
                className="w-5 h-5 rounded text-xs bg-[#1f2937] border border-[#374151] text-slate-400 hover:bg-[#374151] hover:text-slate-200 flex items-center justify-center"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setVb((v) => clampVb({ ...v, w: v.w * 1.3, h: v.h * 1.3 }))
                }
                className="w-5 h-5 rounded text-xs bg-[#1f2937] border border-[#374151] text-slate-400 hover:bg-[#374151] hover:text-slate-200 flex items-center justify-center"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setVb(INITIAL_VB)}
                className="w-5 h-5 rounded text-xs bg-[#1f2937] border border-[#374151] text-slate-400 hover:bg-[#374151] hover:text-slate-200 flex items-center justify-center"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              {selected && (
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  className="w-5 h-5 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div style={{ height: 280 }}>
            {loading && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Kartendaten werden geladen…
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center h-full text-sm text-red-500 p-4 text-center">
                {error}
              </div>
            )}
            {districts && (
              <svg
                ref={svgCallbackRef}
                viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                width="100%"
                height="100%"
                style={{
                  cursor: dragging ? "grabbing" : "grab",
                  display: "block",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {sortedDistricts.map((d) => {
                  const isSelected = selected === d.name;
                  const isHovered = hovered === d.name;
                  return (
                    <path
                      key={d.id}
                      d={d.path}
                      fill={
                        isSelected
                          ? "#3b82f6"
                          : isHovered
                          ? "rgba(59,130,246,0.3)"
                          : "#1e293b"
                      }
                      stroke="#0b1220"
                      strokeWidth={isSelected || isHovered ? "1.5" : "0.8"}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHovered(d.name)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasMoved.current) {
                          onSelect(isSelected ? null : d.name);
                        }
                      }}
                    />
                  );
                })}
                {/* District labels for selected/hovered */}
                {districts.map((d) => {
                  const isSelected = selected === d.name;
                  const isHovered = hovered === d.name;
                  if (!isSelected && !isHovered) return null;
                  const fontSize = Math.max(6, Math.min(11, (SVG_W / vb.w) * 9));
                  const label =
                    d.name.length > 16 ? d.name.substring(0, 15) + "…" : d.name;
                  return (
                    <text
                      key={`lbl-${d.id}`}
                      x={d.cx}
                      y={d.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fontWeight="600"
                      fill={isSelected ? "#fff" : "#93c5fd"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
