
import { ContentType, SportsEvent, ImageConfig, Room, League, Booking, PresentationContent, RentalConfig } from "../types";
import { dbService } from "./db";

// Keep images in memory to prevent reloading delay
const imageCache: HTMLImageElement[] = [];

export const preloadImageAssets = async () => {
  try {
    // Fetch all data in parallel to collect URLs
    const [imageConfig, pres, rooms, agenda, rental] = await Promise.all([
      fetchImages(),
      fetchPresentationData(),
      getRooms(),
      getAgenda(),
      fetchRentalConfig()
    ]);

    const images: string[] = [];

    // 1. Global Image Config
    if (imageConfig.screensaver) images.push(imageConfig.screensaver);
    Object.values(imageConfig.dashboard).forEach(url => images.push(url));

    // 2. Presentation Images
    if (pres.heroImage) images.push(pres.heroImage);

    // 3. Room Images
    rooms.forEach(r => {
      if (r.image) images.push(r.image);
    });

    // 4. Agenda Images
    agenda.forEach(a => {
      if (a.image) images.push(a.image);
    });

    // 5. Rental QR Code
    if (rental.qrCodeImage) images.push(rental.qrCodeImage);

    // Preload each unique image
    const uniqueImages = [...new Set(images.filter(Boolean))];
    console.log(`Preloading ${uniqueImages.length} images...`);

    uniqueImages.forEach(url => {
      const img = new Image();
      img.src = url;
      imageCache.push(img);
    });
  } catch (error) {
    console.error("Failed to preload images:", error);
  }
};

// --- SERVICE FUNCTIONS ---

const SLOGANS = [
  "L'excellence sportive au cœur du Grand Est.",
  "Ensemble, faisons vibrer le sport.",
  "La passion du sport, l'esprit d'équipe.",
  "Performance, Formation, Convivialité.",
  "Au service de tous les sportifs.",
  "Le carrefour des champions de demain.",
  "Plus vite, plus haut, plus fort - ensemble.",
  "Un territoire, une passion : le sport.",
  "L'inclusion par le sport, notre priorité.",
  "Vivre le sport intensément."
];

let sloganIndex = 0;

export const generateSlogan = async (): Promise<string> => {
  const slogan = SLOGANS[sloganIndex];
  sloganIndex = (sloganIndex + 1) % SLOGANS.length;
  return Promise.resolve(slogan);
};

// --- DB INIT ---
export const preloadAllData = async (force = false) => {
  await dbService.init(force);
};

// --- DATA ACCESSORS (Async Wrappers) ---

export const fetchImages = async (): Promise<ImageConfig> => {
  return await dbService.getImageConfig();
};

export const updateImages = async (newImages: ImageConfig) => {
  await dbService.setImageConfig(newImages);
};

export const fetchPresentationData = async (): Promise<PresentationContent> => {
  return await dbService.getPresentationData();
};

export const updatePresentationData = async (data: PresentationContent) => {
  await dbService.setPresentationData(data);
};

export const fetchRentalConfig = async (): Promise<RentalConfig> => {
  return await dbService.getRentalConfig();
};

export const updateRentalConfig = async (data: RentalConfig) => {
  await dbService.setRentalConfig(data);
};

export const fetchAdminPin = async (): Promise<string> => {
  return await dbService.getAdminPin();
};

export const updateAdminPin = async (pin: string) => {
  await dbService.setAdminPin(pin);
};

export const fetchDbVersion = async (): Promise<number> => {
  try {
    const res = await fetch('/api/db/version');
    const data = await res.json();
    return data.version || 0;
  } catch (e) {
    return 0;
  }
};

// --- CRUD WRAPPERS ---

// Agenda
export const getAgenda = async (): Promise<SportsEvent[]> => await dbService.getAll('agenda');
export const addAgendaItem = async (item: SportsEvent) => await dbService.put('agenda', item);
export const deleteAgendaItem = async (id: string) => await dbService.delete('agenda', id);


// Leagues
export const getLeagues = async (): Promise<League[]> => await dbService.getAll('leagues');
export const addLeagueItem = async (item: League) => await dbService.put('leagues', item);
export const deleteLeagueItem = async (id: string) => await dbService.delete('leagues', id);

// Rooms
export const getRooms = async (): Promise<Room[]> => await dbService.getAll('rooms');
export const addRoomItem = async (item: Room) => await dbService.put('rooms', item);
export const deleteRoomItem = async (id: string) => await dbService.delete('rooms', id);




// --- MAIN FETCH ---

export const fetchSportsData = async (type: ContentType, query: string = ""): Promise<any> => {
  // Implicitly ensures DB is open via getStore calls inside getAll

  switch (type) {
    case ContentType.AGENDA: return await getAgenda();
    case ContentType.LEAGUES: return await getLeagues();
    case ContentType.RENTAL: return await getRooms();
    case ContentType.ADMIN: return [];
    case ContentType.PRESENTATION: return await fetchPresentationData();

    case ContentType.SEARCH:
      if (!query) return [];
      const lowerQuery = query.toLowerCase();
      const agenda = await getAgenda();
      const leagues = await getLeagues();

      const agendaResults = agenda.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.location.toLowerCase().includes(lowerQuery)
      ).map(item => ({ ...item, description: `Événement à ${item.location} - ${item.date}` }));

      const leagueResults = leagues.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery)
      );

      return [...agendaResults, ...leagueResults];

    default:
      return [];
  }
};