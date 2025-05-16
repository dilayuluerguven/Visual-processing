"use client";

import { useCallback, useRef, useState } from "react";
import Navbar from "../../../components/Navbar";

const ImageEnhancementModule = () => {
  const [sourceImage, setSourceImage] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(false);
  const sourceCanvas = useRef(null);
  const enhancedCanvas = useRef(null);

  const handleFileSelection = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const temporaryUrl = URL.createObjectURL(selectedFile);
    setSourceImage(temporaryUrl);

    const imageLoader = new Image();
    imageLoader.src = temporaryUrl;
    imageLoader.onload = () => {
      if (!sourceCanvas.current) return;

      const renderingContext = sourceCanvas.current.getContext("2d");
      sourceCanvas.current.width = imageLoader.naturalWidth;
      sourceCanvas.current.height = imageLoader.naturalHeight;
      renderingContext.drawImage(imageLoader, 0, 0);
    };
  }, []);

  const enhanceImageQuality = useCallback(() => {
    if (!sourceCanvas.current || !enhancedCanvas.current) return;

    setProcessingStatus(true);

    try {
      const renderingContext = sourceCanvas.current.getContext("2d");
      const pixelData = renderingContext.getImageData(
        0,
        0,
        sourceCanvas.current.width,
        sourceCanvas.current.height
      );

      const enhancedData = applyQualityEnhancement(pixelData);

      enhancedCanvas.current.width = sourceCanvas.current.width;
      enhancedCanvas.current.height = sourceCanvas.current.height;
      const resultContext = enhancedCanvas.current.getContext("2d");
      resultContext.putImageData(enhancedData, 0, 0);
    } catch (error) {
      console.error("Enhancement process failed:", error);
    } finally {
      setProcessingStatus(false);
    }
  }, []);

  const applyQualityEnhancement = (pixelData) => {
    const enhancementMatrix = [
      -0.5, -1.0, -0.5, -1.0, 7.0, -1.0, -0.5, -1.0, -0.5,
    ];
    const matrixSize = 3;
    const matrixCenter = Math.floor(matrixSize / 2);

    const { data, width, height } = pixelData;
    const outputBuffer = new ImageData(width, height);
    const outputPixels = outputBuffer.data;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const pixelOffset = (row * width + col) * 4;

        for (let channel = 0; channel < 3; channel++) {
          let weightedSum = 0;

          for (
            let matrixRow = -matrixCenter;
            matrixRow <= matrixCenter;
            matrixRow++
          ) {
            for (
              let matrixCol = -matrixCenter;
              matrixCol <= matrixCenter;
              matrixCol++
            ) {
              const sampleCol = Math.min(
                Math.max(col + matrixCol, 0),
                width - 1
              );
              const sampleRow = Math.min(
                Math.max(row + matrixRow, 0),
                height - 1
              );

              const sampleIndex = (sampleRow * width + sampleCol) * 4 + channel;
              const matrixValue =
                enhancementMatrix[
                  (matrixRow + matrixCenter) * matrixSize +
                    (matrixCol + matrixCenter)
                ];

              weightedSum += data[sampleIndex] * matrixValue;
            }
          }

          outputPixels[pixelOffset + channel] = Math.min(
            Math.max(weightedSum, 0),
            255
          );
        }

        outputPixels[pixelOffset + 3] = data[pixelOffset + 3];
      }
    }

    return outputBuffer;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Görüntü Netleştirme Modülü
          </h1>
          <p className="text-gray-600">
            Görüntülerinizdeki detayları geliştirmek için gelişmiş algoritmalar
          </p>
        </header>

        <section className="mb-10">
          <div className="flex flex-col items-center space-y-4">
            <label className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg shadow-md hover:bg-indigo-700 transition-colors cursor-pointer">
              <span>Görüntü Seç</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelection}
                className="hidden"
              />
            </label>

            <button
              onClick={enhanceImageQuality}
              disabled={!sourceImage || processingStatus}
              className={`px-8 py-3 rounded-lg font-medium shadow-md transition-all ${
                !sourceImage || processingStatus
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
            >
              {processingStatus
                ? "İşlem Devam Ediyor..."
                : "Görüntüyü Netleştir"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">
              Orijinal Görüntü
            </h2>
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={sourceCanvas}
                className="w-full"
                aria-label="Orijinal görüntü"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">
              İyileştirilmiş Görüntü
            </h2>
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={enhancedCanvas}
                className="w-full"
                aria-label="İyileştirilmiş görüntü"
              />
            </div>
          </div>
        </section>

        <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-xl font-semibold mb-3 text-blue-800">
            Teknik Detaylar
          </h2>
          <div className="prose prose-blue max-w-none">
            <p>
              Bu modül, görüntülerinizdeki bulanıklığı azaltmak için özel olarak
              tasarlanmış bir konvolüsyon filtresi kullanır. Filtre matrisi,
              görüntüdeki kenar ve detay bölgelerini vurgulayarak daha net bir
              görünüm sağlar.
            </p>
            <p className="mt-2">
              Algoritma, her pikselin çevresindeki 3x3'lük alanı analiz eder ve
              ağırlıklı ortalama hesaplamaları yapar. Bu sayede görüntüdeki
              yüksek frekanslı bileşenler güçlendirilirken, görüntü kalitesi
              korunur.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ImageEnhancementModule;
