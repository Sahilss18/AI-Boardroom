export interface AIAgent {
  id: string;
  name: string;
  shortTitle: string;
  role: string;
  description: string;
  capabilities: string[];
  color: 'cyan' | 'purple' | 'emerald' | 'pink' | 'amber' | 'rose';
  hex: string;
  iconType: 'chart' | 'matrix' | 'flow' | 'radar' | 'atom' | 'waves';
  image?: string;
}

export const AI_AGENTS: AIAgent[] = [
  {
    id: 'business-analyst',
    name: 'Business Analyst',
    shortTitle: 'BA',
    role: 'Market Intelligence & Forecasting',
    description: 'Processes large-scale market data, generates predictive growth models, and automates structured strategic roadmaps.',
    capabilities: [
      'Real-time predictive forecasting',
      'Automated SWOT and risk modeling',
      'Interactive executive summaries'
    ],
    color: 'emerald',
    hex: '#00ff87',
    iconType: 'chart',
    image: '/business-analyst.png'
  },
  {
    id: 'cto',
    name: 'Chief Technology Officer',
    shortTitle: 'CTO',
    role: 'System Architecture & Devops',
    description: 'Designs enterprise system architectures, conducts automated security audits, and orchestrates containerized cloud pipelines.',
    capabilities: [
      'Multi-cloud infrastructure design',
      'Real-time code and security auditing',
      'Automated scalability forecasting'
    ],
    color: 'cyan',
    hex: '#00f0ff',
    iconType: 'matrix',
    image: '/cto.png'
  },
  {
    id: 'cfo',
    name: 'Chief Financial Officer',
    shortTitle: 'CFO',
    role: 'Quantitative Finance & Ledger Audit',
    description: 'Conducts automated ledger verification, fiscal risk simulation, and algorithmic budget optimization pipelines.',
    capabilities: [
      'Algorithmic budget allocation',
      'Real-time ledger audit and compliance',
      'Simulated tax and fiscal risk modeling'
    ],
    color: 'amber',
    hex: '#ff9f00',
    iconType: 'flow',
    image: '/cfo.png'
  },
  {
    id: 'manager',
    name: 'Operations Manager',
    shortTitle: 'MGR',
    role: 'Agile Orchestration & Logistics',
    description: 'Orchestrates cross-department schedules, monitors project velocity metrics, and dynamically assigns tasks to resolve bottlenecks.',
    capabilities: [
      'Dynamic dependency mapping',
      'Velocity and bottleneck tracking',
      'Automated team resource balancing'
    ],
    color: 'purple',
    hex: '#bd00ff',
    iconType: 'radar',
    image: '/operations-manager.png'
  },
  {
    id: 'teacher',
    name: 'Academic Educator',
    shortTitle: 'EDU',
    role: 'Curriculum Synthesis & Tutoring',
    description: 'Generates specialized learning paths, provides real-time tutoring with interactive examples, and assesses knowledge retention.',
    capabilities: [
      'Adaptive knowledge graph synthesis',
      'Multi-modal contextual explaining',
      'Automated progress metric reports'
    ],
    color: 'pink',
    hex: '#ff007a',
    iconType: 'atom',
    image: '/academic-advisor.png'
  },
  {
    id: 'interviewer',
    name: 'Talent Assessor',
    shortTitle: 'HR',
    role: 'Conversational Quality Evaluation',
    description: 'Conducts conversational mock interviews, analyzes semantic sentiment, and scores technical and communication skills.',
    capabilities: [
      'Live semantic sentiment profiling',
      'Context-aware technical scoring',
      'Personalized interview feedback reports'
    ],
    color: 'rose',
    hex: '#ff2a5f',
    iconType: 'waves',
    image: '/hr.png'
  },
  {
    id: 'technical-interviewer',
    name: 'Technical Interviewer',
    shortTitle: 'TI',
    role: 'Full-Stack Technical Assessment & Coding Interviewer',
    description: 'Conducts interactive live technical interviews, assesses code architecture, and evaluates full-stack system design proficiency.',
    capabilities: [
      'Real-time coding & AST evaluation',
      'System design architecture assessment',
      'Algorithmic complexity & optimization profiling'
    ],
    color: 'cyan',
    hex: '#00f0ff',
    iconType: 'matrix',
    image: '/technical-interviewer.png'
  }
];
