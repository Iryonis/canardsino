"use client";

import Image from "next/image";
import Link from "next/link";

export default function GamesCard({
  name,
  img,
  price,
  mode,
  url,
}: {
  name: string;
  img: string;
  price: number;
  mode: string;
  url: string;
}) {
  return (
    <Link
      href={url}
      aria-disabled={mode === "/" ? true : false}
      tabIndex={mode === "/" ? -1 : 0}
      className={`max-w-1/3 max-h-1/10 flex flex-col transition-transform duration-200 ${
        mode === "/"
          ? "cursor-not-allowed pointer-events-none"
          : "hover:scale-95 active:scale-90"
      }`}
    >
      <div className="bg-white/5 border-beige rounded border-2 shadow-lg shadow-black/50">
        <div className="flex justify-center items-center bg-beige/5 border-b-2 border-beige overflow-hidden">
          {!img ? (
            <div className="w-full min-h-60 flex items-center justify-center animate-pulse bg-beige/20">
              <svg
                className="w-10 h-10 text-gray-200 dark:text-gray-600"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 18"
              >
                <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
              </svg>
            </div>
          ) : (
            <Image
              src={img}
              aria-label="'An image representing the project, click on it to open the project website.'"
              alt="Game Image"
              width={300}
              height={300}
            />
          )}
        </div>

        <div className="p-4 flex flex-row mr-8 justify-between w-full">
          <div className="text-xl sm:text-2xl font-bold text-white items-center flex text-nowrap">
            {name}
          </div>
          <div className="justify-center py-4 flex flex-col 2xl:flex-row gap-1 text-center items-stretch">
            <span
              className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg w-full lg:w-auto flex items-center justify-center"
              title="Language of the project"
            >
              {mode}
            </span>
            <span
              className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-lg w-full lg:w-auto flex items-center justify-center"
              title="Accessibility of the project"
            >
              {price} coins
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
