import { type Graph } from '../models/Graph';
import { Heap } from 'heap-js';
import { type RouteHops } from '../models/RouteHops';
import { type QueueNode } from '../models/QueueNode';
import { RouteType } from '../models/RouteType';
import { type Route } from '../models/Route';
import { constructAirportsTree, findGroundConnections } from './airportService';
import { type Airport } from '../models/Airport';
import { type GraphEdge } from '../models/GraphEdge';
import type KDBush from 'kdbush';

const setGroundConnections = (
  graph: Graph,
  airportId: string,
  airports: Airport[],
  airportsById: Map<string, Airport>,
  airportsKdTree: KDBush<number>,
): void => {
  const groundConnections = findGroundConnections(
    airportsById.get(airportId),
    airports,
    airportsKdTree,
  );
  graph.set(airportId, groundConnections);
};

export const constructRoutesGraph = (
  routes: Route[],
  airports: Airport[],
  airportsById: Map<string, Airport>,
): Graph => {
  const graph: Graph = new Map();
  const airportsKdTree = constructAirportsTree(airports);
  for (const route of routes) {
    // Assuming we don't want to travel by land to the airports that don't have any connections
    if (!graph.has(route.sourceID)) {
      setGroundConnections(graph, route.sourceID, airports, airportsById, airportsKdTree);
    }

    if (!graph.has(route.destinationID)) {
      setGroundConnections(graph, route.destinationID, airports, airportsById, airportsKdTree);
    }

    graph.get(route.sourceID).set(route.destinationID, {
      distance: route.distance,
      type: RouteType.AIR,
    });
  }
  return graph;
};

export const findRoute = (
  sourceId: string,
  destinationId: string,
  graph: Graph,
  maxHops = 5,
): RouteHops => {
  return processNodes(...initDijkstra(sourceId), destinationId, graph, maxHops);
};

const initDijkstra = (sourceId: string): [Heap<QueueNode>, Set<string>, Map<string, number>] => {
  const visited = new Set<string>();
  const distances = new Map<string, number>();
  distances.set(sourceId, 0);

  const queue = new Heap<QueueNode>((a: QueueNode, b: QueueNode) => a.distance - b.distance);
  queue.push({
    nodeId: sourceId,
    distance: 0,
    hops: [sourceId],
    hopCount: 1,
    routeType: RouteType.AIR,
  });
  return [queue, visited, distances];
};

const processNodes = (
  queue: Heap<QueueNode>,
  visited: Set<string>,
  distances: Map<string, number>,
  destinationId: string,
  graph: Graph,
  maxHops = 5,
): RouteHops => {
  let shortestRoute: RouteHops = {
    hops: [],
    distance: Infinity,
  };

  while (queue.length) {
    const currentNode = queue.pop();
    if (visited.has(currentNode.nodeId) || currentNode.distance > shortestRoute.distance) continue;

    if (currentNode.nodeId === destinationId && currentNode.distance < shortestRoute.distance) {
      shortestRoute = {
        distance: currentNode.distance,
        hops: currentNode.hops,
      };
      continue;
    }

    visited.add(currentNode.nodeId);
    processEdges(
      graph.get(currentNode.nodeId),
      currentNode,
      queue,
      distances,
      visited,
      destinationId,
      maxHops,
    );
  }
  return shortestRoute;
};

const processEdges = (
  connections: Map<string, GraphEdge>,
  currentNode: QueueNode,
  queue: Heap<QueueNode>,
  distances: Map<string, number>,
  visited: Set<string>,
  destinationId: string,
  maxHops = 5,
): void => {
  if (connections) {
    for (const [connectionId, connection] of connections.entries()) {
      const newDistance = currentNode.distance + connection.distance;
      const currentDistance = distances.get(connectionId) || Infinity;
      const hopCount =
        connection.type === RouteType.GROUND
          ? currentNode.hops.length
          : currentNode.hops.length + 1;

      if (
        !visited.has(connectionId) &&
        newDistance < currentDistance &&
        (hopCount < maxHops || connectionId === destinationId) &&
        (currentNode.routeType !== RouteType.GROUND || connection.type !== RouteType.GROUND)
      ) {
        distances.set(connectionId, newDistance);
        queue.push({
          nodeId: connectionId,
          distance: newDistance,
          hops: [...currentNode.hops, connectionId],
          hopCount,
          routeType: connection.type || RouteType.AIR,
        });
      }
    }
  }
};
