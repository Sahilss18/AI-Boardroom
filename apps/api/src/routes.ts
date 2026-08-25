import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { 
  ScenarioRepository, 
  PersonaRepository, 
  SessionRepository, 
  ConversationRepository,
  LatentQuestionRepository,
  pool
} from '@reflection-ai/database';
import { BaseAgent } from '@reflection-ai/agents';
import { simulationGraph } from '@reflection-ai/orchestration';
import { DocumentParser, EmbeddingProvider, QdrantService } from '@reflection-ai/rag';

export async function router(fastify: FastifyInstance) {
  // Scenarios
  fastify.get('/api/scenarios', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const list = await ScenarioRepository.getAll();
      return { success: true, scenarios: list };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: { code: 'SCENARIO_LOAD_ERROR', message: error.message } });
    }
  });

  fastify.get('/api/scenarios/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const item = await ScenarioRepository.getById(parseInt(id, 10));
      if (!item) {
        return reply.status(404).send({ success: false, error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario does not exist.' } });
      }
      return { success: true, scenario: item };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: { code: 'SCENARIO_LOAD_ERROR', message: error.message } });
    }
  });

  // Personas
  fastify.get('/api/personas', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const list = await PersonaRepository.getAll();
      return { success: true, personas: list };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: { code: 'PERSONA_LOAD_ERROR', message: error.message } });
    }
  });

  // Session Management
  fastify.post('/api/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { scenarioId, personaIds } = request.body as { scenarioId: number; personaIds: number[] };

    if (!scenarioId || !personaIds || personaIds.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'scenarioId and at least one personaId are required.' }
      });
    }

    try {
      // 1. Create the session in database (Test User ID is seeded as 1)
      const session = await SessionRepository.create(1, scenarioId);

      // 2. Add personas to this session and initialize private states
      for (const pId of personaIds) {
        const persona = await PersonaRepository.getById(pId);
        if (persona) {
          const agent = new BaseAgent(persona);
          const initialState = agent.initializeState();
          await SessionRepository.addPersonaToSession(session.id, pId, initialState);
        }
      }

      // 3. Pre-populate latent questions for the session (non-blocking background task)
      // We return the session immediately and generate questions in the background
      // so the UI never hangs on rate-limited AI calls during session creation.
      const sessionPersonas = await SessionRepository.getPersonasForSession(session.id);
      simulationGraph.ensureLatentQuestions(session.id, sessionPersonas, scenarioId).catch((err: any) => {
        console.warn(`[session ${session.id}] Background question generation failed (will retry on first turn):`, err?.message);
      });

      return reply.status(201).send({ success: true, session });
    } catch (error: any) {
      console.error('Session creation route failed:', error);
      reply.status(500).send({ success: false, error: { code: 'SESSION_CREATE_ERROR', message: error.message } });
    }
  });

  fastify.get('/api/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const sId = parseInt(id, 10);
      const session = await SessionRepository.getById(sId);
      if (!session) {
        return reply.status(404).send({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session does not exist.' } });
      }

      const personas = await SessionRepository.getPersonasForSession(sId);
      const turns = await ConversationRepository.getTurns(sId);
      const questions = await LatentQuestionRepository.getQuestionsForSession(sId);

      return {
        success: true,
        session,
        personas: personas.map((p: any) => ({
          id: p.personaDetails.id,
          name: p.personaDetails.name,
          slug: p.personaDetails.slug,
          role: p.personaDetails.role,
          description: p.personaDetails.description,
          voiceId: p.personaDetails.voiceId,
        })),
        turns,
        questions,
      };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: { code: 'SESSION_LOAD_ERROR', message: error.message } });
    }
  });

  fastify.post('/api/sessions/:id/end', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    try {
      const sId = parseInt(id, 10);
      await SessionRepository.endSession(sId);
      try {
        await QdrantService.deleteSessionDocuments(sId);
      } catch (err) {
        console.warn(`Failed to clean up Qdrant documents for session ${sId}:`, err);
      }
      return { success: true, message: 'Session ended successfully.' };
    } catch (error: any) {
      reply.status(500).send({ success: false, error: { code: 'SESSION_UPDATE_ERROR', message: error.message } });
    }
  });

  fastify.post('/api/sessions/:id/documents', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { fileName, fileBase64 } = request.body as { fileName: string; fileBase64: string };

    if (!fileName || !fileBase64) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'fileName and fileBase64 are required.' }
      });
    }

    try {
      const sessionId = parseInt(id, 10);
      const buffer = Buffer.from(fileBase64, 'base64');

      const session = await SessionRepository.getById(sessionId);
      if (!session) {
        return reply.status(404).send({
          success: false,
          error: { code: 'SESSION_NOT_FOUND', message: 'Session does not exist.' }
        });
      }

      const [docResult] = await pool.query(
        `INSERT INTO documents (session_id, user_id, name, type, mime_type, storage_path, status, metadata_json)
         VALUES (?, ?, ?, ?, ?, '', 'processed', '{}')`,
        [sessionId, session.userId, fileName, fileName.split('.').pop() || 'txt', 'text/plain']
      );
      const documentId = (docResult as any).insertId;

      // 1. Parse and chunk document
      const chunks = await DocumentParser.parseAndChunk(fileName, buffer);

      // 2. Generate embeddings
      const embeddings = await Promise.all(
        chunks.map((chunk: any) => EmbeddingProvider.getEmbedding(chunk.text))
      );

      // 3. Upsert to Qdrant
      const pointIds = await QdrantService.upsertChunks(sessionId, chunks, embeddings);

      // 4. Save to MySQL document_chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const pointId = pointIds[i];
        await pool.query(
          `INSERT INTO document_chunks (document_id, session_id, chunk_index, content, page_number, slide_number, chunk_type, qdrant_point_id, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
          [
            documentId,
            sessionId,
            chunk.chunkIndex,
            chunk.text,
            chunk.metadata.pageNumber || null,
            chunk.metadata.slideNumber || null,
            fileName.endsWith('.pdf') ? 'pdf' : fileName.endsWith('.pptx') ? 'pptx' : 'txt',
            pointId
          ]
        );
      }

      // 5. Generate document-specific concerns & questions using LLM
      const fullDocText = chunks.map((c: any) => c.text).join('\n\n');
      try {
        await simulationGraph.generateDocumentQuestions(sessionId, fileName, fullDocText);
      } catch (err: any) {
        console.warn(`[session ${sessionId}] Document question generation failed:`, err?.message);
      }

      return {
        success: true,
        message: `Successfully parsed document using Docling engine (${chunks.length} chunks) and generated document-specific boardroom questions!`,
        chunksCount: chunks.length,
        documentId
      };
    } catch (error: any) {
      console.error('Document ingestion failed:', error);
      reply.status(500).send({ success: false, error: { code: 'DOCUMENT_INGESTION_ERROR', message: error.message } });
    }
  });

  // Upload document during setup (before session creation)
  fastify.post('/api/documents/parse', async (request: FastifyRequest, reply: FastifyReply) => {
    const { fileName, fileBase64 } = request.body as { fileName: string; fileBase64: string };

    if (!fileName || !fileBase64) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'fileName and fileBase64 are required.' }
      });
    }

    try {
      const buffer = Buffer.from(fileBase64, 'base64');
      const chunks = await DocumentParser.parseAndChunk(fileName, buffer);
      const summaryText = chunks.slice(0, 10).map((c: any) => c.text).join('\n\n');

      return {
        success: true,
        fileName,
        chunksCount: chunks.length,
        summaryText: summaryText.substring(0, 1500),
        fileBase64
      };
    } catch (error: any) {
      console.error('Document parse preview failed:', error);
      reply.status(500).send({ success: false, error: { code: 'DOCUMENT_PARSE_ERROR', message: error.message } });
    }
  });

}
export default router;
