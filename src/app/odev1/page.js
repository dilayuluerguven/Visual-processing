"use client";
import { useCallback, useState } from "react";
import Navbar from "../../../components/Navbar";
import { Button } from "antd";
import React, { useRef, useEffect } from "react";

const ImageProcessor = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const canvasRef = useRef(null);
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const loadImageToCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageSrc;
  };

  const grayscale = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg; 
    }

    ctx.putImageData(imgData, 0, 0); 
  };

  
  const posterize = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const levels = 5;
    for (let i = 0; i < data.length; i += 4) {
      data[i] =
        Math.floor((data[i] / 255) * (levels - 1)) * (255 / (levels - 1)); 
      data[i + 1] =
        Math.floor((data[i + 1] / 255) * (levels - 1)) * (255 / (levels - 1)); 
      data[i + 2] =
        Math.floor((data[i + 2] / 255) * (levels - 1)) * (255 / (levels - 1)); 
    }

    ctx.putImageData(imgData, 0, 0); 
  };

  const thresholding = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const threshold = 128; 

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const color = avg > threshold ? 255 : 0; 
      data[i] = data[i + 1] = data[i + 2] = color;
    }

    ctx.putImageData(imgData, 0, 0); 
  };

  const blur = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = canvas.width;
    const height = canvas.height;

    const radius = 3; 

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const index = (ny * width + nx) * 4;
              r += data[index]; 
              g += data[index + 1]; 
              b += data[index + 2]; 
              a += data[index + 3]; 
              count++;
            }
          }
        }

        const index = (y * width + x) * 4;
        data[index] = r / count;
        data[index + 1] = g / count;
        data[index + 2] = b / count;
        data[index + 3] = a / count;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  const invertImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]; 
      data[i + 1] = 255 - data[i + 1]; 
      data[i + 2] = 255 - data[i + 2]; 
    }

    ctx.putImageData(imgData, 0, 0); 
  };

  const equalizeHistogram = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const redHistogram = Array(256).fill(0);
    const greenHistogram = Array(256).fill(0);
    const blueHistogram = Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]; 
      const g = data[i + 1]; 
      const b = data[i + 2]; 

      redHistogram[r]++;
      greenHistogram[g]++;
      blueHistogram[b]++;
    }

    const histCanvas = document.createElement("canvas");
    const histCtx = histCanvas.getContext("2d");
    histCanvas.width = 256;
    histCanvas.height = 150;

    const colors = ["red", "green", "blue"];

    for (let i = 0; i < 256; i++) {
      histCtx.fillStyle = colors[0]; 
      histCtx.fillRect(i, 0, 1, redHistogram[i] / 2); 
      histCtx.fillStyle = colors[1]; 
      histCtx.fillRect(i, 0, 1, greenHistogram[i] / 2); 
      histCtx.fillStyle = colors[2]; // Mavi
      histCtx.fillRect(i, 0, 1, blueHistogram[i] / 2); 
    }

    const histogramContainer = document.getElementById("histogram-container");
    if (histogramContainer) {
      histogramContainer.innerHTML = ""; 
      histogramContainer.appendChild(histCanvas);
    }
  };

  useEffect(() => {
    if (imageSrc) {
      loadImageToCanvas();
    }
  }, [imageSrc]);

  return (
    <div>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white select-none overflow-hidden flex-1 ">
        <div className="flex justify-between ">
          <div className="bg-white rounded-3xl shadow-lg p-8 w-[90%] max-w-4xl mt-5 ">
            <h2 className="text-center text-5xl font-extrabold text-gray-800 mb-6">
              Görüntü İşleme Operasyonları
            </h2>
            <input
              type="file"
              onChange={handleImageChange}
              className="block w-full text-lg text-gray-700 bg-gray-200 rounded-md mb-4 p-2"
            />
            {imageSrc && (
              <div className="space-y-4 mt-4">
                <div className="flex justify-between gap-4">
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={loadImageToCanvas}
                  >
                    Resmi Sıfırla
                  </Button>
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={grayscale}
                  >
                    Gri Tonlama
                  </Button>
                </div>
                <div className="flex justify-between gap-4">
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={posterize}
                  >
                    Renk Uzayı Değiştirme
                  </Button>
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={thresholding}
                  >
                    Eşikleme
                  </Button>
                </div>
                <div className="flex justify-between gap-4">
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={blur}
                  >
                    Bulanıklık
                  </Button>
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={invertImage}
                  >
                    Ters Çevir
                  </Button>
                </div>
                <div className="flex justify-between gap-4 ">
                  <Button
                    type="primary"
                    className="bg-purple-600 text-white hover:bg-purple-700 w-full py-3 rounded-xl shadow-md"
                    onClick={equalizeHistogram}
                  >
                    Histogram Görüntüleme ve Eşitleme
                  </Button>
                </div>
                <div className="mt-6 border-t border-gray-200 pt-4 ">
                  <canvas
                    className="w-full rounded-xl shadow-lg"
                    ref={canvasRef}
                    width={800}
                    height={400}
                  ></canvas>
                </div>
                <div className="flex items-center mt-4 flex-none  justify-center text-amber-950 border-b-1">
                  <p className="text-xl font-medium mt-4 mb-2  ">
                    Histogram Grafiği:
                  </p>
                  <div
                    id="histogram-container"
                    className="w-full flex justify-center mt-6 bg-white p-4 "
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImageProcessor;
