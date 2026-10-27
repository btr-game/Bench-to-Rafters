// Worker for the balance harness: runs a slice of careers and posts the results back.
import { parentPort, workerData } from 'node:worker_threads';
import { runCareer, type Policy } from './harness';

const { seeds, policy } = workerData as { seeds: number[]; policy: Policy };
parentPort!.postMessage(seeds.map((s) => runCareer(s, policy)));
