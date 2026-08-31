/**
 * BoundedBinaryHeap — Priority Queue for Top-K Pagination & Multi-Key Sorting.
 * Time Complexity: O(N + K log K) for extracting Top-K items from N records.
 */

export class BoundedBinaryHeap {
  /**
   * @param {number} maxSize - Maximum number of elements to keep (K)
   * @param {Function} comparator - (a, b) => number. Returns > 0 if a should be replaced by b in Min-Heap.
   */
  constructor(maxSize = 50, comparator = (a, b) => a - b) {
    this.maxSize = maxSize;
    this.comparator = comparator;
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0] || null;
  }

  push(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._siftUp(this.heap.length - 1);
    } else if (this.comparator(item, this.heap[0]) > 0) {
      // If new item is 'larger' than the smallest in our top-K heap, replace root
      this.heap[0] = item;
      this._siftDown(0);
    }
  }

  /**
   * Extract all items sorted according to the comparator.
   * @returns {Array}
   */
  extractSorted() {
    const result = [...this.heap];
    // Sort the bounded K elements
    return result.sort((a, b) => -this.comparator(a, b));
  }

  _siftUp(index) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.comparator(this.heap[current], this.heap[parent]) < 0) {
        // Swap
        const tmp = this.heap[current];
        this.heap[current] = this.heap[parent];
        this.heap[parent] = tmp;
        current = parent;
      } else {
        break;
      }
    }
  }

  _siftDown(index) {
    let current = index;
    const length = this.heap.length;

    while (true) {
      let smallest = current;
      const left = 2 * current + 1;
      const right = 2 * current + 2;

      if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }

      if (smallest !== current) {
        const tmp = this.heap[current];
        this.heap[current] = this.heap[smallest];
        this.heap[smallest] = tmp;
        current = smallest;
      } else {
        break;
      }
    }
  }

  clear() {
    this.heap = [];
  }
}

export default BoundedBinaryHeap;
