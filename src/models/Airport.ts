export interface Airport {
  id: string;
  icao: string | null;
  iata: string | null;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
}
