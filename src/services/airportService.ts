import { getRadiusWithinKmRange, haversine } from '../util';
import { type Airport } from '../models/Airport';
import { type GraphEdge } from '../models/GraphEdge';
import { RouteType } from '../models/RouteType';
import KDBush from 'kdbush';

export const mapAirports = (airports: Airport[]): [Map<string, Airport>, Map<string, Airport>] => {
  const airportsByCode = new Map<string, Airport>();
  const airportsById = new Map<string, Airport>();

  for (const airport of airports) {
    if (airport.iata) {
      airportsByCode.set(airport.iata.toLowerCase(), airport);
    }
    if (airport.icao) {
      airportsByCode.set(airport.icao.toLowerCase(), airport);
    }

    airportsById.set(airport.id, airport);
  }

  return [airportsByCode, airportsById];
};

export const getAirportByCode = (
  code: string,
  airports: Map<string, Airport>,
): Airport | undefined => {
  return airports.get(code.toLowerCase());
};

export const getAirportCodeById = (
  airportId: string,
  airportsById: Map<string, Airport>,
): string => {
  const airport = airportsById.get(airportId);
  return airport ? airport.iata || airport.icao : airportId;
};

export const constructAirportsTree = (airports: Airport[]): KDBush<number> => {
  const points = airports.map((airport) => [airport.location.latitude, airport.location.longitude]);
  return new KDBush(points);
};

export const findGroundConnections = (
  targetAirport: Airport,
  airports: Airport[],
  kdIndex: KDBush<number>,
  maxDistance = 100,
): Map<string, GraphEdge> => {
  if (targetAirport) {
    const nearbyAriportCandidates: Airport[] = kdIndex
      .within(
        targetAirport.location.latitude,
        targetAirport.location.longitude,
        getRadiusWithinKmRange(maxDistance, targetAirport.location.latitude),
      )
      .map((i) => airports[i]);
    return filterConnectionsByDistance(nearbyAriportCandidates, targetAirport, maxDistance);
  }
  return new Map();
};

export const filterConnectionsByDistance = (
  nearbyAriports: Airport[],
  targetAirport: Airport,
  maxDistance: number,
): Map<string, GraphEdge> => {
  const nearbyAriportsDistances: Map<string, GraphEdge> = new Map<string, GraphEdge>();
  for (const airport of nearbyAriports) {
    if (airport && airport.id !== targetAirport.id) {
      const distance = haversine(
        targetAirport.location.latitude,
        targetAirport.location.longitude,
        airport.location.latitude,
        airport.location.longitude,
      );
      if (distance <= maxDistance) {
        nearbyAriportsDistances.set(airport.id, {
          distance,
          type: RouteType.GROUND,
        });
      }
    }
  }
  return nearbyAriportsDistances;
};
