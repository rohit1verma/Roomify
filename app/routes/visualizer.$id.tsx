import Button from "components/ui/Button";
import { generate3DView } from "lib/ai.action";
import { createProject, getProjectById } from "lib/puter.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import { useNavigate, useOutletContext, useParams } from "react-router";

const visualizerId = () => {
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useOutletContext<AuthContext>();

  const hasInitialGenerated = useRef(false);

  const [project, setProject] = useState<DesignItem | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const handleback = () => navigate("/");

  // Share handler: uses Web Share API if available, else copies link to clipboard
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = project?.name || `Roomify Project ${id}`;
    const shareText = "Check out my room design on Roomify!";
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
      } catch (err) {
        alert("Could not copy link.");
      }
    }
  };

  const handleExport = () => {
    if (!currentImage) return;

    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `roomify-${id || "design"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runGeneration = async (item: DesignItem) => {
    if (!id || !item.sourceImage) return;

    try {
      setIsProcessing(true);
      const result = await generate3DView({ sourceImage: item.sourceImage });

      if (result.renderedImage) {
        setCurrentImage(result.renderedImage);

        const updatedItem = {
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null,
          isPublic: item.isPublic ?? false,
        };

        const saved = await createProject({
          item: updatedItem,
          visibility: "private",
        });

        if (saved) {
          setProject(saved);
          setCurrentImage(saved.renderedImage || result.renderedImage);
        }
      }
    } catch (error) {
      console.error("Generation failed: ", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      if (!id) {
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);

      const fetchedProject = await getProjectById({ id });

      if (!isMounted) return;

      setProject(fetchedProject);
      setCurrentImage(fetchedProject?.renderedImage || null);
      setIsProjectLoading(false);
      hasInitialGenerated.current = false;
    };

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (
      isProjectLoading ||
      hasInitialGenerated.current ||
      !project?.sourceImage
    )
      return;

    if (project.renderedImage) {
      setCurrentImage(project.renderedImage);
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    void runGeneration(project);
  }, [project, isProjectLoading]);

  return (
    <div className='visualizer'>
      <nav className='topbar'>
        <div className='brand'>
          <Box className='logo' />
          <span className='name'>Roomify</span>
        </div>
        <Button variant='ghost' size='sm' onClick={handleback} className='exit'>
          <X className='icon' /> Exit Editor
        </Button>
      </nav>

      <section className='content'>
        <div className='panel'>
          <div className='panel-header'>
            <div className='panel-meta'>
              <p>Project</p>
              <h2>{project?.name || `Residence ${id}`}</h2>
              <p className='note'>Created by you</p>
            </div>

            <div className='panel-actions'>
              <Button
                size='sm'
                onClick={handleExport}
                className='export'
                disabled={!currentImage}
              >
                <Download className='w-4 h-4 mr-2' />
                Export
              </Button>
              <Button size='sm' onClick={handleShare} className='share'>
                <Share2 className='w-4 h-4 mr-2' /> Share
              </Button>
            </div>
          </div>

          <div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
            {currentImage ? (
              <img
                src={currentImage}
                alt='AI Render'
                className='render-image'
              />
            ) : (
              <div className='render-placeholder'>
                {project?.sourceImage && (
                  <img
                    src={project.sourceImage}
                    alt='Original'
                    className='render-fallback'
                  />
                )}
              </div>
            )}

            {isProcessing && (
              <div className='render-overlay'>
                <div className='rendering-card'>
                  <RefreshCcw className='spinner' />
                  <span className='subtitle'>
                    Generating your 3D visualization...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='panel compare'>
          <div className='panel-header'>
            <div className='panel-meta'>
              <p>Compare</p>
              <h3>Before and After</h3>
            </div>
            <div className='hint'>Drag to compare</div>
          </div>

          <div className='compare-stage'>
            {project?.sourceImage && currentImage ? (
              <ReactCompareSlider
                defaultValue={50}
                style={{ width: "100%", height: "auto" }}
                itemOne={
                  <ReactCompareSliderImage
                    src={project?.sourceImage}
                    alt='before'
                    className='compare-img'
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={currentImage ?? project?.renderedImage ?? undefined}
                    alt='after'
                    className='compare-img'
                  />
                }
              />
            ) : (
              <div className='compare-fallback'>
                {project?.sourceImage && (
                  <img
                    src={project.sourceImage}
                    alt='Before'
                    className='comapre-img'
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default visualizerId;
