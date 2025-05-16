"use client";
import Navbar from "../../../components/Navbar";
import { useCallback, useEffect, useRef, useState } from "react";

const LineDetectionComponent = () => {
  const canvasElement = useRef(null);
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [threshold, setThreshold] = useState(100);
  const [edgeThreshold, setEdgeThreshold] = useState(150);
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

  const initializeImageProcessing = useCallback(() => {
    if (!uploadedImage) return;

    setIsProcessing(true);
    setLineCount(0);

    const imageLoader = new Image();
    imageLoader.src = uploadedImage;
    imageLoader.crossOrigin = "Anonymous";

    imageLoader.onload = () => {
      executeProcessingPipeline(imageLoader);
    };

    imageLoader.onerror = () => {
      setIsProcessing(false);
      console.error("Resim yüklenirken hata oluştu");
    };
  }, [threshold, edgeThreshold, uploadedImage]);

  const executeProcessingPipeline = (imageElement) => {
    if (!canvasElement.current) return;

    const processingCanvas = canvasElement.current;
    const canvasContext = processingCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    const maxWidth = 800;
    const maxHeight = 600;
    let width = imageElement.width;
    let height = imageElement.height;

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

    processingCanvas.width = width;
    processingCanvas.height = height;
    canvasContext.drawImage(imageElement, 0, 0, width, height);

    const pixelData = canvasContext.getImageData(
      0,
      0,
      processingCanvas.width,
      processingCanvas.height
    );
    const edgeMap = applyEdgeDetection(pixelData);
    const linesDetected = identifyLinesUsingHough(edgeMap, canvasContext);

    setLineCount(linesDetected);
    setIsProcessing(false);
  };

  const applyEdgeDetection = (imageData) => {
    const { data, width, height } = imageData;
    const grayscaleValues = new Uint8ClampedArray(width * height);
    const edgeValues = new Uint8ClampedArray(width * height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const pixelIndex = (row * width + col) * 4;
        grayscaleValues[row * width + col] =
          0.2126 * data[pixelIndex] +
          0.7152 * data[pixelIndex + 1] +
          0.0722 * data[pixelIndex + 2];
      }
    }

    const horizontalKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const verticalKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let row = 1; row < height - 1; row++) {
      for (let col = 1; col < width - 1; col++) {
        let horizontalGradient = 0;
        let verticalGradient = 0;

        for (let kernelRow = -1; kernelRow <= 1; kernelRow++) {
          for (let kernelCol = -1; kernelCol <= 1; kernelCol++) {
            const neighborValue =
              grayscaleValues[(row + kernelRow) * width + (col + kernelCol)];
            const kernelIndex = (kernelRow + 1) * 3 + (kernelCol + 1);

            horizontalGradient += horizontalKernel[kernelIndex] * neighborValue;
            verticalGradient += verticalKernel[kernelIndex] * neighborValue;
          }
        }

        const edgeStrength = Math.sqrt(
          horizontalGradient * horizontalGradient +
            verticalGradient * verticalGradient
        );

        edgeValues[row * width + col] = edgeStrength > edgeThreshold ? 255 : 0;
      }
    }

    return { data: edgeValues, width, height };
  };

  const identifyLinesUsingHough = (edgeData, renderingContext) => {
    const { data, width, height } = edgeData;
    const votingAccumulator = new Map();

    const angleIncrement = 1;
    const maxRadius = Math.hypot(width, height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (data[row * width + col] === 255) {
          for (let angle = 0; angle < 180; angle += angleIncrement) {
            const radius = Math.round(
              col * Math.cos((angle * Math.PI) / 180) +
                row * Math.sin((angle * Math.PI) / 180)
            );
            const accumulatorKey = `${angle},${radius}`;
            votingAccumulator.set(
              accumulatorKey,
              (votingAccumulator.get(accumulatorKey) || 0) + 1
            );
          }
        }
      }
    }

    const voteThreshold = threshold;
    renderingContext.strokeStyle = "#FF0000";
    renderingContext.lineWidth = 2;

    let detectedLines = 0;

    for (const [lineParams, voteCount] of votingAccumulator) {
      if (voteCount > voteThreshold) {
        detectedLines++;
        const [lineAngle, lineRadius] = lineParams.split(",").map(Number);
        const angleInRadians = (lineAngle * Math.PI) / 180;

        const cosineValue = Math.cos(angleInRadians);
        const sineValue = Math.sin(angleInRadians);

        const startX = Math.round(lineRadius * cosineValue - 1000 * sineValue);
        const startY = Math.round(lineRadius * sineValue + 1000 * cosineValue);
        const endX = Math.round(lineRadius * cosineValue + 1000 * sineValue);
        const endY = Math.round(lineRadius * sineValue - 1000 * cosineValue);

        renderingContext.beginPath();
        renderingContext.moveTo(startX, startY);
        renderingContext.lineTo(endX, endY);
        renderingContext.stroke();
      }
    }

    return detectedLines;
  };

  useEffect(() => {
    if (uploadedImage) {
      initializeImageProcessing();
    }
  }, [initializeImageProcessing, uploadedImage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <h1 className="text-2xl font-bold">
              Görüntüde Çizgi Tespit Sistemi
            </h1>
            <p className="mt-2 opacity-90">
              Hough Dönüşümü algoritması ile görüntülerdeki doğrusal yapıların
              tespiti
            </p>
          </div>

          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eşik Değeri: {threshold}
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kenar Eşiği: {edgeThreshold}
                </label>
                <input
                  type="range"
                  min="50"
                  max="255"
                  value={edgeThreshold}
                  onChange={(e) => setEdgeThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-end space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
                >
                  Resim Yükle
                </button>
                <button
                  onClick={initializeImageProcessing}
                  disabled={isProcessing || !uploadedImage}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isProcessing
                      ? "bg-gray-400 cursor-not-allowed"
                      : !uploadedImage
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isProcessing ? "İşleniyor..." : "Çizgileri Tespit Et"}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              <span className="text-sm font-medium text-gray-700">
                Tespit Edilen Çizgiler:
                <span className="ml-1 font-bold text-indigo-600">
                  {lineCount}
                </span>
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Kırmızı çizgiler tespit edilen yapıları gösterir
            </div>
          </div>

          <div className="p-4 bg-gray-100 flex justify-center">
            <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
              {!uploadedImage ? (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-50">
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
                  <p className="mt-2 text-sm text-gray-600">
                    Lütfen bir resim yükleyin
                  </p>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Resim Seç
                  </button>
                </div>
              ) : (
                <canvas
                  ref={canvasElement}
                  className="max-w-full h-auto bg-white"
                  style={{ display: "block" }}
                />
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
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
                    Görüntü işleniyor...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800">Nasıl Çalışır?</h3>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>1. "Resim Yükle" butonu ile bir resim seçin</li>
            <li>2. Görüntü önce gri tonlamaya dönüştürülür</li>
            <li>3. Sobel operatörü ile kenarlar tespit edilir</li>
            <li>4. Hough dönüşümü ile çizgiler belirlenir</li>
            <li>Kaydırıcılarla hassasiyeti ayarlayabilirsiniz</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default LineDetectionComponent;
