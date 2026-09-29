import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncQueue } from '../src/utils/transitionQueue.js';

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('createAsyncQueue serializes overlapping calls with single active operation', async () => {
  const queue = createAsyncQueue();
  const eventLog = [];
  let activeOps = 0;
  let maxConcurrentOps = 0;

  const bEnteredGate = createDeferred();
  const bSelectGate = createDeferred();
  const bMetaGate = createDeferred();

  const aEnteredGate = createDeferred();
  const aDoneGate = createDeferred();

  // Task B: simulates selecting B then fetching B metadata
  const taskBPromise = queue.enqueue(async () => {
    activeOps++;
    maxConcurrentOps = Math.max(maxConcurrentOps, activeOps);
    eventLog.push('B:entered');
    bEnteredGate.resolve();

    eventLog.push('B:select:start');
    await bSelectGate.promise;
    eventLog.push('B:select:done');

    eventLog.push('B:meta:start');
    await bMetaGate.promise;
    eventLog.push('B:meta:done');

    activeOps--;
    return 'DATASET_B_CONFIRMED';
  });

  // Wait until B enters its selection phase
  await bEnteredGate.promise;
  assert.equal(eventLog.includes('B:entered'), true);

  // Enqueue Task A while Task B is actively held
  let aEntered = false;
  const taskAPromise = queue.enqueue(async () => {
    activeOps++;
    maxConcurrentOps = Math.max(maxConcurrentOps, activeOps);
    aEntered = true;
    eventLog.push('A:entered');
    aEnteredGate.resolve();

    eventLog.push('A:select_and_meta');
    aDoneGate.resolve();

    activeOps--;
    return 'DATASET_A_CONFIRMED';
  });

  // Assert A has NOT entered while B is in selection
  assert.equal(aEntered, false);
  assert.equal(activeOps, 1);
  assert.equal(maxConcurrentOps, 1);

  // Release B selection, but keep B metadata held
  bSelectGate.resolve();
  // Microtask tick
  await Promise.resolve();

  // Assert A STILL has not entered while B metadata is held
  assert.equal(aEntered, false);
  assert.equal(activeOps, 1);
  assert.equal(maxConcurrentOps, 1);

  // Release B metadata so Task B finishes
  bMetaGate.resolve();
  const resB = await taskBPromise;
  assert.equal(resB, 'DATASET_B_CONFIRMED');

  // Now Task A enters and executes
  await aEnteredGate.promise;
  assert.equal(aEntered, true);
  const resA = await taskAPromise;
  assert.equal(resA, 'DATASET_A_CONFIRMED');

  // Assert max concurrent operations throughout was exactly 1
  assert.equal(maxConcurrentOps, 1);
  assert.equal(activeOps, 0);

  // Verify the exact serialized execution sequence
  assert.deepEqual(eventLog, [
    'B:entered',
    'B:select:start',
    'B:select:done',
    'B:meta:start',
    'B:meta:done',
    'A:entered',
    'A:select_and_meta'
  ]);
});

test('createAsyncQueue continues execution and recovers when first operation fails', async () => {
  const queue = createAsyncQueue();
  const events = [];

  const task1Promise = queue.enqueue(async () => {
    events.push('task1:start');
    throw new Error('Task 1 metadata error');
  });

  const task2Promise = queue.enqueue(async () => {
    events.push('task2:start');
    return 'task2:success';
  });

  await assert.rejects(task1Promise, /Task 1 metadata error/);
  const task2Result = await task2Promise;

  assert.equal(task2Result, 'task2:success');
  assert.deepEqual(events, ['task1:start', 'task2:start']);
});
