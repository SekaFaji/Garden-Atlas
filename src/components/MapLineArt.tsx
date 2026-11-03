import { lineRenderWidths } from '../lineDimensions';
import { fencePostPoints, fencePostSize } from '../mapLineArt';
import type { LineFeature, Point } from '../model';

interface Props {
  line: LineFeature;
  points: readonly Point[];
  pixelsPerMetre: number;
}

/** Presentation only. Editing hit targets and saved geometry remain in MapScene. */
export function MapLineArt({ line, points, pixelsPerMetre }: Props) {
  const coordinates = points.map(p => `${p.x * pixelsPerMetre},${p.y * pixelsPerMetre}`).join(' ');
  const { interior, outline } = lineRenderWidths(line.widthM, pixelsPerMetre);
  const isFence = line.kind === 'fence';
  const postSize = isFence ? fencePostSize(line.widthM, pixelsPerMetre) : 0;
  const posts = postSize > 0 ? fencePostPoints(points) : [];
  return <g className="map-line-art" data-line-art-kind={line.kind} pointerEvents="none" shapeRendering="crispEdges">
    <polyline points={coordinates} fill="none" stroke={isFence ? '#44362e' : '#665b4b'}
      strokeWidth={outline} strokeLinecap="square" strokeLinejoin="bevel" />
    <polyline points={coordinates} fill="none" stroke={isFence ? '#bc9465' : '#c9bfaa'}
      strokeWidth={interior} strokeLinecap="square" strokeLinejoin="bevel"
      strokeDasharray={isFence && !postSize ? '7 5' : undefined} />
    {!isFence && line.widthM >= 0.6 && <polyline points={coordinates} fill="none" stroke="#f1e5c9"
      strokeWidth={Math.min(2, interior * 0.12)} opacity=".65" strokeDasharray="5 15"
      strokeLinecap="butt" strokeLinejoin="bevel" />}
    {posts.map((post, i) => {
      const x = post.x * pixelsPerMetre - postSize / 2, y = post.y * pixelsPerMetre - postSize / 2;
      return <g key={i}>
        <rect x={x} y={y} width={postSize} height={postSize} fill="#654934" stroke="#342a25" strokeWidth={Math.min(1.2, postSize * 0.2)}/>
        <rect x={x + postSize * 0.25} y={y + postSize * 0.17}
          width={postSize * 0.4} height={postSize * 0.25} fill="#e1bc86" opacity=".9"/>
      </g>;
    })}
  </g>;
}
