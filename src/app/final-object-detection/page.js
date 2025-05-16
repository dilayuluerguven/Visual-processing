"use client";
import Navbar from "../../../components/Navbar";

import { useRef, useState } from "react";

const ObjectDetectionAnalyzer = () => {
  const [imageData, setImageData] = useState(null);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageData(e.target.result);
        analyzeImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      setIsProcessing(false);
    }
  };

  const analyzeImage = (imageSrc) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const objects = detectObjects(imageData);
      setDetectedObjects(objects);
      setIsProcessing(false);
    };
  };

  const detectObjects = (imageData) => {
    const { data, width, height } = imageData;
    const vegetationMask = createVegetationMask(data, width, height);
    const connectedComponents = findConnectedComponents(
      vegetationMask,
      width,
      height
    );
    return extractObjectFeatures(connectedComponents, imageData);
  };

  const createVegetationMask = (data, width, height) => {
    const mask = new Uint8Array(width * height);
    const vegetationRange = {
      min: [0, 50, 0],
      max: [100, 150, 100],
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const [r, g, b] = [data[idx], data[idx + 1], data[idx + 2]];

        const isVegetation =
          g > r * 1.2 &&
          g > b * 1.2 &&
          r >= vegetationRange.min[0] &&
          r <= vegetationRange.max[0] &&
          g >= vegetationRange.min[1] &&
          g <= vegetationRange.max[1] &&
          b >= vegetationRange.min[2] &&
          b <= vegetationRange.max[2];

        mask[y * width + x] = isVegetation ? 1 : 0;
      }
    }
    return mask;
  };

  const findConnectedComponents = (mask, width, height) => {
    let currentLabel = 1;
    const labels = new Array(width * height).fill(0);
    const equivalences = {};

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (mask[index] === 1) {
          const neighbors = [];
          if (x > 0 && labels[index - 1] > 0) neighbors.push(labels[index - 1]);
          if (y > 0 && labels[index - width] > 0)
            neighbors.push(labels[index - width]);

          if (neighbors.length === 0) {
            labels[index] = currentLabel;
            currentLabel++;
          } else {
            const minLabel = Math.min(...neighbors);
            labels[index] = minLabel;

            neighbors.forEach((label) => {
              if (label !== minLabel) {
                if (!equivalences[minLabel]) equivalences[minLabel] = new Set();
                equivalences[minLabel].add(label);
              }
            });
          }
        }
      }
    }

    const labelMap = {};
    Object.keys(equivalences).forEach((mainLabel) => {
      const allLabels = [
        parseInt(mainLabel),
        ...Array.from(equivalences[mainLabel]),
      ];
      const newLabel = Math.min(...allLabels);

      allLabels.forEach((label) => {
        labelMap[label] = newLabel;
      });
    });

    const components = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        let label = labels[index];

        if (label > 0) {
          if (labelMap[label]) label = labelMap[label];

          if (!components[label]) {
            components[label] = { pixels: [] };
          }
          components[label].pixels.push({ x, y });
        }
      }
    }

    return components;
  };

  const extractObjectFeatures = (components, imageData) => {
    const { data, width } = imageData;

    return Object.values(components).map((obj, idx) => {
      const { pixels } = obj;
      const xs = pixels.map((p) => p.x);
      const ys = pixels.map((p) => p.y);

      const bbox = {
        x1: Math.min(...xs),
        x2: Math.max(...xs),
        y1: Math.min(...ys),
        y2: Math.max(...ys),
      };

      const values = pixels.map((p) => {
        const idx = (p.y * width + p.x) * 4;
        return (
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
        );
      });

      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const energy = values.reduce((a, b) => a + b * b, 0) / values.length;

      const unique = {};
      values.forEach((v) => {
        const key = Math.round(v);
        unique[key] = (unique[key] || 0) + 1;
      });

      let entropy = 0;
      const total = values.length;
      Object.values(unique).forEach((count) => {
        const p = count / total;
        entropy -= p * Math.log2(p);
      });

      return {
        id: idx + 1,
        center: `${Math.round((bbox.x1 + bbox.x2) / 2)},${Math.round(
          (bbox.y1 + bbox.y2) / 2
        )}`,
        dimensions: {
          width: bbox.x2 - bbox.x1 + 1,
          height: bbox.y2 - bbox.y1 + 1,
          diagonal: Math.round(
            Math.hypot(bbox.x2 - bbox.x1, bbox.y2 - bbox.y1)
          ),
        },
        statistics: {
          energy: energy.toFixed(3),
          entropy: entropy.toFixed(2),
          mean: Math.round(mean),
          median: Math.round(median),
        },
      };
    });
  };

  const exportAnalysisResults = () => {
    if (detectedObjects.length === 0) return;

    const csvContent = [
      [
        "ID",
        "Center",
        "Width",
        "Height",
        "Diagonal",
        "Energy",
        "Entropy",
        "Mean",
        "Median",
      ],
      ...detectedObjects.map((obj) => [
        obj.id,
        obj.center,
        obj.dimensions.width,
        obj.dimensions.height,
        obj.dimensions.diagonal,
        obj.statistics.energy,
        obj.statistics.entropy,
        obj.statistics.mean,
        obj.statistics.median,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vegetation_analysis.csv";
    link.click();
  };

  return (
    <div className="w-full">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Nesneleri sayma Aracı
        </h1>

        <div className="flex flex-col items-center gap-4 mb-8">
          <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Görsel Seç
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
          </label>

          <button
            onClick={exportAnalysisResults}
            disabled={detectedObjects.length === 0 || isProcessing}
            className={`px-6 py-2 rounded-lg font-medium ${
              detectedObjects.length === 0 || isProcessing
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            Analizi Dışa Aktar (CSV)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2 text-center">
              Görsel Önizleme
            </h2>
            <canvas
              ref={canvasRef}
              className="w-full border border-gray-200 rounded"
            />
          </div>

          {detectedObjects.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-center">
                Tespit Edilen Nesneler ({detectedObjects.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-500 text-white">
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Merkez</th>
                      <th className="p-3 text-left">Genişlik</th>
                      <th className="p-3 text-left">Yükseklik</th>
                      <th className="p-3 text-left">Çapraz</th>
                      <th className="p-3 text-left">Enerji</th>
                      <th className="p-3 text-left">Entropi</th>
                      <th className="p-3 text-left">Ortalama</th>
                      <th className="p-3 text-left">Medyan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectedObjects.map((obj, idx) => (
                      <tr
                        key={obj.id}
                        className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                      >
                        <td className="p-3 border-b">{obj.id}</td>
                        <td className="p-3 border-b">{obj.center}</td>
                        <td className="p-3 border-b">
                          {obj.dimensions.width} px
                        </td>
                        <td className="p-3 border-b">
                          {obj.dimensions.height} px
                        </td>
                        <td className="p-3 border-b">
                          {obj.dimensions.diagonal} px
                        </td>
                        <td className="p-3 border-b">
                          {obj.statistics.energy}
                        </td>
                        <td className="p-3 border-b">
                          {obj.statistics.entropy}
                        </td>
                        <td className="p-3 border-b">{obj.statistics.mean}</td>
                        <td className="p-3 border-b">
                          {obj.statistics.median}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="text-center text-blue-500">
            <p>Görsel analiz ediliyor, lütfen bekleyin...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectDetectionAnalyzer;
