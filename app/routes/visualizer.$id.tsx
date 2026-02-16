import { useLocation } from "react-router";

const visualizerId = () => {
  const location = useLocation();
  const { initialImage, name } = location.state || {};
  return (
    <section>
      <h1>{name || 'Untitled Project'}</h1>

      <div className="visualizer-container">
        {initialImage && (
          <div className="image-container">
            <h1>Source Image</h1>
            <img src={initialImage} alt="source" />
          </div>
        )

        }
      </div>
    </section>
  )
}

export default visualizerId;