import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({ url: 'http://localhost:6333' });
console.log('Available keys on client prototype:');
let proto = Object.getPrototypeOf(client);
while (proto && proto !== Object.prototype) {
  console.log(Object.getOwnPropertyNames(proto));
  proto = Object.getPrototypeOf(proto);
}
process.exit(0);
