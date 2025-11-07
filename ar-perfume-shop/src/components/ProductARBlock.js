import ARPlaceholder from "./ARPlaceholder";
import ARViewer from "./ARViewer"; // the component you already pasted

export default function ProductARBlock({ model3d, model3dIOS, poster, height = 420 }) {
  // No 3D yet? show a nice placeholder
  if (!model3d) return <ARPlaceholder height={height} />;

  // 3D is ready later → this automatically becomes a real AR viewer
  return (
    <ARViewer
      src={model3d}
      iosSrc={model3dIOS}
      poster={poster}
      height={height}
    />
  );
}
