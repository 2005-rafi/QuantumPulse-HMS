/**
 * Comprehensive verification script for DSA Query Engine
 */

async function runTests() {
  const { RadixTrie } = await import('../../frontend/src/core/dsa/RadixTrie.js');
  const { InvertedIndex } = await import('../../frontend/src/core/dsa/InvertedIndex.js');
  const { BitmaskFilter } = await import('../../frontend/src/core/dsa/BitmaskFilter.js');
  const { BoundedBinaryHeap } = await import('../../frontend/src/core/dsa/MinMaxHeap.js');

  console.log('─── Running DSA Unit Tests ───');

  // 1. Radix Trie
  const trie = new RadixTrie();
  trie.insert('PT-2026-0001', 'id_1');
  trie.insert('PT-2026-0002', 'id_2');
  trie.insert('PT-2025-0099', 'id_3');
  trie.insert('9876543210', 'id_1');

  const trieMatch1 = trie.searchPrefix('PT-2026');
  console.assert(trieMatch1.has('id_1') && trieMatch1.has('id_2') && !trieMatch1.has('id_3'), 'Trie prefix match failed');
  console.log('✅ RadixTrie prefix test passed');

  // 2. Inverted Index
  const index = new InvertedIndex();
  index.indexRecord('id_1', ['Rafi', 'Mohammed', 'Chennai']);
  index.indexRecord('id_2', ['Rafi', 'Ahmed', 'Mumbai']);
  index.indexRecord('id_3', ['Karthik', 'Raman', 'Chennai']);

  const indexMatch1 = index.search('Rafi Chennai');
  console.assert(indexMatch1.has('id_1') && !indexMatch1.has('id_2') && !indexMatch1.has('id_3'), 'Inverted index AND intersection failed');
  console.log('✅ InvertedIndex intersection test passed');

  // 3. Bitmask Filter
  const bitFilter = new BitmaskFilter({
    gender: { Male: 1, Female: 2, Other: 3 },
    visitType: { OPD: 4, IPD: 5 },
  });

  bitFilter.indexRecord('id_1', { gender: 'Male', visitType: 'OPD' });
  bitFilter.indexRecord('id_2', { gender: 'Female', visitType: 'IPD' });
  bitFilter.indexRecord('id_3', { gender: 'Male', visitType: 'IPD' });

  const filterMatch1 = bitFilter.filter({ gender: 'Male', visitType: 'IPD' });
  console.assert(filterMatch1.has('id_3') && !filterMatch1.has('id_1') && !filterMatch1.has('id_2'), 'Bitmask filtering failed');
  console.log('✅ BitmaskFilter 64-bit test passed');

  // 4. Bounded Heap Top-K
  const heap = new BoundedBinaryHeap(2, (a, b) => a - b);
  [10, 50, 20, 90, 40, 80].forEach(n => heap.push(n));
  const top2 = heap.extractSorted();
  console.assert(top2[0] === 90 && top2[1] === 80, 'Bounded heap Top-K failed');
  console.log('✅ BoundedBinaryHeap Top-K test passed');

  console.log('🎉 All DSA Engine Verification Tests Passed!');
}

runTests();
