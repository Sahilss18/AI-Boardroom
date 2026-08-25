import mysql from 'mysql2/promise';
import { pool } from './connection.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let envPath = path.resolve(__dirname, '../../../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '../../../../.env');
}
dotenv.config({ path: envPath });

async function migrate() {
  console.log('Running database migrations...');
  
  // Bootstrap connection to ensure the database exists
  const dbName = process.env.MYSQL_DATABASE || 'reflection_ai';
  const bootstrapConnection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });
  await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  await bootstrapConnection.end();

  const conn = await pool.getConnection();

  try {
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0;`);

    // 1. users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. scenarios
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(100) NOT NULL,
        configuration_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. personas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS personas (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        voice_id VARCHAR(255) NOT NULL,
        model_provider VARCHAR(100) NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        configuration_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. sessions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        scenario_id BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        current_turn INT DEFAULT 0,
        active_speaker_id BIGINT NULL,
        started_at DATETIME NULL,
        ended_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
        INDEX idx_sessions_user_id (user_id),
        INDEX idx_sessions_scenario_id (scenario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. session_personas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS session_personas (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        persona_id BIGINT NOT NULL,
        private_state_json JSON NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        INDEX idx_session_personas_session_id (session_id),
        INDEX idx_session_personas_persona_id (persona_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. documents
    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        storage_path TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        metadata_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_documents_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. document_chunks
    await conn.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        document_id BIGINT NOT NULL,
        session_id BIGINT NOT NULL,
        chunk_index INT NOT NULL,
        content LONGTEXT NOT NULL,
        page_number INT NULL,
        slide_number INT NULL,
        chunk_type VARCHAR(100) NOT NULL,
        qdrant_point_id VARCHAR(255) NOT NULL,
        metadata_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        INDEX idx_chunks_document_id (document_id),
        INDEX idx_chunks_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. entities
    await conn.query(`
      CREATE TABLE IF NOT EXISTS entities (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        canonical_name VARCHAR(255) NOT NULL,
        metadata_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        INDEX idx_entities_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. claims
    await conn.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        entity_id BIGINT NULL,
        subject VARCHAR(500) NOT NULL,
        predicate VARCHAR(500) NOT NULL,
        object_value TEXT NOT NULL,
        unit VARCHAR(100) NULL,
        source_type VARCHAR(100) NOT NULL,
        source_id VARCHAR(255) NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        metadata_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL,
        INDEX idx_claims_session_id (session_id),
        INDEX idx_claims_subject (subject(255)),
        INDEX idx_claims_predicate (predicate(255))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. latent_questions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS latent_questions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        persona_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        normalized_question TEXT NOT NULL,
        intent VARCHAR(100) NOT NULL,
        entities_json JSON NOT NULL,
        priority DECIMAL(5,4) NOT NULL,
        status VARCHAR(50) NOT NULL,
        satisfaction_score DECIMAL(5,4) NOT NULL,
        source VARCHAR(100) NOT NULL,
        metadata_json JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        INDEX idx_latent_questions_session_id (session_id),
        INDEX idx_latent_questions_persona_id (persona_id),
        INDEX idx_latent_questions_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. conversation_turns
    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        speaker_type VARCHAR(50) NOT NULL,
        persona_id BIGINT NULL,
        text LONGTEXT NOT NULL,
        sequence_number INT NOT NULL,
        started_at DATETIME NOT NULL,
        ended_at DATETIME NOT NULL,
        metadata_json JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL,
        INDEX idx_turns_session_id (session_id),
        INDEX idx_turns_sequence (sequence_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. observations
    await conn.query(`
      CREATE TABLE IF NOT EXISTS observations (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        persona_id BIGINT NOT NULL,
        turn_id BIGINT NOT NULL,
        observation_type VARCHAR(100) NOT NULL,
        content_json JSON NOT NULL,
        importance DECIMAL(5,4) NOT NULL,
        evidence_status VARCHAR(50) NULL,
        evidence_citation TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES conversation_turns(id) ON DELETE CASCADE,
        INDEX idx_observations_session_id (session_id),
        INDEX idx_observations_persona_id (persona_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. agent_proposals
    await conn.query(`
      CREATE TABLE IF NOT EXISTS agent_proposals (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        persona_id BIGINT NOT NULL,
        turn_id BIGINT NOT NULL,
        action VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        priority DECIMAL(5,4) NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        evidence_status VARCHAR(50) NULL,
        evidence_citation TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES conversation_turns(id) ON DELETE CASCADE,
        INDEX idx_proposals_session_id (session_id),
        INDEX idx_proposals_persona_id (persona_id),
        INDEX idx_proposals_turn_id (turn_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. decisions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS decisions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        turn_id BIGINT NOT NULL,
        selected_persona_id BIGINT NULL,
        action VARCHAR(100) NOT NULL,
        reason TEXT NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        metadata_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES conversation_turns(id) ON DELETE CASCADE,
        FOREIGN KEY (selected_persona_id) REFERENCES personas(id) ON DELETE SET NULL,
        INDEX idx_decisions_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 15. contradictions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contradictions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        claim_a_id BIGINT NOT NULL,
        claim_b_id BIGINT NOT NULL,
        contradiction_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        status VARCHAR(50) NOT NULL,
        resolution TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (claim_a_id) REFERENCES claims(id) ON DELETE CASCADE,
        FOREIGN KEY (claim_b_id) REFERENCES claims(id) ON DELETE CASCADE,
        INDEX idx_contradictions_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 16. tool_calls
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tool_calls (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        turn_id BIGINT NOT NULL,
        persona_id BIGINT NULL,
        tool_name VARCHAR(255) NOT NULL,
        arguments_json JSON NOT NULL,
        result_json JSON NOT NULL,
        status VARCHAR(50) NOT NULL,
        latency_ms INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES conversation_turns(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL,
        INDEX idx_tool_calls_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 17. evaluations
    await conn.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        persona_id BIGINT NULL,
        metric VARCHAR(100) NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        feedback TEXT NOT NULL,
        metadata_json JSON NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL,
        INDEX idx_evaluations_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 18. latent_questions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS latent_questions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        session_id BIGINT NOT NULL,
        persona_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        normalized_question TEXT NOT NULL,
        intent VARCHAR(100) NOT NULL,
        entities_json JSON NOT NULL,
        priority DECIMAL(3,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        satisfaction_score DECIMAL(3,2) NOT NULL,
        source VARCHAR(100) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
        INDEX idx_latent_questions_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Alter tables to add new columns to existing schema safely
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN normalized_question TEXT NOT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN intent VARCHAR(100) NOT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN entities_json JSON NOT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE observations ADD COLUMN evidence_status VARCHAR(50) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE observations ADD COLUMN evidence_citation TEXT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD COLUMN evidence_status VARCHAR(50) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD COLUMN evidence_citation TEXT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD COLUMN question_id BIGINT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD COLUMN semantic_intent VARCHAR(100) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD COLUMN related_entities JSON NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD COLUMN related_claims JSON NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE agent_proposals ADD CONSTRAINT fk_proposal_question_id FOREIGN KEY (question_id) REFERENCES latent_questions(id) ON DELETE SET NULL;`);
    } catch (_) {}

    // Claims first-class evidence alterations
    try {
      await conn.query(`ALTER TABLE claims ADD COLUMN turn_id BIGINT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE claims ADD COLUMN evidence_status VARCHAR(50) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE claims ADD COLUMN citation TEXT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE claims ADD INDEX idx_claims_turn_id (turn_id);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE claims ADD CONSTRAINT fk_claims_turn_id FOREIGN KEY (turn_id) REFERENCES conversation_turns(id) ON DELETE SET NULL;`);
    } catch (_) {}

    // Question Lifecycle Hardening Alterations
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN question_id VARCHAR(255) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN canonical_intent VARCHAR(255) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN asked_at DATETIME NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN last_proposed_at DATETIME NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN last_asked_turn INT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN duplicate_of VARCHAR(255) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN rejection_reason TEXT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD INDEX idx_latent_questions_question_id (question_id);`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD INDEX idx_latent_questions_canonical_intent (canonical_intent);`);
    } catch (_) {}

    // Global Question Identity Alterations
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN canonical_question_id VARCHAR(255) NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN answered_by_persona_id BIGINT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN answered_at DATETIME NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD COLUMN asked_by_persona_id BIGINT NULL;`);
    } catch (_) {}
    try {
      await conn.query(`ALTER TABLE latent_questions ADD INDEX idx_latent_questions_canonical_question_id (canonical_question_id);`);
    } catch (_) {}

    await conn.query(`SET FOREIGN_KEY_CHECKS = 1;`);
    console.log('Migrations complete successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('migrate.ts') || 
  process.argv[1].endsWith('migrate.js')
);
if (isDirectRun) {
  migrate();
}
