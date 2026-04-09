import { Link } from 'react-router-dom'
import { Upload, Share2, Brain, MessageSquare, BarChart2, Bot, ArrowLeft, Check } from 'lucide-react'

const SERVICES = [
  {
    icon: Upload,
    title: 'Universal Data Ingestion',
    desc: 'Import any file or data source into the platform. Our engine parses and extracts structured knowledge automatically.',
    features: ['PDF, Word, Excel, CSV', 'Images with OCR', 'Source code (AST)', 'Databases & APIs', 'Web pages'],
  },
  {
    icon: Share2,
    title: 'Knowledge Graph',
    desc: 'All extracted entities and relationships are stored in a queryable graph database. Discover hidden connections in your data.',
    features: ['Auto entity extraction', 'Relationship mapping', 'Graph visualization', 'Cypher queries', 'Export to JSON/CSV'],
  },
  {
    icon: Brain,
    title: 'AI Engine',
    desc: 'Run machine learning analyses directly on your knowledge graph — no data science expertise required.',
    features: ['Anomaly detection', 'Time-series prediction', 'Data classification', 'PCA / UMAP reduction', 'Auto-generated insights'],
  },
  {
    icon: MessageSquare,
    title: 'GraphRAG Chat',
    desc: 'Chat with your entire knowledge base using natural language. Answers are always grounded in your actual data.',
    features: ['Natural language queries', 'Source citations', 'Conversation history', 'OpenAI / Ollama support', 'Hybrid retrieval'],
  },
  {
    icon: Bot,
    title: 'AI Agent',
    desc: 'An autonomous agent that can ingest files, run analyses, query the graph, and generate reports on your behalf.',
    features: ['Multi-step reasoning', 'Tool use', 'Long-term memory', 'PDF report generation', 'Scheduled tasks'],
  },
  {
    icon: BarChart2,
    title: 'Reports & Monitoring',
    desc: 'Auto-generated PDF reports and real-time dashboards to track anomalies, predictions and system health.',
    features: ['Scheduled reports', 'Real-time alerts', 'Custom dashboards', 'Prometheus metrics', 'Grafana integration'],
  },
]

export default function Services() {
  return (
    <div className="min-h-screen bg-cg-bg text-cg-txt">

      {/* Nav */}
      <header className="border-b border-cg-border bg-cg-surface">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="/CogniGrid.AI.png" alt="CogniGrid AI" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-cg-muted hover:text-cg-txt transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-3xl font-bold text-cg-txt mb-3">Our Services</h1>
          <p className="text-cg-muted max-w-xl mx-auto text-sm">
            A complete AI-powered data intelligence platform — from raw files to actionable decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map(s => {
            const Icon = s.icon
            return (
              <div key={s.title} className="bg-cg-surface border border-cg-border rounded-xl p-6 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-blue-400" />
                </div>
                <h3 className="font-semibold text-cg-txt mb-2">{s.title}</h3>
                <p className="text-sm text-cg-muted leading-relaxed mb-5">{s.desc}</p>
                <ul className="mt-auto space-y-2">
                  {s.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-cg-muted">
                      <Check size={12} className="text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <Link to="/register"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium text-sm transition-colors">
            Get started for free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-cg-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-cg-faint">© 2026 CogniGrid AI</p>
          <div className="flex gap-5 text-xs text-cg-faint">
            <Link to="/privacy" className="hover:text-cg-muted transition-colors">Privacy</Link>
            <Link to="/terms"   className="hover:text-cg-muted transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
