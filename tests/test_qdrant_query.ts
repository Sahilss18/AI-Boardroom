import { QdrantClient } from '@qdrant/js-client-rest';

async function test() {
  const client = new QdrantClient({ url: 'http://localhost:6333' });
  const collectionName = 'test_inspect_collection';

  // Create collection
  try {
    await client.getCollection(collectionName);
  } catch {
    await client.createCollection(collectionName, {
      vectors: { size: 3, distance: 'Cosine' }
    });
  }

  // Upsert
  await client.upsert(collectionName, {
    points: [
      { id: 1, vector: [0.1, 0.2, 0.3], payload: { sessionId: 123, text: 'hello' } },
      { id: 2, vector: [0.9, 0.8, 0.7], payload: { sessionId: 123, text: 'world' } }
    ]
  });

  // Query
  const result = await client.query(collectionName, {
    query: [0.1, 0.2, 0.3],
    filter: {
      must: [
        { key: 'sessionId', match: { value: 123 } }
      ]
    },
    limit: 2,
    with_payload: true
  });

  console.log('Query result:', JSON.stringify(result, null, 2));

  // Clean up
  await client.deleteCollection(collectionName);
}

test().catch(err => {
  console.error(err);
});
