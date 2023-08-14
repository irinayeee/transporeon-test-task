import * as airportService from '../airportService';
import { type Airport } from '../../models/Airport';
import { RouteType } from '../../models/RouteType';
import { type GraphEdge } from '../../models/GraphEdge';

const mockAirports: Airport[] = [
  {
    id: '415',
    iata: 'TLL',
    icao: 'EETN',
    name: 'Lennart Meri Tallinn Airport',
    location: { latitude: 59.41329956049999, longitude: 24.832799911499997 },
  },
  {
    id: '416',
    iata: null,
    icao: 'EETU',
    name: 'Tartu Airport',
    location: { latitude: 58.3074989319, longitude: 26.690399169900004 },
  },
  {
    id: '421',
    iata: 'HEL',
    icao: 'EFHK',
    name: 'Helsinki Vantaa Airport',
    location: { latitude: 60.3172, longitude: 24.9633 },
  },
  {
    id: '580',
    iata: 'AMS',
    icao: 'EHAM',
    name: 'Amsterdam Airport Schiphol',
    location: { latitude: 52.308601, longitude: 4.76389 },
  },
];

describe('airportService', () => {
  describe('mapAirports', () => {
    it('should map airports by code and id', () => {
      const [byCode, byId] = airportService.mapAirports(mockAirports);
      expect(byCode.size).toBe(7);
      expect(byId.size).toBe(4);
      expect(byCode.get('tll')).toBeDefined();
      expect(byCode.get('eetu')).toBeDefined();
      expect(byCode.get('hel')).toBeDefined();
      expect(byCode.get('ams')).toBeDefined();
      expect(byId.get('415')).toBeDefined();
      expect(byId.get('416')).toBeDefined();
      expect(byId.get('421')).toBeDefined();
      expect(byId.get('580')).toBeDefined();
    });
  });

  describe('getAirportByCode', () => {
    it('should return airport by code', () => {
      const [byCode] = airportService.mapAirports(mockAirports);
      const airport = airportService.getAirportByCode('TLL', byCode);
      expect(airport).toEqual({
        id: '415',
        iata: 'TLL',
        icao: 'EETN',
        name: 'Lennart Meri Tallinn Airport',
        location: { latitude: 59.41329956049999, longitude: 24.832799911499997 },
      });
    });
  });

  describe('getAirportCodeById', () => {
    it('should return airport code by id', () => {
      const [, byId] = airportService.mapAirports(mockAirports);
      const code = airportService.getAirportCodeById('415', byId);
      expect(code).toBe('TLL');
    });

    it('should return icao code if iata code is undefined', () => {
      const [, byId] = airportService.mapAirports(mockAirports);
      const code = airportService.getAirportCodeById('416', byId);
      expect(code).toBe('EETU');
    });
  });

  describe('constructAirportsTree', () => {
    it('should return a KDBush instance with airport points', () => {
      const kdTree = airportService.constructAirportsTree(mockAirports);
      expect(kdTree).toBeDefined();
      expect(kdTree.points.length).toBe(4);
      expect(kdTree).toHaveProperty('within');
    });
  });

  describe('findGroundConnections', () => {
    let filterConnectionsByDistanceSpy: jest.SpyInstance;

    beforeEach(() => {
      const result: Map<string, GraphEdge> = new Map<string, GraphEdge>();
      result.set('416', { distance: 163, type: RouteType.GROUND });
      filterConnectionsByDistanceSpy = jest
        .spyOn(airportService, 'filterConnectionsByDistance')
        .mockReturnValueOnce(result);
    });

    afterEach(() => {
      filterConnectionsByDistanceSpy.mockRestore();
    });

    it('should filter nearby airports with KDBush and call filterConnectionsByDistance with a subset of data', () => {
      const kdTree = airportService.constructAirportsTree(mockAirports);
      const maxDistance = 110;
      const targetAirport = mockAirports[0];
      const nearbyAirports = airportService.findGroundConnections(
        targetAirport,
        mockAirports,
        kdTree,
        maxDistance,
      );

      expect(filterConnectionsByDistanceSpy).toHaveBeenCalledWith(
        expect.toBeArrayOfSize(3),
        targetAirport,
        maxDistance,
      );

      expect(nearbyAirports.size).toBe(1);
      expect(nearbyAirports.has('416')).toBeTrue();
      expect(nearbyAirports.get('416').distance).toBe(163);
      expect(nearbyAirports.get('416').type).toBe(RouteType.GROUND);
    });
  });

  describe('filterConnectionsByDistance', () => {
    it('should filter and return only airports within a given maximum distance, excluding target airport', () => {
      const targetAirport = mockAirports[0];
      const nearbyAirports: Airport[] = [targetAirport, mockAirports[1], mockAirports[2]];
      const maxDistance = 110;

      const results = airportService.filterConnectionsByDistance(
        nearbyAirports,
        targetAirport,
        maxDistance,
      );

      expect(results.size).toBe(1);
      expect(results.has('415')).toBeFalsy();
      expect(results.has('421')).toBeTrue();
      expect(results.get('421').distance).toBeWithin(0, maxDistance);
      expect(results.get('421').type).toBe(RouteType.GROUND);
    });
  });
});
