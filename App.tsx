import React, { useState, useEffect, useRef } from "react";
import {
  Info,
  Trophy,
  Search,
  CalendarDays,
  Accessibility,
  Mic,
  Moon,
  Building,
  Lock,
  Activity,
  ArrowRight,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Screensaver from "./components/Screensaver";
import ContentModal from "./components/ContentModal";
import { AppMode, ContentType, DashboardItem, ImageConfig } from "./types";
import {
  preloadAllData,
  fetchSportsData,
  fetchImages,
  fetchDbVersion,
  preloadImageAssets,
} from "./services/geminiService";

// Constants
const INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds
const GRAND_EST_BLUE = "#0047BB";

const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    id: ContentType.PRESENTATION,
    title: "Présentation",
    iconName: "Info",
    description: "Découvrir la Maison",
  },
  {
    id: ContentType.LEAGUES,
    title: "Ligues",
    iconName: "Trophy",
    description: "Annuaire des ligues",
  },
  {
    id: ContentType.AGENDA,
    title: "Agenda",
    iconName: "CalendarDays",
    description: "Événements à venir",
  },
  {
    id: ContentType.RENTAL,
    title: "Salles",
    iconName: "Building",
    description: "Réserver un espace",
  },
];

// Helper to parse dates stored as "12 Octobre 2024"
const parseFrenchDate = (dateStr: string): Date | null => {
  const months: { [key: string]: number } = {
    Janvier: 0,
    Février: 1,
    Mars: 2,
    Avril: 3,
    Mai: 4,
    Juin: 5,
    Juillet: 6,
    Août: 7,
    Septembre: 8,
    Octobre: 9,
    Novembre: 10,
    Décembre: 11,
    janvier: 0,
    février: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    août: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    décembre: 11,
  };

  // Clean string and split
  const parts = dateStr.trim().split(" ");
  // Expect ["12", "Octobre", "2024"] or ["12/10/2024"]

  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.STANDARD);
  const [activeContent, setActiveContent] = useState<ContentType>(
    ContentType.NONE,
  );
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  // Image State (Loaded from Service)
  const [images, setImages] = useState<ImageConfig | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Version tracking for auto-refresh
  const [dbVersion, setDbVersion] = useState<number>(0);

  // Inactivity Logic
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initData = async () => {
      await preloadAllData();
      const version = await fetchDbVersion();
      setDbVersion(version);
      await refreshData();
      await preloadImageAssets(); // Cache images in memory
    };
    initData();
  }, []);

  const refreshData = async () => {
    setImages(await fetchImages());
    // Refresh events for the widget
    const events = await fetchSportsData(ContentType.AGENDA);
    setUpcomingEvents(events || []);
    await preloadImageAssets(); // Ensure new images are also cached
  };

  const resetInactivityTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isScreensaverActive) return;

    timerRef.current = setTimeout(() => {
      setIsScreensaverActive(true);
      setActiveContent(ContentType.NONE);
    }, INACTIVITY_TIMEOUT_MS);
  };

  const handleUserActivity = () => {
    resetInactivityTimer();
  };

  const wakeScreensaver = () => {
    setIsScreensaverActive(false);
    resetInactivityTimer();
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    resetInactivityTimer();

    // Polling for remote updates (every 5 seconds)
    const interval = setInterval(async () => {
      const newVersion = await fetchDbVersion();
      if (newVersion !== 0 && dbVersion !== 0 && newVersion !== dbVersion) {
        console.log("Remote update detected, refreshing data...");
        setDbVersion(newVersion);
        await preloadAllData(true); // Force reload from server
        await refreshData();
      } else if (dbVersion === 0) {
        setDbVersion(newVersion);
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [activeContent, isScreensaverActive, dbVersion]);

  // --- CALENDAR LOGIC ---

  const changeMonth = (offset: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    return { daysInMonth, startOffset };
  };

  const { daysInMonth, startOffset } = getDaysInMonth(currentDate);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startOffset }, (_, i) => i);
  const today = new Date();

  // Filter events for the currently displayed month only
  const eventsForCurrentMonth = upcomingEvents.filter((evt) => {
    const d = parseFrenchDate(evt.date);
    return (
      d &&
      d.getMonth() === currentDate.getMonth() &&
      d.getFullYear() === currentDate.getFullYear()
    );
  });

  const hasEvent = (day: number) => {
    return eventsForCurrentMonth.some((evt) => {
      const d = parseFrenchDate(evt.date);
      return d && d.getDate() === day;
    });
  };

  // --- RENDER HELPERS ---

  const getIcon = (name: string, size: number) => {
    switch (name) {
      case "Info":
        return <Info size={size} />;
      case "Trophy":
        return <Trophy size={size} />;
      case "Search":
        return <Search size={size} />;
      case "CalendarDays":
        return <CalendarDays size={size} />;
      case "Building":
        return <Building size={size} />;
      default:
        return <Info size={size} />;
    }
  };

  const getGridClass = (id: ContentType) => {
    switch (id) {
      case ContentType.PRESENTATION:
        return "md:col-start-1 md:row-start-1 md:row-span-2";
      case ContentType.LEAGUES:
        return "md:col-start-1 md:row-start-3 md:row-span-1";
      case ContentType.AGENDA:
        return "md:col-start-2 md:row-start-1 md:row-span-3";
      case ContentType.RENTAL:
        return "md:col-start-1 md:row-start-4 md:col-span-2";
      default:
        return "md:col-span-1 md:row-span-1";
    }
  };

  const isHandicap = mode === AppMode.HANDICAP;

  if (!images) return <div className="h-screen w-screen bg-[#0047BB]"></div>;

  return (
    <div
      className={`h-screen w-screen relative overflow-hidden transition-colors duration-500 ${isHandicap ? "bg-white text-black" : "bg-[#0047BB] text-white"}`}
    >
      {!isHandicap && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src="https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2069&auto=format&fit=crop"
            alt="Background"
            className="w-full h-full object-cover opacity-10 grayscale mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0047BB] via-[#003399] to-[#001a4d] opacity-95"></div>
          <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-20"></div>
        </div>
      )}

      <Screensaver
        isActive={isScreensaverActive}
        onWake={wakeScreensaver}
        backgroundImage={images.screensaver}
      />

      <main
        className={`h-full flex flex-col relative z-10 ${isScreensaverActive ? "opacity-0" : "opacity-100"} transition-all duration-700`}
      >
        <header
          className={`
           flex flex-col items-center justify-center flex-shrink-0 transition-all duration-500
           ${isHandicap ? "h-[45vh] justify-center scale-110" : "mb-6 p-8"}
        `}
        >
          <div
            className={`flex items-center justify-center transition-all ${isHandicap ? "h-48 mb-8" : "h-32 mb-4"}`}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/fr/thumb/c/cc/Logo_R%C3%A9gion_Grand_Est_-_2022.svg/langfr-250px-Logo_R%C3%A9gion_Grand_Est_-_2022.svg.png"
              alt="Région Grand Est"
              className="h-full object-contain filter drop-shadow-lg"
            />
          </div>

          <div className="text-center">
            <h1
              className={`font-sport font-black uppercase tracking-tight leading-none mb-2 ${isHandicap ? "text-7xl text-black" : "text-6xl text-white"}`}
            >
              Maison Régionale
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div
                className={`h-1 w-8 ${isHandicap ? "bg-black h-2" : "bg-white"}`}
              ></div>
              <p
                className={`font-sport font-bold uppercase tracking-[0.2em] ${isHandicap ? "text-3xl text-black" : "text-xl text-neutral-200"}`}
              >
                des Sports • Tomblaine
              </p>
              <div
                className={`h-1 w-8 ${isHandicap ? "bg-black h-2" : "bg-white"}`}
              ></div>
            </div>
          </div>
        </header>

        <div
          className={`
           flex-grow w-full mx-auto transition-all duration-500
           ${isHandicap
              ? "flex flex-col justify-end px-6 pb-6 h-[55vh]"
              : "flex flex-col justify-center px-4 pb-4 overflow-hidden"
            }
        `}
        >
          {isHandicap && (
            <div className="flex gap-6 mb-6 h-[15%]">
              <button
                onClick={() => setMode(AppMode.STANDARD)}
                className="flex-1 bg-yellow-400 text-black border-4 border-black rounded-2xl flex items-center justify-center gap-4 font-black text-2xl uppercase shadow-lg hover:scale-[1.02] transition-transform"
              >
                <Accessibility size={36} />
                Quitter Mode Accessible
              </button>
            </div>
          )}

          <div
            className={`
              w-full
              ${isHandicap
                ? "grid grid-cols-2 grid-rows-2 gap-6 h-[85%]"
                : "grid gap-6 h-full max-w-7xl mx-auto grid-cols-1 md:grid-cols-2 md:grid-rows-4 auto-cols-fr"
              }
           `}
          >
            {DASHBOARD_ITEMS.map((item) => {
              if (item.id === ContentType.AGENDA && !isHandicap) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveContent(item.id)}
                    className={`group relative w-full bg-neutral-900/40 backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden text-left flex flex-col border border-white/10 hover:border-white/30 ${getGridClass(item.id)}`}
                  >
                    <div className="bg-black/20 border-b border-white/10 text-white p-6 flex justify-between items-center flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <CalendarDays size={28} className="text-white" />
                        <span className="font-black uppercase tracking-widest font-sport text-xl text-white">
                          Calendrier
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col p-6 overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center justify-between w-full">
                          <div
                            onClick={(e) => changeMonth(-1, e)}
                            className="p-2 rounded-full hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <ChevronLeft size={24} />
                          </div>
                          <span className="font-black text-2xl uppercase text-white select-none">
                            {currentDate.toLocaleDateString("fr-FR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          <div
                            onClick={(e) => changeMonth(1, e)}
                            className="p-2 rounded-full hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <ChevronRight size={24} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2 text-center mb-4">
                        {["L", "M", "M", "J", "V", "S", "D"].map((d) => (
                          <span
                            key={d}
                            className="text-sm font-bold text-neutral-300"
                          >
                            {d}
                          </span>
                        ))}
                        {emptyDays.map((d) => (
                          <div key={`empty-${d}`} />
                        ))}
                        {calendarDays.map((day) => {
                          const isToday =
                            day === today.getDate() &&
                            currentDate.getMonth() === today.getMonth() &&
                            currentDate.getFullYear() === today.getFullYear();
                          const isEvent = hasEvent(day);
                          return (
                            <div
                              key={day}
                              className="flex flex-col items-center justify-center h-10 md:h-12 relative group/day"
                            >
                              <span
                                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-lg font-bold transition-all ${isToday ? "bg-white text-[#0047BB]" : isEvent ? "bg-white/20 text-white group-hover/day:bg-[#0047BB]" : "text-neutral-300"}`}
                              >
                                {day}
                              </span>
                              {isEvent && !isToday && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full mt-1"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 overflow-hidden border-t border-white/10 pt-4 flex flex-col">
                        <h5 className="font-bold text-neutral-300 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Clock size={16} /> Événements du mois
                        </h5>
                        <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-hide">
                          {eventsForCurrentMonth.length > 0 ? (
                            eventsForCurrentMonth.map((evt, i) => (
                              <div
                                key={i}
                                className="flex gap-4 p-3 rounded-xl bg-black/20 hover:bg-black/40 transition-colors"
                              >
                                <div className="text-center min-w-[50px]">
                                  <span className="block text-xl font-black text-white">
                                    {evt.date.split(" ")[0]}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white text-md truncate">
                                    {evt.title}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-sm italic">
                              Aucun événement ce mois-ci
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveContent(item.id)}
                  className={`
                    group relative overflow-hidden text-left transition-all duration-300 shadow-md hover:shadow-2xl
                    ${isHandicap
                      ? "bg-white border-8 border-black hover:bg-yellow-300 flex flex-col justify-center items-center p-4 rounded-3xl w-full h-full"
                      : `w-full h-full rounded-3xl hover:scale-[1.02] active:scale-[0.98] bg-neutral-900/40 backdrop-blur-sm border border-white/10 hover:border-white/30 flex flex-col ${getGridClass(item.id)}`
                    }
                  `}
                >
                  {!isHandicap && (
                    <>
                      <div className="absolute inset-0 bg-neutral-900">
                        <img
                          src={images.dashboard[item.id]}
                          alt=""
                          className="w-full h-full object-cover opacity-40 group-hover:opacity-20 transition-opacity grayscale"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#001a4d] via-[#002266]/50 to-transparent"></div>
                      <div className="absolute top-0 left-0 w-full h-2 bg-white transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </>
                  )}

                  <div
                    className={`relative z-10 h-full flex ${isHandicap ? "flex-col items-center justify-center gap-4 text-center" : "p-8 flex-col justify-between items-start"}`}
                  >
                    <div
                      className={`
                            flex items-center justify-center flex-shrink-0
                            ${isHandicap
                          ? "text-black w-24 h-24"
                          : "text-white w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 group-hover:bg-white group-hover:text-[#0047BB] transition-all"
                        }
                        `}
                    >
                      {getIcon(item.iconName, isHandicap ? 72 : 32)}
                    </div>

                    <div className={`${!isHandicap ? "mt-auto" : ""}`}>
                      <h2
                        className={`font-sport font-black uppercase leading-none mb-2 ${isHandicap ? "text-4xl text-black" : "text-4xl text-white"}`}
                      >
                        {item.title}
                      </h2>
                      {!isHandicap && (
                        <div className="flex items-center text-neutral-300 group-hover:text-white transition-colors">
                          <span className="text-lg font-bold uppercase tracking-wider mr-2">
                            {item.description}
                          </span>
                          <ArrowRight
                            size={20}
                            className="transform group-hover:translate-x-1 transition-transform"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!isHandicap && (
          <div
            className={`flex-shrink-0 w-full z-30 transition-all rounded-t-2xl p-4 mt-4 flex justify-between items-center gap-4`}
          >
            <button
              onClick={() => setMode(AppMode.HANDICAP)}
              className={`px-8 py-6 bg-neutral-900/50 text-white hover:bg-neutral-800/80 rounded-2xl uppercase tracking-wider text-xl flex-grow border border-white/10 backdrop-blur-md hover:border-white/30 hover:scale-105 flex items-center justify-center gap-4 font-bold transition-all shadow-lg`}
            >
              <Accessibility size={32} />
              <span>Accessibilité & Handicap</span>
            </button>

            <button
              onClick={() => setActiveContent(ContentType.ADMIN)}
              className="p-6 bg-neutral-900/50 rounded-2xl text-neutral-300 hover:text-white shadow-md transition-colors border border-white/10"
              aria-label="Administration"
            >
              <Lock size={32} />
            </button>
          </div>
        )}
      </main>

      {activeContent !== ContentType.NONE && (
        <ContentModal
          type={activeContent}
          onClose={() => setActiveContent(ContentType.NONE)}
          appMode={mode}
          onConfigurationChange={refreshData}
          version={dbVersion}
        />
      )}
    </div>
  );
};

export default App;
