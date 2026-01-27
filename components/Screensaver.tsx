import React, { useEffect, useState } from "react";
import { generateSlogan } from "../services/geminiService";

interface ScreensaverProps {
  onWake: () => void;
  isActive: boolean;
  backgroundImage?: string;
}

const Screensaver: React.FC<ScreensaverProps> = ({
  onWake,
  isActive,
  backgroundImage,
}) => {
  const [time, setTime] = useState(new Date());
  const [slogan, setSlogan] = useState(
    "Le sport pour tous, l'excellence pour chacun.",
  );
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const clockTimer = setInterval(() => setTime(new Date()), 1000);
    let sloganTimer: ReturnType<typeof setInterval>;

    if (isActive) {
      generateSlogan().then(setSlogan);
      sloganTimer = setInterval(() => {
        generateSlogan().then(setSlogan);
      }, 15000); // Faster rotation for slogans
      setTimeout(() => setOpacity(1), 100);
    } else {
      setOpacity(0);
    }

    return () => {
      clearInterval(clockTimer);
      if (sloganTimer) clearInterval(sloganTimer);
    };
  }, [isActive]);

  if (!isActive) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Blue Color Constants
  const ACCENT_BLUE = "#0047BB";
  const TEXT_BLUE = "#3B82F6"; // Lighter blue for text readability on dark background

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onWake();
      }}
      className={`fixed inset-0 z-50 bg-[#111] text-white flex flex-col justify-between p-8 md:p-12 transition-opacity duration-1000 ease-in-out cursor-pointer overflow-hidden`}
      style={{ opacity: opacity }}
    >
      {/* Dynamic Sports Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={
            backgroundImage ||
            "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop"
          }
          alt="Sports Background"
          className="w-full h-full object-cover opacity-40 grayscale contrast-125 scale-105 animate-[pulse_10s_ease-in-out_infinite]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#111] via-transparent to-[#111]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
      </div>

      {/* Top Section: Logo & Date */}
      <div className="relative z-10 flex flex-col items-center pt-20 md:pt-32">
        <div className="w-48 md:w-64 mb-8 flex items-center justify-center">
          <img
            src="https://upload.wikimedia.org/wikipedia/fr/thumb/c/cc/Logo_R%C3%A9gion_Grand_Est_-_2022.svg/langfr-250px-Logo_R%C3%A9gion_Grand_Est_-_2022.svg.png"
            alt="Région Grand Est"
            className="w-full h-auto drop-shadow-2xl"
          />
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none mb-6 text-white font-sport italic text-center drop-shadow-lg">
          Bienvenue à la
          <br />
          Maison des Sports
        </h1>
      </div>

      {/* Middle Section: Clock & Slogan */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow py-8">
        {/* Reduced Clock Size */}
        <div className="text-[15vw] md:text-[12vw] font-black tracking-tighter font-sport text-white drop-shadow-2xl leading-[0.85] select-none">
          {formatTime(time)}
        </div>

        {/* Reduced Date Size with Blue Accent */}
        <div
          className="text-3xl md:text-4xl font-black uppercase tracking-widest mb-10"
          style={{ color: TEXT_BLUE }}
        >
          {formatDate(time)}
        </div>

        <div className="w-full max-w-4xl text-center px-4">
          {/* Blue Separators */}
          <div
            className="w-32 h-4 mx-auto mb-8 transform -skew-x-12"
            style={{ backgroundColor: ACCENT_BLUE }}
          ></div>

          <blockquote className="text-2xl md:text-4xl font-black uppercase font-sport italic leading-tight text-white drop-shadow-2xl">
            {slogan}
          </blockquote>

          <div
            className="w-32 h-4 mx-auto mt-8 transform -skew-x-12"
            style={{ backgroundColor: ACCENT_BLUE }}
          ></div>
        </div>
      </div>

      {/* Bottom Section: Call to Action Only */}
      <div className="relative z-10 flex flex-col items-center pb-8">
        {/* Touch CTA */}
        <div className="mt-4 flex flex-col items-center animate-bounce">
          <span className="text-white font-bold uppercase tracking-[0.2em] text-lg md:text-xl mb-6 shadow-black drop-shadow-lg">
            Toucher pour commencer
          </span>
          <div className="w-20 h-20 rounded-full border-[4px] border-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] bg-black/30 backdrop-blur-sm">
            {/* Blue Accent on Center Dot */}
            <div
              className="w-8 h-8 rounded-full shadow-[0_0_20px]"
              style={{
                backgroundColor: ACCENT_BLUE,
                boxShadow: `0 0 20px ${ACCENT_BLUE}`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Screensaver;
