
"use client";
import Navbar from "../../components/Navbar";

export default function Home() {
  return (
    <div>
      <Navbar />
      <div className="h-screen flex">
        <div className="w-1/2 flex justify-center items-center">
          <img
            src="https://www.sinapstek.com/upload/images/vizyon.jpg"
            alt="Vizyon"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-1/2 flex flex-col justify-center items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 select-none">
          <div
            className="bg-white text-gray-900 rounded-2xl shadow-2xl p-12 w-[90%] max-w-lg text-center 
                      hover:scale-105 transition-transform duration-300 ease-in-out"
          >
            <h1 className="text-5xl font-extrabold mb-4 text-pink-600">
              Dijital Görüntü İşleme Dersi
            </h1>
            <p className="text-xl font-medium mb-2">Öğrenci Numarası:</p>
            <p className="text-2xl font-bold text-gray-700">221229034</p>
            <p className="text-xl font-medium mt-4 mb-2">Adı Soyadı:</p>
            <p className="text-2xl font-bold text-gray-700">Dilay Uluergüven</p>
          </div>
        </div>
      </div>
    </div>
  );
}
