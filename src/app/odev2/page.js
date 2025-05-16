"use client";
import { useState } from "react";
import Navbar from "../../../components/Navbar";
import { Button, Input, Select } from "antd";
import "antd/dist/reset.css";
// Bicubic Interpolation
const bicubicInterpolation = (src, width, height, scaleFactor) => {
  const newWidth = Math.floor(width * scaleFactor);
  const newHeight = Math.floor(height * scaleFactor);
  const newImageData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const cubic = (x) => {
    x = Math.abs(x);
    if (x <= 1) return (1.5 * x - 2.5) * x * x + 1;
    if (x < 2) return ((-0.5 * x + 2.5) * x - 4) * x + 2;
    return 0;
  };

  const getPixel = (x, y, c) => {
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    return src[(y * width + x) * 4 + c];
  };

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x / scaleFactor;
      const srcY = y / scaleFactor;
      const ix = Math.floor(srcX);
      const iy = Math.floor(srcY);

      const idx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        let sum = 0;
        let weightSum = 0;

        // 4x4 komşuluk (bicubic)
        for (let m = -1; m <= 2; m++) {
          for (let n = -1; n <= 2; n++) {
            const px = ix + n;
            const py = iy + m;
            const weight = cubic(srcX - px) * cubic(srcY - py);
            const value = getPixel(px, py, c);
            sum += value * weight;
            weightSum += weight;
          }
        }
        newImageData[idx + c] = Math.min(255, Math.max(0, sum / weightSum));
      }
    }
  }

  return newImageData;
};

// Nearest Neighbor Interpolation
const nearestNeighborInterpolation = (src, width, height, scaleFactor) => {
  const newWidth = Math.floor(width * scaleFactor);
  const newHeight = Math.floor(height * scaleFactor);
  const newImageData = new Array(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.floor(x / scaleFactor);
      const srcY = Math.floor(y / scaleFactor);

      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        newImageData[dstIdx + c] = src[srcIdx + c];
      }
    }
  }

  return newImageData;
};

// Average Interpolation
const averageInterpolation = (src, width, height, scaleFactor) => {
  const newWidth = Math.floor(width * scaleFactor);
  const newHeight = Math.floor(height * scaleFactor);
  const newImageData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const getPixel = (x, y, c) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return src[(y * width + x) * 4 + c];
  };

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x / scaleFactor;
      const srcY = y / scaleFactor;

      const ix = Math.floor(srcX);
      const iy = Math.floor(srcY);

      const neighbors = [
        [ix - 1, iy - 1],
        [ix, iy - 1],
        [ix + 1, iy - 1],
        [ix - 1, iy],
        [ix, iy],
        [ix + 1, iy],
        [ix - 1, iy + 1],
        [ix, iy + 1],
        [ix + 1, iy + 1],
      ];

      let sum = [0, 0, 0, 0];
      let count = 0;

      neighbors.forEach(([nx, ny]) => {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4;
          for (let c = 0; c < 4; c++) {
            sum[c] += src[idx + c];
          }
          count++;
        }
      });

      const avgPixel = sum.map((val) => Math.floor(val / count));
      const dstIdx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        newImageData[dstIdx + c] = avgPixel[c];
      }
    }
  }

  return newImageData;
};
const bilinearInterpolation = (src, width, height, scaleFactor) => {
  const newWidth = Math.floor(width * scaleFactor);
  const newHeight = Math.floor(height * scaleFactor);
  const newImageData = new Uint8ClampedArray(newWidth * newHeight * 4);

  const getPixel = (x, y, c) => {
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    return src[(y * width + x) * 4 + c];
  };

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x / scaleFactor;
      const srcY = y / scaleFactor;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);

      const dx = srcX - x0;
      const dy = srcY - y0;

      const idx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const p00 = getPixel(x0, y0, c);
        const p10 = getPixel(x1, y0, c);
        const p01 = getPixel(x0, y1, c);
        const p11 = getPixel(x1, y1, c);

        const value =
          p00 * (1 - dx) * (1 - dy) +
          p10 * dx * (1 - dy) +
          p01 * (1 - dx) * dy +
          p11 * dx * dy;

        newImageData[idx + c] = Math.min(255, Math.max(0, value));
      }
    }
  }

  return newImageData;
};

// Döndürme
const handleRotation = (imageSrc, angle, setImageSrc) => {
  const img = new Image();
  img.src = imageSrc;

  img.onload = () => {
    const { width, height } = img;
    const radians = (angle * Math.PI) / 180;
    const newWidth =
      Math.abs(Math.floor(width * Math.cos(radians))) +
      Math.abs(Math.floor(height * Math.sin(radians)));
    const newHeight =
      Math.abs(Math.floor(width * Math.sin(radians))) +
      Math.abs(Math.floor(height * Math.cos(radians)));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -width / 2, -height / 2);

    const rotatedImage = canvas.toDataURL();
    setImageSrc(rotatedImage);
  };
};

function ImageResizer() {
  const [imageSrc, setImageSrc] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [factor, setFactor] = useState(2);
  const [scale, setScale] = useState(1); // Başlangıçta 1
  const [angle, setAngle] = useState(0);
  const [interpolationMethod, setInterpolationMethod] = useState("bicubic");

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
        setOriginalImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    if (originalImage) {
      setImageSrc(originalImage);
      setScale(1); // Reset zoom scale
    }
  };

  const handleResize = (isShrink = false) => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const { width, height } = img;

      // Canvas boyutlarını ayarla
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Canvas boyutlarını resmi tam olarak sığacak şekilde ayarla
      canvas.width = width;
      canvas.height = height;

      // Resmi canvas üzerine çiz
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imageData = ctx.getImageData(0, 0, width, height); // Pikselleri al
        const srcPixels = Array.from(imageData.data); // Veriyi piksellere ayır

        // Eğer küçültme işlemi yapılacaksa, factor tersine çevrilir
        let scaleFactor = isShrink ? 1 / factor : factor;

        // Yeni boyutları hesapla (kesinlikle sıfırdan büyük olmalı)
        const newWidth = Math.max(1, Math.floor(width * scaleFactor));
        const newHeight = Math.max(1, Math.floor(height * scaleFactor));

        // Yeniden boyutlandırma işlemi
        let resizedPixels;
        if (interpolationMethod === "bicubic") {
          resizedPixels = isShrink
            ? nearestNeighborInterpolation(
                srcPixels,
                width,
                height,
                scaleFactor
              )
            : bicubicInterpolation(srcPixels, width, height, scaleFactor);
        } else if (interpolationMethod === "average") {
          resizedPixels = averageInterpolation(
            srcPixels,
            width,
            height,
            scaleFactor
          );
        } else if (interpolationMethod === "bilinear") {
          resizedPixels = bilinearInterpolation(
            srcPixels,
            width,
            height,
            scaleFactor
          );
        } else {
          resizedPixels = nearestNeighborInterpolation(
            srcPixels,
            width,
            height,
            scaleFactor
          );
        }

        // Yeni canvas oluştur
        const resizedCanvas = document.createElement("canvas");
        const resizedCtx = resizedCanvas.getContext("2d");
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;

        const resizedImageData = new ImageData(
          new Uint8ClampedArray(resizedPixels),
          newWidth,
          newHeight
        );
        resizedCtx.putImageData(resizedImageData, 0, 0);

        // Yeni görüntü verisi
        const resizedImage = resizedCanvas.toDataURL();
        setImageSrc(resizedImage); // Burada imageSrc'i güncelliyoruz
      } catch (error) {
        console.error("Error in getting image data:", error);
      }
    };
  };

  const applyZoom = (newScale) => {
    const img = new Image();
    img.src = originalImage;

    img.onload = () => {
      const width = img.width;
      const height = img.height;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      const viewWidth = width / newScale;
      const viewHeight = height / newScale;

      const cropX = (width - viewWidth) / 2;
      const cropY = (height - viewHeight) / 2;

      ctx.drawImage(
        img,
        cropX,
        cropY,
        viewWidth,
        viewHeight,
        0,
        0,
        width,
        height
      );

      setImageSrc(canvas.toDataURL());
    };
  };

  const handleZoomIn = () => {
    const newScale = scale * factor;
    setScale(newScale);
    applyZoom(newScale);
  };

  // Zoom Out
  const handleZoomOut = () => {
    const newScale = scale / factor;
    setScale(newScale);
    applyZoom(newScale);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 p-10">
        <h2 className="text-3xl font-semibold text-white mb-5">
          Görüntü İşleme Aracı
        </h2>

        <Input
          type="file"
          onChange={handleImageChange}
          style={{
            marginBottom: 40,
            borderRadius: "8px",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
          }}
        />

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Select
            value={interpolationMethod}
            onChange={setInterpolationMethod}
            className="w-40"
          >
            <Select.Option value="bicubic">Bicubic</Select.Option>
            <Select.Option value="average">Average</Select.Option>
            <Select.Option value="bilinear">Bilinear</Select.Option>
            <Select.Option value="nearest">Nearest Neighbor</Select.Option>
          </Select>

          <Button
            onClick={() => handleResize(false)}
            size="large"
            className="rounded-xl"
          >
            Görüntüyü Büyüt
          </Button>
          <Button
            onClick={() => handleResize(true)}
            size="large"
            className="rounded-xl"
          >
            Görüntüyü Küçült
          </Button>
          <Button onClick={handleZoomIn} size="large" className="rounded-xl">
            Zoom In
          </Button>
          <Button onClick={handleZoomOut} size="large" className="rounded-xl">
            Zoom Out
          </Button>
          <Button
            onClick={() => handleRotation(imageSrc, angle, setImageSrc)}
            size="large"
            className="rounded-xl"
          >
            Görüntüyü Döndür
          </Button>
          <Button
            type="primary"
            onClick={handleReset}
            size="large"
            className="rounded-xl text-white"
          >
            Resmi Sıfırla
          </Button>
        </div>

        <div className="border-t border-white w-full max-w-4xl mb-6"></div>

        <div className="flex items-center gap-4 mb-5">
          <span className="font-semibold text-white">
            Büyüme/küçülme oranı:
          </span>
          <Input
            type="number"
            value={factor}
            onChange={(e) => setFactor(Number(e.target.value))}
            min="0.1"
            step="0.1"
            className="w-28 bg-white border border-gray-300"
          />
        </div>

        <div className="flex items-center gap-4 mb-5">
          <span className="font-semibold text-white">Döndürme Derecesi:</span>
          <Input
            type="number"
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="w-28 bg-white border border-gray-300"
          />
        </div>

        {imageSrc && (
          <div className="mt-5">
            <img
              src={imageSrc}
              alt="Preview"
              className="max-w-[80%] max-h-[80vh] object-contain mt-5"
            />
          </div>
        )}
      </div>
    </>
  );
}

export default ImageResizer;
