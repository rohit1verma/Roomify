import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useOutletContext } from "react-router";

import {
  PROGRESS_INTERVAL_MS,
  REDIRECT_DELAY_MS,
  PROGRESS_INCREMENT,
} from "../lib/constants";

interface UploadProps {
  onComplete?: (base64Image: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const { isSignedIn } = useOutletContext<AuthContext>();

  // Ref: store interval ID for cleanup
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Process file: read as base64, animate progress, call onComplete
  const processFile = useCallback(
    (file: File) => {
      if (!isSignedIn) return;

      setFile(file);
      setProgress(0);
      // Clear any previous interval
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      const reader = new FileReader();
      reader.onerror = () => {
        setFile(null);
        setProgress(0);
      };
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        if (uploadIntervalRef.current) {
          clearInterval(uploadIntervalRef.current);
          uploadIntervalRef.current = null;
        }
        uploadIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            const next = prev + PROGRESS_INCREMENT;
            if (next >= 100) {
              if (uploadIntervalRef.current) {
                clearInterval(uploadIntervalRef.current);
                uploadIntervalRef.current = null;
              }
              setTimeout(() => {
                onComplete?.(base64Data);
              }, REDIRECT_DELAY_MS);
              return 100;
            }
            return next;
          });
        }, PROGRESS_INTERVAL_MS);
      };

      reader.onerror = () => {
        if (uploadIntervalRef.current) {
          clearInterval(uploadIntervalRef.current);
          uploadIntervalRef.current = null;
        }
        setProgress(0);
        setFile(null);
        if (onComplete) onComplete(null as any); // or pass error object if needed
      };

      reader.readAsDataURL(file);
    },
    [isSignedIn, onComplete],
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
    };
  }, []);

  // Handle file input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSignedIn) return;
    const files = e.target.files;
    if (files && files[0]) {
      setFile(files[0]);
      processFile(files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isSignedIn) return;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isSignedIn) return;
    const droppedFile = e.dataTransfer.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (droppedFile && allowedTypes.includes(droppedFile.type)) {
      processFile(droppedFile);
    }
  };

  return (
    <div className='upload'>
      {!file ? (
        <div
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type='file'
            className='drop-input'
            accept='.jpg, .png, .jpeg'
            disabled={!isSignedIn}
            onChange={handleChange}
          />
          <div className='drop-content'>
            <div className='drop-icon'>
              <UploadIcon size={20} />
            </div>

            <p>
              {isSignedIn
                ? "Click to upload or just drag and drop"
                : "Sign in or sign up with puter to upload"}
            </p>

            <p className='help'>Max file size 50 MB.</p>
          </div>
        </div>
      ) : (
        <div className='upload-status'>
          <div className='status-content'>
            <div className='status-icon'>
              {progress === 100 ? (
                <CheckCircle2 className='check' />
              ) : (
                <ImageIcon className='image' />
              )}
            </div>

            <h3>{file.name}</h3>

            <div className='progress'>
              <div className='bar' style={{ width: `${progress}%` }} />
              <p className='status-text'>
                {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
