
export enum AppMode {
  STANDARD = 'STANDARD',
  HANDICAP = 'HANDICAP'
}

export enum ContentType {
  NONE = 'NONE',
  PRESENTATION = 'PRESENTATION',
  LEAGUES = 'LEAGUES',
  SEARCH = 'SEARCH',
  AGENDA = 'AGENDA',
  RENTAL = 'RENTAL',
  ADMIN = 'ADMIN'
}

export interface SportsEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  type: string;
  image?: string; // New image field
  // Latitude and Longitude are deprecated but kept optional for backward compatibility if needed, though hidden in UI
  latitude?: number;
  longitude?: number;
}

export interface League {
  id: string;
  title: string;
  description: string;
  type: string;
  phone?: string;
}

export interface SearchResult {
  title: string;
  description: string;
}

export interface DashboardItem {
  id: ContentType;
  title: string;
  iconName: string; 
  description: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  features: string[];
  description: string;
  image: string; 
  priceHalfDay?: string;
  priceFullDay?: string;
}

export interface RentalConfig {
  qrCodeImage: string;
  headerText: string;
}

export interface Booking {
  id: string;
  organization: string;
  room: string;
  date: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
}

export interface PresentationContent {
  heroImage: string;
  introText: string;
  statAuditorium: string;
  statLeagues: string;
}

// Config for global app images (screensaver, dashboard icons)
export interface ImageConfig {
  screensaver: string;
  dashboard: Record<string, string>;
}