import express, { type Express } from 'express';
import morgan from 'morgan';

import { loadAirportData, loadRouteData } from '../data';
import { constructRoutesGraph, findRoute } from '../services/routeService';
import { type RouteHops } from '../models/RouteHops';
import { getAirportByCode, getAirportCodeById, mapAirports } from '../services/airportService';

export async function createApp(): Promise<Express> {
  const app = express();

  const airports = await loadAirportData();
  const [airportsByCode, airportsById] = mapAirports(airports);

  const routes = await loadRouteData(airportsById);
  const routesGraph = constructRoutesGraph(routes, airports, airportsById);

  app.use(morgan('tiny'));

  app.get('/health', (_, res) => res.send('OK'));

  app.get('/airports/:code', (req, res) => {
    const code = req.params.code;
    if (code === undefined) {
      return res.status(400).send('Must provide airport code');
    }

    const airport = getAirportByCode(code, airportsByCode);
    if (airport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO code');
    }

    return res.status(200).send(airport);
  });

  app.get('/routes/:source/:destination', (req, res) => {
    const source = req.params.source;
    const destination = req.params.destination;
    if (source === undefined || destination === undefined) {
      return res.status(400).send('Must provide source and destination airports');
    }

    const sourceAirport = getAirportByCode(source, airportsByCode);
    const destinationAirport = getAirportByCode(destination, airportsByCode);
    if (sourceAirport === undefined || destinationAirport === undefined) {
      return res.status(404).send('No such airport, please provide a valid IATA/ICAO codes');
    }

    const route: RouteHops = findRoute(sourceAirport.id, destinationAirport.id, routesGraph);

    if (!route || route.distance === Infinity) {
      return res.status(404).send('Could not find a route');
    }

    return res.status(200).send({
      source: source.toUpperCase(),
      destination: destination.toUpperCase(),
      distance: route.distance,
      hops: route.hops.map((airportID) => getAirportCodeById(airportID, airportsById)),
    });
  });
  return app;
}
