import { DocumentParser } from '../packages/rag/src/document-parser.js';
import { EmbeddingProvider } from '../packages/rag/src/embedding-provider.js';
import { QdrantService } from '../packages/rag/src/qdrant-service.js';

async function test() {
  console.log('Testing Qdrant indexing and isolated retrieval from workspace...');
  const sessionId = 9999;

  // Clear previous test docs if any
  await QdrantService.deleteSessionDocuments(sessionId);

  const doc1 = "Redis caching invalidation is handled via a cache-aside pattern where updates write to database and delete from cache.";
  const doc2 = "Microservices are deployed on Kubernetes clusters with autoscaling based on memory usage.";
  
  console.log('Parsing and chunking docs...');
  const chunks1 = await DocumentParser.parseAndChunk('caching.txt', Buffer.from(doc1));
  const chunks2 = await DocumentParser.parseAndChunk('k8s.txt', Buffer.from(doc2));
  const allChunks = [...chunks1, ...chunks2];

  console.log('Generating embeddings...');
  const embeddings = await Promise.all(
    allChunks.map(c => EmbeddingProvider.getEmbedding(c.text))
  );

  console.log('Upserting to Qdrant...');
  await QdrantService.upsertChunks(sessionId, allChunks, embeddings);
  console.log('Upserted successfully.');

  console.log('Searching for "cache-aside invalidation" in session 9999...');
  const queryVec = await EmbeddingProvider.getEmbedding("cache-aside invalidation");
  const results = await QdrantService.searchIsolated(sessionId, queryVec, 3);
  console.log('Search results for session 9999:', JSON.stringify(results, null, 2));

  console.log('Searching for "cache-aside invalidation" in session 8888 (should be isolated/empty)...');
  const emptyResults = await QdrantService.searchIsolated(8888, queryVec, 3);
  console.log('Search results for session 8888 (isolated):', JSON.stringify(emptyResults, null, 2));

  // Clean up
  await QdrantService.deleteSessionDocuments(sessionId);
  console.log('Cleaned up session documents.');
}

test().catch(err => {
  console.error('Qdrant test failed:', err);
});
