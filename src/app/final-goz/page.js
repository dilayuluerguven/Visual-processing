"use client";

import VisionNavbar from "../../../components/Navbar";
import { useCallback, useEffect, useRef, useState } from "react";

const OcularDetectionModule = () => {
  const visionCanvas = useRef(null);
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const loadAndProcessImage = useCallback(async () => {
    if (!uploadedImage) return;

    try {
      setIsProcessing(true);
      setDetectionCount(0);

      const imageProcessor = new window.Image();
      imageProcessor.src = uploadedImage;
      imageProcessor.crossOrigin = "Anonymous";

      imageProcessor.onload = () => {
        executeVisionAnalysis(imageProcessor);
      };

      imageProcessor.onerror = () => {
        setIsProcessing(false);
        console.error("Image loading failed");
      };
    } catch (error) {
      console.error("Image processing error:", error);
      setIsProcessing(false);
    }
  }, [uploadedImage]);

  const executeVisionAnalysis = (imgElement) => {
    if (!visionCanvas.current) return;

    const analysisCanvas = visionCanvas.current;
    const canvasContext = analysisCanvas.getContext("2d");

    const maxWidth = 800;
    const maxHeight = 600;
    let width = imgElement.naturalWidth;
    let height = imgElement.naturalHeight;

    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = height * ratio;
    }

    if (height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = width * ratio;
    }

    analysisCanvas.width = width;
    analysisCanvas.height = height;
    canvasContext.drawImage(imgElement, 0, 0, width, height);

    const visualData = canvasContext.getImageData(
      0,
      0,
      analysisCanvas.width,
      analysisCanvas.height
    );
    const edgeResults = performEdgeDetection(visualData);

    const detectedFeatures = identifyOcularFeatures(edgeResults, canvasContext);
    setDetectionCount(detectedFeatures.length);
    setIsProcessing(false);
  };

  const performEdgeDetection = (imgData) => {
    const { data, width, height } = imgData;
    const luminanceMap = new Uint8ClampedArray(width * height);
    const edgeMap = new Uint8ClampedArray(width * height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const pixelIndex = (row * width + col) * 4;
        luminanceMap[row * width + col] =
          0.2126 * data[pixelIndex] +
          0.7152 * data[pixelIndex + 1] +
          0.0722 * data[pixelIndex + 2];
      }
    }

    const edgeKernels = {
      horizontal: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      vertical: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
    };

    for (let row = 1; row < height - 1; row++) {
      for (let col = 1; col < width - 1; col++) {
        let hValue = 0;
        let vValue = 0;

        for (let kernelRow = -1; kernelRow <= 1; kernelRow++) {
          for (let kernelCol = -1; kernelCol <= 1; kernelCol++) {
            const neighborValue =
              luminanceMap[(row + kernelRow) * width + (col + kernelCol)];
            const kernelIndex = (kernelRow + 1) * 3 + (kernelCol + 1);

            hValue += edgeKernels.horizontal[kernelIndex] * neighborValue;
            vValue += edgeKernels.vertical[kernelIndex] * neighborValue;
          }
        }

        const edgeMagnitude = Math.sqrt(hValue * hValue + vValue * vValue);
        edgeMap[row * width + col] = edgeMagnitude > 150 ? 255 : 0;
      }
    }

    return { data: edgeMap, width, height };
  };

  const identifyOcularFeatures = (edgeData, ctx) => {
    const { data, width, height } = edgeData;

    const detectionSettings = {
      minOcularRadius: 12,
      maxOcularRadius: 42,
      detectionThreshold: 28,
      angleResolution: 2.5,
      minFeatureDistance: 55,
    };

    const potentialFeatures = detectCircularPatterns(
      data,
      width,
      height,
      detectionSettings
    );

    const confirmedEyes = validateOcularFeatures(
      potentialFeatures,
      detectionSettings.minFeatureDistance,
      2
    );

    visualizeDetectionResults(confirmedEyes, ctx);
    return confirmedEyes;
  };

  const detectCircularPatterns = (edgeData, imgWidth, imgHeight, params) => {
    const {
      minOcularRadius,
      maxOcularRadius,
      detectionThreshold,
      angleResolution,
    } = params;

    const featureAccumulator = new Map();

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        if (edgeData[y * imgWidth + x] === 255) {
          for (let r = minOcularRadius; r <= maxOcularRadius; r++) {
            for (let θ = 0; θ < 360; θ += angleResolution) {
              const a = Math.round(x - r * Math.cos((θ * Math.PI) / 180));
              const b = Math.round(y - r * Math.sin((θ * Math.PI) / 180));

              if (a >= 0 && a < imgWidth && b >= 0 && b < imgHeight) {
                const featureKey = `${a},${b},${r}`;
                featureAccumulator.set(
                  featureKey,
                  (featureAccumulator.get(featureKey) || 0) + 1
                );
              }
            }
          }
        }
      }
    }

    return Array.from(featureAccumulator.entries())
      .filter(([_, confidence]) => confidence > detectionThreshold)
      .map(([key, confidence]) => {
        const [x, y, r] = key.split(",").map(Number);
        return { x, y, radius: r, confidence };
      });
  };

  const validateOcularFeatures = (features, minSeparation, maxFeatures) => {
    const sortedFeatures = [...features].sort(
      (a, b) => b.confidence - a.confidence
    );

    const validatedFeatures = [];
    for (const feature of sortedFeatures) {
      const isDistinct = validatedFeatures.every(
        (existing) =>
          Math.hypot(existing.x - feature.x, existing.y - feature.y) >
          minSeparation
      );

      if (isDistinct) {
        validatedFeatures.push(feature);
        if (validatedFeatures.length >= maxFeatures) break;
      }
    }

    return validatedFeatures;
  };

  const visualizeDetectionResults = (features, ctx) => {
    ctx.strokeStyle = "#2ECC71";
    ctx.lineWidth = 2.5;

    for (const feature of features) {
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, feature.radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.arc(feature.x, feature.y, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  useEffect(() => {
    if (uploadedImage) {
      loadAndProcessImage();
    }
  }, [uploadedImage, loadAndProcessImage]);

  return (
    <div className="vision-container bg-gray-50 min-h-screen">
      <VisionNavbar />

      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Gelişmiş Ocular Feature Detection
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Hough Dönüşümü tabanlı yüz özelliği tanıma sistemi
        </p>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Resim Yükle
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {uploadedImage
                ? "Yüklü resim üzerinde analiz yapılıyor"
                : "Lütfen bir resim yükleyin"}
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span className="text-sm font-medium text-gray-700">
                Tespit Edilen Özellikler:{" "}
                <span className="font-bold text-blue-600">
                  {detectionCount}
                </span>
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            {!uploadedImage ? (
              <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                <p className="mt-2 text-gray-500">Görsel yüklenmedi</p>
              </div>
            ) : (
              <div className="relative">
                <canvas
                  ref={visionCanvas}
                  className="border-2 border-gray-200 rounded-lg max-w-full"
                  aria-label="Ocular feature detection results"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg">
                    <div className="text-white font-medium flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Analiz yapılıyor...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OcularDetectionModule;
