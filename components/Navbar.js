'use client';

import Link from 'next/link';
import { useState } from 'react';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <nav className="bg-gradient-to-r from-purple-700 to-indigo-600 shadow-xl p-4">
      <div className="container mx-auto flex justify-between items-center">
        <ul className="flex space-x-6 text-white font-semibold text-lg">
          <li>
            <Link href="/" className="hover:text-gray-300 transition duration-300">
              Ana Sayfa
            </Link>
          </li>
          <li className="relative">
            <button
              onClick={toggleDropdown}
              className="hover:text-gray-300 transition duration-300 cursor-pointer focus:outline-none"
            >
              Ödevler
            </button>
            <ul
              className={`absolute left-0 mt-2 w-48 bg-white text-gray-800 shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${
                isDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <li>
                <Link
                  href="/odev1"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Ödev 1
                </Link>
              </li>
              <li>
                <Link
                  href="/odev2"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Ödev 2
                </Link>
              </li>
                <li>
                <Link
                  href="/final-yol"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Final-Çizgi tespiti
                </Link>
              </li>
              <li>
                <Link
                  href="/final-goz"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Final-Göz tespiti
                </Link>
              </li>
               <li>
                <Link
                  href="/final-debluring"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Final-Debluring
                </Link>
              </li>
               <li>
                <Link
                  href="/final-object-detection"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Final-Object Detection
                </Link>
              </li>
                <li>
                <Link
                  href="/final-s-curve"
                  className="block px-4 py-2 hover:bg-indigo-100 transition"
                >
                  Final-S Curve
                </Link>
              </li>             
            </ul>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
