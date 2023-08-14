import { type RouteType } from './RouteType';

export interface QueueNode {
  nodeId: string;
  distance: number;
  hops: string[];
  hopCount: number;
  routeType: RouteType;
}
