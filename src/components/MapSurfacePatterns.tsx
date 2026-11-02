import { SURFACE_BASE } from '../mapSurfacePalette';

/** Small, fixed-cost SVG tiles, shared by Scale and Illustration maps.
 * All marks are authored on a pixel grid; no image downloads or canvas work.
 * Pattern units remain in world space so panning, zooming and resizing cannot
 * shift details relative to the garden's measured coordinates.
 */
export function MapSurfacePatterns() {
  return <>
    <pattern id="ground-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#b7c6b1"/>
      <path d="M0 0H40V40" fill="none" stroke="#829d86" strokeWidth=".6" opacity=".54"/>
      <path d="M6 14h4v2H6zM25 30h6v2h-6z" fill="#759b79" opacity=".35"/>
    </pattern>
    <pattern id="map-grass" width="64" height="64" patternUnits="userSpaceOnUse">
      <rect width="64" height="64" fill={SURFACE_BASE.grass}/>
      <path d="M8 12h4v6H8zM12 14h4v4h-4zM36 38h4v6h-4zM40 40h4v4h-4zM54 8h4v4h-4zM20 54h4v4h-4z" fill="#527d55" opacity=".42"/>
      <path d="M4 42h8v4H4zM32 10h4v4h-4zM44 24h8v4h-8zM26 28h4v4h-4zM56 52h4v4h-4z" fill="#b5cf8a" opacity=".58"/>
      <path d="M10 30h4v4h-4zM42 54h4v4h-4z" fill="#d9df9c" opacity=".44"/>
    </pattern>
    <pattern id="map-soil" width="64" height="64" patternUnits="userSpaceOnUse">
      <rect width="64" height="64" fill={SURFACE_BASE.soil}/>
      <path d="M2 12h16v3H2zM26 28h23v3H26zM7 45h21v3H7zM43 56h15v3H43z" fill="#76543e" opacity=".42"/>
      <path d="M28 8h8v3h-8zM12 30h6v3h-6zM41 43h10v3H41zM4 57h8v3H4z" fill="#c1986c" opacity=".55"/>
      <path d="M47 14h4v4h-4zM22 51h4v4h-4z" fill="#dbc094" opacity=".34"/>
    </pattern>
    <pattern id="map-gravel" width="64" height="64" patternUnits="userSpaceOnUse">
      <rect width="64" height="64" fill={SURFACE_BASE.gravel}/>
      <path d="M8 10h8v4H8zM34 6h6v6h-6zM48 28h9v5h-9zM14 38h7v5h-7zM34 51h8v5h-8z" fill="#6c7974" opacity=".60"/>
      <path d="M21 19h6v4h-6zM43 15h8v5h-8zM5 56h10v4H5zM26 36h8v4h-8zM50 49h7v4h-7z" fill="#d8d7c7" opacity=".71"/>
    </pattern>
    <pattern id="map-stone" width="64" height="64" patternUnits="userSpaceOnUse">
      <rect width="64" height="64" fill={SURFACE_BASE.stone}/>
      <path d="M0 22H64M0 44H64M32 0V22M14 22V44M48 22V44M32 44V64" stroke="#788b83" strokeWidth="3" fill="none" opacity=".55"/>
      <path d="M3 3h24v3H3zM18 26h25v3H18zM34 48h24v3H34z" fill="#d8d8c8" opacity=".45"/>
    </pattern>
    <pattern id="map-water" width="64" height="64" patternUnits="userSpaceOnUse">
      <rect width="64" height="64" fill={SURFACE_BASE.water}/>
      <path d="M2 12h18v3H2zM20 15h7v3h-7zM37 32h18v3H37zM55 35h8v3h-8zM10 53h15v3H10z" fill="#b4dbd0" opacity=".65"/>
      <path d="M29 9h13v3H29zM8 29h23v3H8zM43 49h16v3H43z" fill="#397d94" opacity=".46"/>
      <path d="M15 41h9v2h-9zM47 5h7v2h-7z" fill="#e2ead5" opacity=".55"/>
    </pattern>
  </>;
}
