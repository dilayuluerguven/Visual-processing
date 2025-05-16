"use client";
import { useRef, useState } from 'react';
import Navbar from '../../../components/Navbar';

export default function ContrastEnhancer() {
    const canvasRef = useRef(null);
    const originalImageDataRef = useRef(null);
    const [selectedFunc, setSelectedFunc] = useState('standard');
    const [imageUploaded, setImageUploaded] = useState(false);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                originalImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
                setImageUploaded(true);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const applyContrast = () => {
        if (!imageUploaded) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const sigmoidFuncs = {
            standard: (x) => 1 / (1 + Math.exp(-x)),
            shifted: (x) => 1 / (1 + Math.exp(-(x - 0.5) * 10)),
            sloped: (x) => 1 / (1 + Math.exp(-x * 5)),
            custom: (x) => (1 / (1 + Math.exp(-(x - 0.5) * 10))) * (1 / (1 + Math.exp(-(x + 0.5) * 10)))
        };

        const newImageData = applySCurve(imageData, sigmoidFuncs[selectedFunc]);
        ctx.putImageData(newImageData, 0, 0);
    };

    const resetImage = () => {
        if (originalImageDataRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(originalImageDataRef.current, 0, 0);
        }
    };

    return (
      <>
      <Navbar/>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Görüntü Kontrast İyileştirme</h1>
                
                <div className="space-y-6">
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Resim yükle</span> veya sürükle bırak
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, JPEG (Max. 5MB)</p>
                            </div>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="hidden" 
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sigmoid Fonksiyonu</label>
                            <select 
                                value={selectedFunc} 
                                onChange={(e) => setSelectedFunc(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="standard">Standart Sigmoid</option>
                                <option value="shifted">Yatay Kaydırılmış</option>
                                <option value="sloped">Eğimli Sigmoid</option>
                                <option value="custom">Özel Fonksiyon</option>
                            </select>
                        </div>
                        
                        <div className="flex items-end space-x-3">
                            <button
                                onClick={applyContrast}
                                disabled={!imageUploaded}
                                className={`px-4 py-2 rounded-md text-white font-medium ${imageUploaded ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-300 cursor-not-allowed'}`}
                            >
                                Uygula
                            </button>
                            <button
                                onClick={resetImage}
                                disabled={!imageUploaded}
                                className={`px-4 py-2 rounded-md font-medium ${imageUploaded ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                Sıfırla
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <canvas 
                            ref={canvasRef} 
                            className="w-full h-auto max-h-[500px] object-contain bg-gray-100"
                            style={{ display: imageUploaded ? 'block' : 'none' }}
                        />
                        {!imageUploaded && (
                            <div className="flex items-center justify-center h-64 bg-gray-100 text-gray-500">
                                <p>Yüklenen görüntü burada görünecek</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div> 
        </>
    );
   
}

function applySCurve(imageData, sigmoidFunc) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            const normalized = data[i + j] / 255;
            const transformed = sigmoidFunc(normalized);
            data[i + j] = transformed * 255;
        }
    }
    return imageData;
}