import { pool } from '../connection.js';
import { Scenario, Persona, Session, SessionPersona, ConversationTurn, AgentProposal, Decision, AgentPrivateState, Observation, LatentQuestion, Claim, Conflict } from '@reflection-ai/shared';

export const ScenarioRepository = {
  async getAll(): Promise<Scenario[]> {
    const [rows] = await pool.query('SELECT * FROM scenarios');
    return (rows as any[]).map(r => ({
      ...r,
      configurationJson: typeof r.configuration_json === 'string' ? JSON.parse(r.configuration_json) : r.configuration_json,
    }));
  },

  async getById(id: number): Promise<Scenario | null> {
    const [rows] = await pool.query('SELECT * FROM scenarios WHERE id = ?', [id]);
    const list = rows as any[];
    if (list.length === 0) return null;
    const r = list[0];
    return {
      ...r,
      configurationJson: typeof r.configuration_json === 'string' ? JSON.parse(r.configuration_json) : r.configuration_json,
    };
  },
};

export const PersonaRepository = {
  async getAll(): Promise<Persona[]> {
    const [rows] = await pool.query('SELECT * FROM personas');
    return (rows as any[]).map(r => ({
      id: Number(r.id),
      name: r.name,
      slug: r.slug,
      role: r.role,
      description: r.description,
      systemPrompt: r.system_prompt,
      voiceId: r.voice_id,
      modelProvider: r.model_provider,
      modelName: r.model_name,
      configurationJson: typeof r.configuration_json === 'string' ? JSON.parse(r.configuration_json) : r.configuration_json,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async getById(id: number): Promise<Persona | null> {
    const [rows] = await pool.query('SELECT * FROM personas WHERE id = ?', [id]);
    const list = rows as any[];
    if (list.length === 0) return null;
    const r = list[0];
    return {
      id: Number(r.id),
      name: r.name,
      slug: r.slug,
      role: r.role,
      description: r.description,
      systemPrompt: r.system_prompt,
      voiceId: r.voice_id,
      modelProvider: r.model_provider,
      modelName: r.model_name,
      configurationJson: typeof r.configuration_json === 'string' ? JSON.parse(r.configuration_json) : r.configuration_json,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },
};

export const SessionRepository = {
  async create(userId: number, scenarioId: number): Promise<Session> {
    const [result] = await pool.query(
      `INSERT INTO sessions (user_id, scenario_id, status, current_turn, started_at) 
       VALUES (?, ?, 'active', 0, NOW())`,
      [userId, scenarioId]
    );
    const insertId = (result as any).insertId;
    const session = await this.getById(insertId);
    if (!session) throw new Error('Failed to create session');
    return session;
  },

  async getById(id: number): Promise<Session | null> {
    const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ?', [id]);
    const list = rows as any[];
    if (list.length === 0) return null;
    const r = list[0];
    return {
      id: r.id,
      userId: r.user_id,
      scenarioId: r.scenario_id,
      status: r.status,
      currentTurn: r.current_turn,
      activeSpeakerId: r.active_speaker_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  async updateTurn(id: number, turn: number): Promise<void> {
    await pool.query('UPDATE sessions SET current_turn = ? WHERE id = ?', [turn, id]);
  },

  async updateActiveSpeaker(id: number, speakerId: number | null): Promise<void> {
    await pool.query('UPDATE sessions SET active_speaker_id = ? WHERE id = ?', [speakerId, id]);
  },

  async endSession(id: number): Promise<void> {
    await pool.query('UPDATE sessions SET status = "ended", ended_at = NOW() WHERE id = ?', [id]);
  },

  async getPersonasForSession(sessionId: number): Promise<(SessionPersona & { personaDetails: Persona })[]> {
    const [rows] = await pool.query(
      `SELECT sp.*, p.name, p.slug, p.role, p.description, p.system_prompt, p.voice_id, p.model_provider, p.model_name, p.configuration_json as p_config
       FROM session_personas sp
       JOIN personas p ON sp.persona_id = p.id
       WHERE sp.session_id = ? AND sp.active = TRUE`,
      [sessionId]
    );

    return (rows as any[]).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      personaId: r.persona_id,
      privateStateJson: typeof r.private_state_json === 'string' ? JSON.parse(r.private_state_json) : r.private_state_json,
      active: !!r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      personaDetails: {
        id: r.persona_id,
        name: r.name,
        slug: r.slug,
        role: r.role,
        description: r.description,
        systemPrompt: r.system_prompt,
        voiceId: r.voice_id,
        modelProvider: r.model_provider,
        modelName: r.model_name,
        configurationJson: typeof r.p_config === 'string' ? JSON.parse(r.p_config) : r.p_config,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    }));
  },

  async addPersonaToSession(sessionId: number, personaId: number, initialState: AgentPrivateState): Promise<void> {
    await pool.query(
      `INSERT INTO session_personas (session_id, persona_id, private_state_json, active)
       VALUES (?, ?, ?, TRUE)`,
      [sessionId, personaId, JSON.stringify(initialState)]
    );
  },

  async updatePersonaPrivateState(sessionId: number, personaId: number, state: AgentPrivateState): Promise<void> {
    await pool.query(
      `UPDATE session_personas 
       SET private_state_json = ? 
       WHERE session_id = ? AND persona_id = ?`,
      [JSON.stringify(state), sessionId, personaId]
    );
  },
};

export const ConversationRepository = {
  async addTurn(sessionId: number, speakerType: 'user' | 'agent', personaId: number | null, text: string, sequenceNumber: number): Promise<ConversationTurn> {
    const startedAt = new Date();
    // Simulate short speech delay or timestamp difference
    const endedAt = new Date(startedAt.getTime() + 1000);
    const [result] = await pool.query(
      `INSERT INTO conversation_turns (session_id, speaker_type, persona_id, text, sequence_number, started_at, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, speakerType, personaId, text, sequenceNumber, startedAt, endedAt]
    );
    const insertId = (result as any).insertId;
    return {
      id: insertId,
      sessionId,
      speakerType,
      personaId,
      text,
      sequenceNumber,
      startedAt,
      endedAt,
      createdAt: startedAt,
    };
  },

  async getTurns(sessionId: number): Promise<ConversationTurn[]> {
    const [rows] = await pool.query(
      `SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY sequence_number ASC`,
      [sessionId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      speakerType: r.speaker_type,
      personaId: r.persona_id,
      text: r.text,
      sequenceNumber: r.sequence_number,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      metadataJson: typeof r.metadata_json === 'string' ? JSON.parse(r.metadata_json) : r.metadata_json,
      createdAt: r.created_at,
    }));
  },

  async addProposal(proposal: Omit<AgentProposal, 'id'>): Promise<AgentProposal> {
    const [result] = await pool.query(
      `INSERT INTO agent_proposals (session_id, persona_id, turn_id, action, content, priority, confidence, reason, status, evidence_status, evidence_citation, question_id, semantic_intent, related_entities, related_claims)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposal.sessionId,
        proposal.personaId,
        proposal.turnId,
        proposal.action,
        proposal.content,
        proposal.priority,
        proposal.confidence,
        proposal.reason,
        proposal.status,
        proposal.evidenceStatus || 'UNKNOWN',
        proposal.evidenceCitation || '',
        proposal.questionId || null,
        proposal.semanticIntent || null,
        proposal.relatedEntities ? JSON.stringify(proposal.relatedEntities) : null,
        proposal.relatedClaims ? JSON.stringify(proposal.relatedClaims) : null,
      ]
    );
    const insertId = (result as any).insertId;
    return {
      ...proposal,
      id: insertId,
    };
  },

  async getProposalsForTurn(turnId: number): Promise<AgentProposal[]> {
    const [rows] = await pool.query(
      `SELECT * FROM agent_proposals WHERE turn_id = ?`,
      [turnId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      personaId: r.persona_id,
      turnId: r.turn_id,
      action: r.action,
      content: r.content,
      priority: Number(r.priority),
      confidence: Number(r.confidence),
      reason: r.reason,
      status: r.status,
      evidenceStatus: r.evidence_status,
      evidenceCitation: r.evidence_citation,
      questionId: r.question_id,
      semanticIntent: r.semantic_intent,
      relatedEntities: typeof r.related_entities === 'string' ? JSON.parse(r.related_entities) : r.related_entities,
      relatedClaims: typeof r.related_claims === 'string' ? JSON.parse(r.related_claims) : r.related_claims,
      createdAt: r.created_at,
    }));
  },

  async updateProposalStatus(id: number, status: 'pending' | 'selected' | 'rejected', reason?: string): Promise<void> {
    if (reason) {
      await pool.query(
        `UPDATE agent_proposals SET status = ?, reason = ? WHERE id = ?`,
        [status, reason, id]
      );
    } else {
      await pool.query(
        `UPDATE agent_proposals SET status = ? WHERE id = ?`,
        [status, id]
      );
    }
  },

  async addObservation(obs: Omit<Observation, 'id'>): Promise<Observation> {
    const [result] = await pool.query(
      `INSERT INTO observations (session_id, persona_id, turn_id, observation_type, content_json, importance, evidence_status, evidence_citation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        obs.sessionId,
        obs.personaId,
        obs.turnId,
        obs.observationType,
        JSON.stringify(obs.contentJson),
        obs.importance,
        obs.evidenceStatus || 'UNKNOWN',
        obs.evidenceCitation || '',
      ]
    );
    const insertId = (result as any).insertId;
    return {
      ...obs,
      id: insertId,
    };
  },

  async getObservations(sessionId: number): Promise<Observation[]> {
    const [rows] = await pool.query(
      `SELECT * FROM observations WHERE session_id = ?`,
      [sessionId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      personaId: r.persona_id,
      turnId: r.turn_id,
      observationType: r.observation_type,
      contentJson: typeof r.content_json === 'string' ? JSON.parse(r.content_json) : r.content_json,
      importance: Number(r.importance),
      evidenceStatus: r.evidence_status,
      evidenceCitation: r.evidence_citation,
      createdAt: r.created_at,
    }));
  },

  async addDecision(decision: Omit<Decision, 'id'>): Promise<Decision> {
    const [result] = await pool.query(
      `INSERT INTO decisions (session_id, turn_id, selected_persona_id, action, reason, confidence, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        decision.sessionId,
        decision.turnId,
        decision.selectedPersonaId,
        decision.action,
        decision.reason,
        decision.confidence,
        JSON.stringify(decision.metadataJson || {}),
      ]
    );
    const insertId = (result as any).insertId;
    return {
      ...decision,
      id: insertId,
    };
  },
};

export const LatentQuestionRepository = {
  async addQuestion(q: Omit<LatentQuestion, 'id'>): Promise<LatentQuestion> {
    const [result] = await pool.query(
      `INSERT INTO latent_questions (session_id, persona_id, question, normalized_question, intent, entities_json, priority, status, satisfaction_score, source, question_id, canonical_intent, asked_at, last_proposed_at, last_asked_turn, duplicate_of, rejection_reason, canonical_question_id, answered_by_persona_id, answered_at, asked_by_persona_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
      [
        q.sessionId,
        q.personaId,
        q.question,
        q.normalizedQuestion,
        q.intent,
        JSON.stringify(q.entitiesJson || []),
        q.priority,
        q.status,
        q.satisfactionScore,
        q.source,
        q.questionId || null,
        q.canonicalIntent || null,
        q.askedAt || null,
        q.lastProposedAt || null,
        q.lastAskedTurn || null,
        q.duplicateOf || null,
        q.rejectionReason || null,
        q.canonicalQuestionId || null,
        q.answeredByPersonaId || null,
        q.answeredAt || null,
        q.askedByPersonaId || null,
      ]
    );
    const insertId = (result as any).insertId;
    return {
      ...q,
      id: insertId,
    };
  },

  async getQuestionsForSession(sessionId: number): Promise<LatentQuestion[]> {
    const [rows] = await pool.query(
      `SELECT * FROM latent_questions WHERE session_id = ?`,
      [sessionId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      personaId: r.persona_id,
      question: r.question,
      normalizedQuestion: r.normalized_question,
      intent: r.intent,
      entitiesJson: typeof r.entities_json === 'string' ? JSON.parse(r.entities_json) : r.entities_json,
      priority: Number(r.priority),
      status: r.status,
      satisfactionScore: Number(r.satisfaction_score),
      source: r.source,
      questionId: r.question_id,
      canonicalIntent: r.canonical_intent,
      askedAt: r.asked_at,
      lastProposedAt: r.last_proposed_at,
      lastAskedTurn: r.last_asked_turn,
      duplicateOf: r.duplicate_of,
      rejectionReason: r.rejection_reason,
      canonicalQuestionId: r.canonical_question_id,
      answeredByPersonaId: r.answered_by_persona_id,
      answeredAt: r.answered_at,
      askedByPersonaId: r.asked_by_persona_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async clearQuestionsForSession(sessionId: number): Promise<void> {
    await pool.query(`DELETE FROM latent_questions WHERE session_id = ?`, [sessionId]);
  },


  async updateQuestionStatus(id: number, status: string, score: number): Promise<void> {
    await pool.query(
      `UPDATE latent_questions SET status = ?, satisfaction_score = ? WHERE id = ?`,
      [status, score, id]
    );
  },

  async updateQuestion(id: number, updates: Partial<LatentQuestion>): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }
    if (updates.satisfactionScore !== undefined) {
      setClauses.push('satisfaction_score = ?');
      params.push(updates.satisfactionScore);
    }
    if (updates.questionId !== undefined) {
      setClauses.push('question_id = ?');
      params.push(updates.questionId);
    }
    if (updates.canonicalIntent !== undefined) {
      setClauses.push('canonical_intent = ?');
      params.push(updates.canonicalIntent);
    }
    if (updates.askedAt !== undefined) {
      setClauses.push('asked_at = ?');
      params.push(updates.askedAt);
    }
    if (updates.lastProposedAt !== undefined) {
      setClauses.push('last_proposed_at = ?');
      params.push(updates.lastProposedAt);
    }
    if (updates.lastAskedTurn !== undefined) {
      setClauses.push('last_asked_turn = ?');
      params.push(updates.lastAskedTurn);
    }
    if (updates.duplicateOf !== undefined) {
      setClauses.push('duplicate_of = ?');
      params.push(updates.duplicateOf);
    }
    if (updates.rejectionReason !== undefined) {
      setClauses.push('rejection_reason = ?');
      params.push(updates.rejectionReason);
    }
    if (updates.canonicalQuestionId !== undefined) {
      setClauses.push('canonical_question_id = ?');
      params.push(updates.canonicalQuestionId);
    }
    if (updates.answeredByPersonaId !== undefined) {
      setClauses.push('answered_by_persona_id = ?');
      params.push(updates.answeredByPersonaId);
    }
    if (updates.answeredAt !== undefined) {
      setClauses.push('answered_at = ?');
      params.push(updates.answeredAt);
    }
    if (updates.askedByPersonaId !== undefined) {
      setClauses.push('asked_by_persona_id = ?');
      params.push(updates.askedByPersonaId);
    }

    if (setClauses.length === 0) return;

    params.push(id);
    await pool.query(
      `UPDATE latent_questions SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }
};

export const ClaimRepository = {
  async addClaim(claim: Omit<Claim, 'id' | 'claimId'>): Promise<Claim> {
    const [result] = await pool.query(
      `INSERT INTO claims (session_id, turn_id, subject, predicate, object_value, source_type, source_id, confidence, evidence_status, citation, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
      [
        claim.sessionId,
        claim.turnId,
        claim.subject,
        claim.predicate,
        claim.object,
        claim.sourceType,
        claim.sourceId,
        claim.confidence,
        claim.evidenceStatus || 'UNKNOWN',
        claim.citation || ''
      ]
    );
    const insertId = (result as any).insertId;
    return {
      ...claim,
      id: insertId,
      claimId: insertId
    };
  },

  async getClaimsForSession(sessionId: number): Promise<Claim[]> {
    const [rows] = await pool.query(
      `SELECT * FROM claims WHERE session_id = ?`,
      [sessionId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      claimId: r.id,
      sessionId: r.session_id,
      turnId: r.turn_id,
      subject: r.subject,
      predicate: r.predicate,
      object: r.object_value,
      sourceType: r.source_type,
      sourceId: r.source_id,
      confidence: Number(r.confidence),
      evidenceStatus: r.evidence_status,
      citation: r.citation,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async updateClaimStatus(id: number, status: string, citation?: string): Promise<void> {
    if (citation !== undefined) {
      await pool.query(
        `UPDATE claims SET evidence_status = ?, citation = ? WHERE id = ?`,
        [status, citation, id]
      );
    } else {
      await pool.query(
        `UPDATE claims SET evidence_status = ? WHERE id = ?`,
        [status, id]
      );
    }
  }
};

export const ConflictRepository = {
  async addConflict(c: Omit<Conflict, 'id' | 'conflictId'>): Promise<Conflict> {
    const [result] = await pool.query(
      `INSERT INTO contradictions (session_id, claim_a_id, claim_b_id, contradiction_type, severity, confidence, status, resolution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.sessionId,
        c.claimAId,
        c.claimBId,
        c.contradictionType,
        c.severity,
        c.confidence,
        c.status,
        c.resolution || null
      ]
    );
    const insertId = (result as any).insertId;
    return {
      ...c,
      id: insertId,
      conflictId: insertId
    };
  },

  async getConflictsForSession(sessionId: number): Promise<Conflict[]> {
    const [rows] = await pool.query(
      `SELECT * FROM contradictions WHERE session_id = ?`,
      [sessionId]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      conflictId: r.id,
      sessionId: r.session_id,
      claimAId: r.claim_a_id,
      claimBId: r.claim_b_id,
      contradictionType: r.contradiction_type,
      severity: r.severity as any,
      confidence: Number(r.confidence),
      status: r.status,
      resolution: r.resolution || undefined,
      createdAt: r.created_at
    }));
  }
};
