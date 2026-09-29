/**
 * Serialized FIFO Async Queue for coordinating dataset transitions.
 * Ensures each asynchronous operation completes or handles error before
 * the next operation enters execution, preventing overlapping mutations.
 */
export function createAsyncQueue() {
  let queue = Promise.resolve();

  return {
    enqueue(task) {
      const nextPromise = queue
        .catch(() => {})
        .then(() => task());
      queue = nextPromise.catch(() => {});
      return nextPromise;
    },
    getQueue() {
      return queue;
    }
  };
}
