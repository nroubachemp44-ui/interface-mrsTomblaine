
import { ContentType, SportsEvent, ImageConfig, Room, League, Booking, PresentationContent, RentalConfig } from "../types";
import { dbService } from "./db";

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
export const preloadAllData = async () => {
  await dbService.init();
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

// --- CRUD WRAPPERS ---

// Agenda
export const getAgenda = async (): Promise<SportsEvent[]> => await dbService.getAll('agenda');
export const setAgenda = async (data: SportsEvent[]) => {
  for (const item of data) await dbService.put('agenda', item);
};
export const addAgendaItem = async (item: SportsEvent) => await dbService.put('agenda', item);
export const deleteAgendaItem = async (id: string) => await dbService.delete('agenda', id);


// Leagues
export const getLeagues = async (): Promise<League[]> => await dbService.getAll('leagues');
export const setLeagues = async (data: League[]) => { for (const i of data) await dbService.put('leagues', i); };
export const addLeagueItem = async (item: League) => await dbService.put('leagues', item);
export const deleteLeagueItem = async (id: string) => await dbService.delete('leagues', id);

// Rooms
export const getRooms = async (): Promise<Room[]> => await dbService.getAll('rooms');
export const setRooms = async (data: Room[]) => { for (const i of data) await dbService.put('rooms', i); };
export const addRoomItem = async (item: Room) => await dbService.put('rooms', item);
export const deleteRoomItem = async (id: string) => await dbService.delete('rooms', id);

// Admin Bookings
export const getBookings = async (): Promise<Booking[]> => await dbService.getAll('bookings');
export const updateBooking = async (item: Booking) => await dbService.put('bookings', item);


// --- MAIN FETCH ---

export const fetchSportsData = async (type: ContentType, query: string = ""): Promise<any> => {
  // Implicitly ensures DB is open via getStore calls inside getAll

  switch (type) {
    case ContentType.AGENDA: return await getAgenda();
    case ContentType.LEAGUES: return await getLeagues();
    case ContentType.RENTAL: return await getRooms();
    case ContentType.ADMIN: return await getBookings();
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