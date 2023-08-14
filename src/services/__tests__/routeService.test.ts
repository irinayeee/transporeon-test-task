import { constructRoutesGraph, findRoute } from '../routeService';
import { RouteType } from '../../models/RouteType';
import * as airportService from '../airportService';
import { type Airport } from '../../models/Airport';
import { type Route } from '../../models/Route';
import { type GraphEdge } from '../../models/GraphEdge';
import { type Graph } from '../../models/Graph';

const mockRoutes: Route[] = [
  {
    sourceID: 'A',
    destinationID: 'B',
    distance: 2,
  },
  {
    sourceID: 'B',
    destinationID: 'D',
    distance: 2,
  },
  {
    sourceID: 'B',
    destinationID: 'H',
    distance: 6,
  },
  {
    sourceID: 'C',
    destinationID: 'I',
    distance: 8,
  },
  {
    sourceID: 'D',
    destinationID: 'F',
    distance: 4,
  },
  {
    sourceID: 'G',
    destinationID: 'H',
    distance: 2,
  },
  {
    sourceID: 'A',
    destinationID: 'E',
    distance: 3,
  },

  {
    sourceID: 'E',
    destinationID: 'F',
    distance: 6,
  },
  {
    sourceID: 'E',
    destinationID: 'B',
    distance: 5,
  },
  {
    sourceID: 'A',
    destinationID: 'I',
    distance: 5,
  },
  {
    sourceID: 'I',
    destinationID: 'F',
    distance: 2,
  },
];
const mockAirports: Airport[] = [
  { id: 'A', name: 'A', icao: 'A', iata: 'A', location: { latitude: 1, longitude: 1 } },
  { id: 'B', name: 'B', icao: 'B', iata: 'B', location: { latitude: 1, longitude: 1 } },
  { id: 'C', name: 'C', icao: 'C', iata: 'C', location: { latitude: 1, longitude: 1 } },
  { id: 'D', name: 'D', icao: 'D', iata: 'D', location: { latitude: 1, longitude: 1 } },
  { id: 'E', name: 'E', icao: 'E', iata: 'E', location: { latitude: 1, longitude: 1 } },
  { id: 'F', name: 'F', icao: 'F', iata: 'F', location: { latitude: 1, longitude: 1 } },
  { id: 'G', name: 'G', icao: 'G', iata: 'G', location: { latitude: 1, longitude: 1 } },
  { id: 'H', name: 'H', icao: 'H', iata: 'H', location: { latitude: 1, longitude: 1 } },
  { id: 'I', name: 'I', icao: 'I', iata: 'I', location: { latitude: 1, longitude: 1 } },
];

const mockAirportsById = new Map(mockAirports.map((airport) => [airport.id, airport]));

const countConnections = (graph: Graph, type: RouteType): number => {
  return Array.from(graph.values()).reduce((count, connections) => {
    return (
      count +
      Array.from(connections.values()).filter((connection) => connection.type === type).length
    );
  }, 0);
};

describe('constructRoutesGraph', () => {
  const groundConnectionsMock = jest
    .spyOn(airportService, 'findGroundConnections')
    .mockImplementation((airport, _airports, _kdIndex) => {
      const groundConnectionsMap: Map<string, GraphEdge> = new Map<string, GraphEdge>();
      switch (airport.id) {
        case 'A':
          groundConnectionsMap.set('C', { distance: 1, type: RouteType.GROUND });
          break;
        case 'C':
          groundConnectionsMap.set('E', { distance: 1, type: RouteType.GROUND });
          break;
        case 'D':
          groundConnectionsMap.set('G', { distance: 1, type: RouteType.GROUND });
          break;
      }

      return groundConnectionsMap;
    });

  beforeEach(() => {
    groundConnectionsMock.mockClear();
  });

  afterAll(() => {
    groundConnectionsMock.mockRestore();
  });

  it('should correctly include all connections', () => {
    const graph = constructRoutesGraph(mockRoutes, mockAirports, mockAirportsById);
    const groundConnectionsCount = countConnections(graph, RouteType.GROUND);
    const airConnectionsCount = countConnections(graph, RouteType.AIR);
    expect(graph.size).toBe(9);
    expect(groundConnectionsCount).toBe(3);
    expect(airConnectionsCount).toBe(11);
  });

  describe('findRoute', () => {
    let graph;

    beforeAll(() => {
      graph = constructRoutesGraph(mockRoutes, mockAirports, mockAirportsById);
    });

    it('should find a direct route between two airports', () => {
      const route = findRoute('A', 'B', graph);
      expect(route).toEqual({
        hops: ['A', 'B'],
        distance: 2,
      });
    });

    it('should find a shortest route', () => {
      const route = findRoute('A', 'F', graph);
      expect(route.hops).toEqual(['A', 'I', 'F']);
      expect(route.distance).toBe(7);
    });

    it('should not return a route with number of hops greater than maximum, even if it`s the shortest one', () => {
      const maxHops = 3;
      const route = findRoute('A', 'H', graph, maxHops);
      expect(route.hops.length).toBeLessThanOrEqual(maxHops);
      expect(route.hops).toEqual(['A', 'B', 'H']);
      expect(route.distance).toBe(8);
    });

    it('should find a shortest route with ground hops', () => {
      const result = findRoute('A', 'G', graph);
      expect(result.hops).toEqual(['A', 'B', 'D', 'G']);
      expect(result.distance).toBe(5);
    });

    it('should not return a route with consecutive ground hops', () => {
      const route = findRoute('A', 'E', graph);
      expect(route.hops).toEqual(['A', 'E']);
      expect(route.distance).toBe(3);
    });

    it('should return the source node as the only hop if source and destination are the same', () => {
      const result = findRoute('A', 'A', graph);
      expect(result.hops).toEqual(['A']);
      expect(result.distance).toBe(0);
    });

    it('should return an empty route if no path exists', () => {
      const result = findRoute('A', 'Z', graph);
      expect(result.hops).toEqual([]);
      expect(result.distance).toBe(Infinity);
    });
  });
});
