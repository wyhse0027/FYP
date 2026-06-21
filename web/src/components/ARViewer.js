// Minimal, reliable WebAR for product pages
import '@google/model-viewer';

export default function ARViewer({
  src,                 // e.g. "/models/eleganza.glb"
  iosSrc,              // optional usdz for iOS: "/models/eleganza.usdz"
  poster,              // optional poster image
  alt = "3D perfume model",
  height = 420,
}) {
  const style = { width: '100%', height, background: 'transparent', borderRadius: 16 };

  return (
    <model-viewer
      src={src}
      ios-src={iosSrc}
      poster={poster}
      alt={alt}
      camera-controls
      touch-action="pan-y"
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="fixed"
      environment-image="neutral"
      exposure="1"
      style={style}
    >
      <button slot="ar-button" style={{
        padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
        background: '#0ea5e9', color: 'white', fontWeight: 600
      }}>
        View in AR
      </button>

      <div slot="progress-bar" style={{ height: 4, background: '#e5e7eb' }}>
        <div id="progress" style={{ height: 4, background: '#0ea5e9', width: '0%' }} />
      </div>
    </model-viewer>
  );
}
