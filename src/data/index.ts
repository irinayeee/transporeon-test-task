import parse from 'csv-parse';
import { readFile } from 'fs';
import { resolve as resolvePath } from 'path';

import { notNil, haversine } from '../util';
import { type Airport } from '../models/Airport';
import { type Route } from '../models/Route';

async function parseCSV<T extends Readonly<string[]>>(
  filePath: string,
  columns: T,
): Promise<Array<{ [key in T[number]]: string }>> {
  return await new Promise((resolve, reject) => {
    readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      parse(
        data,
        {
          columns: Array.from(columns),
          skip_empty_lines: true,
          relax_column_count: true,
        },
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows);
        },
      );
    });
  });
}

export async function loadAirportData(): Promise<Airport[]> {
  const columns = [
    'airportID',
    'name',
    'city',
    'country',
    'iata',
    'icao',
    'latitude',
    'longitude',
  ] as const;
  const rows = await parseCSV(resolvePath(__dirname, './airports.dat'), columns);

  return rows.map((row) => ({
    id: row.airportID,
    icao: row.icao === '\\N' ? null : row.icao,
    iata: row.iata === '\\N' ? null : row.iata,
    name: row.name,
    location: {
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },
  }));
}

export async function loadRouteData(airportsById: Map<string, Airport>): Promise<Route[]> {
  const columns = [
    'airline',
    'airlineID',
    'source',
    'sourceID',
    'destination',
    'destinationID',
    'codeshare',
    'stops',
  ] as const;
  const rows = await parseCSV(resolvePath(__dirname, './routes.dat'), columns);

  const routes = rows
    .filter((row) => row.stops === '0')
    .map((row) => {
      const source = airportsById.get(row.sourceID);
      const destination = airportsById.get(row.destinationID);

      if (source === undefined || destination === undefined) {
        return null;
      }

      return {
        sourceID: row.sourceID,
        destinationID: row.destinationID,
        distance: haversine(
          source.location.latitude,
          source.location.longitude,
          destination.location.latitude,
          destination.location.longitude,
        ),
      };
    })
    .filter(notNil);
  return routes;
}
