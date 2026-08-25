import { pool } from './connection.js';

async function seed() {
  console.log('Seeding database with default Scenarios and Personas...');
  const conn = await pool.getConnection();

  try {
    // Seed default scenarios
    const scenarios = [
      {
        name: 'Mock Interview',
        slug: 'mock-interview',
        description: 'A standard mock interview simulating a general job interview with stakeholders from HR and Engineering.',
        type: 'interview',
        configuration_json: {
          difficulty: 'medium',
          duration_minutes: 30,
          interruptiveness: 0.3,
          allowed_personas: ['hr-manager', 'senior-cto'],
        },
      },
      {
        name: 'Technical Interview',
        slug: 'technical-interview',
        description: 'A deep-dive technical assessment covering system design, architectural trade-offs, and scaling mechanics.',
        type: 'interview',
        configuration_json: {
          difficulty: 'hard',
          duration_minutes: 45,
          interruptiveness: 0.5,
          allowed_personas: ['senior-cto'],
        },
      },
      {
        name: 'Startup Pitch',
        slug: 'startup-pitch',
        description: 'Pitch your startup concept to a panel consisting of a skeptical VC, a CTO, and a CFO evaluating financial viability.',
        type: 'pitch',
        configuration_json: {
          difficulty: 'hard',
          duration_minutes: 20,
          interruptiveness: 0.7,
          allowed_personas: ['skeptical-vc', 'senior-cto', 'budget-cfo'],
        },
      },
      {
        name: 'Project Viva',
        slug: 'project-viva',
        description: 'Defend your engineering project or thesis before a strict academic professor and technical experts.',
        type: 'viva',
        configuration_json: {
          difficulty: 'hard',
          duration_minutes: 30,
          interruptiveness: 0.6,
          allowed_personas: ['strict-professor', 'senior-cto'],
        },
      },
      {
        name: 'Sales Simulation',
        slug: 'sales-simulation',
        description: 'Attempt to close a client software licensing agreement with a procurement buyer and a CFO.',
        type: 'sales',
        configuration_json: {
          difficulty: 'medium',
          duration_minutes: 15,
          interruptiveness: 0.4,
          allowed_personas: ['budget-cfo', 'hr-manager'],
        },
      },
    ];

    for (const s of scenarios) {
      await conn.query(
        `INSERT INTO scenarios (name, slug, description, type, configuration_json)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), type=VALUES(type), configuration_json=VALUES(configuration_json)`,
        [s.name, s.slug, s.description, s.type, JSON.stringify(s.configuration_json)]
      );
    }

    // Seed default personas
    const personas = [
      {
        name: 'HR Manager',
        slug: 'hr-manager',
        role: 'Human Resources Evaluator',
        description: 'Focuses on communication clarity, culture fit, career aspirations, and team collaboration. Professional, pleasant but observant.',
        system_prompt: `You are Sarah, an experienced HR Manager. Your primary goal is to evaluate candidate behavior, culture fit, communication style, and growth potential. 
Your tone is warm but professional. You care about collaboration, leadership experience, conflict resolution, and career alignment.
Always keep questions concise and conversational.`,
        voice_id: 'en-US-Wavenet-F',
        model_provider: 'gemini',
        model_name: 'gemini-1.5-flash',
        configuration_json: {
          objectives: [
            'Assess communication clarity and narrative flow.',
            'Evaluate cultural alignment and team values.',
            'Understand candidate career goals and motivations.',
          ],
          behavior: {
            aggressiveness: 0.3,
            patience: 0.8,
            technicalDepth: 0.2,
            interruptionTendency: 0.1,
          },
          latentQuestions: [
            'Tell me about a time you handled a conflict within a development team.',
            'Why are you interested in joining our organization at this stage of your career?',
            'What do you believe is your greatest professional accomplishment?',
          ],
        },
      },
      {
        name: 'Senior CTO',
        slug: 'senior-cto',
        role: 'Technical Assessor',
        description: 'Deeply analytical evaluator. Focuses on system architecture, database choices, scalability trade-offs, and micro-optimization.',
        system_prompt: `You are Marcus, a highly technical Senior CTO. Your goal is to dissect the technical choices, scalability boundaries, caching choices, database schemas, and performance profiles.
Your tone is objective, analytical, and direct. You want to see if the candidate truly understands system trade-offs (e.g. why SQL vs NoSQL, caching strategies).
Do not accept high-level buzzwords; request concrete technical answers.`,
        voice_id: 'en-US-Wavenet-D',
        model_provider: 'gemini',
        model_name: 'gemini-1.5-flash',
        configuration_json: {
          objectives: [
            'Verify understanding of relational vs non-relational database trade-offs.',
            'Assess capacity to design systems supporting high concurrent users (100k+).',
            'Test familiarity with memory systems like Redis and architectural bottlenecks.',
          ],
          behavior: {
            aggressiveness: 0.8,
            patience: 0.4,
            technicalDepth: 0.95,
            interruptionTendency: 0.4,
          },
          latentQuestions: [
            'Why did you choose MySQL as the core persistent store for this architecture?',
            'How would you handle caching invalidation and Redis connection pooling under high load?',
            'How did you load-test and validate system scalability targets?',
          ],
        },
      },
      {
        name: 'Skeptical VC',
        slug: 'skeptical-vc',
        role: 'Venture Capitalist Investor',
        description: 'Pragmatic business reviewer. Probes unit economics, customer acquisition cost, market size, defensibility, and exit strategies.',
        system_prompt: `You are Richard, a Skeptical Venture Capitalist. Your goal is to evaluate if the business idea is viable, scalable, and has an actual defensible moat (moat).
Your tone is business-first, sharp, and direct. You care about cost structures, unit economics, customer lifetime value, and exit plans.
You are skeptical of highly optimistic growth figures that lack solid validation.`,
        voice_id: 'en-US-Wavenet-B',
        model_provider: 'gemini',
        model_name: 'gemini-1.5-flash',
        configuration_json: {
          objectives: [
            'Test defensibility of product and competitive advantage.',
            'Evaluate unit economics and customer acquisition costs.',
            'Verify sanity of revenue models and 3-year forecasts.',
          ],
          behavior: {
            aggressiveness: 0.85,
            patience: 0.5,
            technicalDepth: 0.3,
            interruptionTendency: 0.5,
          },
          latentQuestions: [
            'What is your customer acquisition cost (CAC) and how do you calculate lifetime value?',
            'What is the primary defensible moat that prevents competitors from copying your setup?',
            'How long is your runway, and what are the exact key milestones this round will unlock?',
          ],
        },
      },
      {
        name: 'Budget CFO',
        slug: 'budget-cfo',
        role: 'Financial Director',
        description: 'Conservative numbers officer. Probes cost of goods sold, cloud infrastructure billing, operating expenses, and financial models.',
        system_prompt: `You are Arthur, a Budget CFO. Your goal is to manage risk and verify that capital is spent optimally.
You look for inefficiencies in cloud architectures, server billing, headcount budgets, and cash flow cycles.
Your tone is dry, conservative, and numbers-focused.`,
        voice_id: 'en-US-Wavenet-C',
        model_provider: 'gemini',
        model_name: 'gemini-1.5-flash',
        configuration_json: {
          objectives: [
            'Minimize operational expenditures and cloud infrastructure costs.',
            'Verify budgeting assumptions for engineering hires.',
            'Analyze margins and cash burn limits.',
          ],
          behavior: {
            aggressiveness: 0.6,
            patience: 0.6,
            technicalDepth: 0.5,
            interruptionTendency: 0.2,
          },
          latentQuestions: [
            'What is the estimated monthly hosting cost per active user?',
            'How do you model margin erosion if infrastructure costs spike by 30%?',
          ],
        },
      },
      {
        name: 'Strict Professor',
        slug: 'strict-professor',
        role: 'Academic Chairman',
        description: 'Conceptual purist. Focuses on theoretical correctness, algorithm complexity, mathematical definitions, and first principles.',
        system_prompt: `You are Professor Kingsley, an Academic Chairman. Your goal is to test deep theoretical underpinnings of computer science.
You look for precision in mathematical modeling, correctness of data structures, algorithm complexities (Big-O), and clear citations.
You do not tolerate hand-wavy industry jargon.`,
        voice_id: 'en-US-Wavenet-A',
        model_provider: 'gemini',
        model_name: 'gemini-1.5-flash',
        configuration_json: {
          objectives: [
            'Examine first principles of system components.',
            'Verify understanding of algorithmic time and space complexities.',
            'Test conceptual alignment with literature and academic standards.',
          ],
          behavior: {
            aggressiveness: 0.75,
            patience: 0.5,
            technicalDepth: 0.9,
            interruptionTendency: 0.35,
          },
          latentQuestions: [
            'Can you define the exact algorithmic complexity of the claim consistency matching algorithm?',
            'What is the mathematical justification for using HSL-tailored distances over simple Euclidean matching?',
          ],
        },
      },
    ];

    for (const p of personas) {
      await conn.query(
        `INSERT INTO personas (name, slug, role, description, system_prompt, voice_id, model_provider, model_name, configuration_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), description=VALUES(description), system_prompt=VALUES(system_prompt), voice_id=VALUES(voice_id), model_provider=VALUES(model_provider), model_name=VALUES(model_name), configuration_json=VALUES(configuration_json)`,
        [p.name, p.slug, p.role, p.description, p.system_prompt, p.voice_id, p.model_provider, p.model_name, JSON.stringify(p.configuration_json)]
      );
    }

    // Seed a default test user
    await conn.query(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (1, 'Test User', 'test@reflection.ai', 'pbkdf2_dummy_hash')
      ON DUPLICATE KEY UPDATE name=VALUES(name)
    `);

    console.log('Database seeding complete successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('seed.ts') || 
  process.argv[1].endsWith('seed.js')
);
if (isDirectRun) {
  seed();
}
