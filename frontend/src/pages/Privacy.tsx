import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: '1. Data we collect',
    content: `We collect information you provide directly when you create an account (name, email address, password). We also collect data you upload to the platform for processing (documents, files, data sources). Usage data such as feature interactions and error logs may be collected to improve the service.`,
  },
  {
    title: '2. How we use your data',
    content: `Your data is used solely to provide and improve the CogniGrid AI service. Uploaded files are processed to extract entities and relationships for your knowledge graph. We do not sell your data to third parties. We do not use your data to train AI models without your explicit consent.`,
  },
  {
    title: '3. Data storage and security',
    content: `All data is stored on infrastructure you control when deployed on-premise. For cloud deployments, data is stored in encrypted form at rest (AES-256) and in transit (TLS 1.3). Access is restricted to authorized users only. We apply industry-standard security practices including regular audits.`,
  },
  {
    title: '4. Data retention',
    content: `Your account data is retained as long as your account is active. Uploaded files and extracted knowledge graphs are retained until you delete them. Upon account deletion, all personal data and uploaded content are permanently erased within 30 days.`,
  },
  {
    title: '5. Your rights (GDPR)',
    content: `If you are in the European Union, you have the right to access, rectify, and erase your personal data. You may also request data portability or restrict processing. To exercise these rights, contact us at privacy@cognigrid.ai. We will respond within 30 days.`,
  },
  {
    title: '6. Cookies',
    content: `We use only essential cookies required for authentication and session management. We do not use tracking or advertising cookies. You can disable cookies in your browser settings, but this may affect platform functionality.`,
  },
  {
    title: '7. Third-party services',
    content: `The platform may optionally connect to third-party LLM providers (OpenAI, Anthropic) if configured by the administrator. In such cases, queries sent to these providers are subject to their respective privacy policies. We recommend reviewing these policies before enabling such integrations.`,
  },
  {
    title: '8. Contact',
    content: `For any privacy-related questions or requests, please contact our Data Protection Officer at: privacy@cognigrid.ai`,
  },
]

export default function Privacy() {
  return (
    <div className="min-h-screen bg-cg-bg text-cg-txt">

      <header className="border-b border-cg-border bg-cg-surface">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <img src="/CogniGrid.AI.png" alt="CogniGrid AI" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-cg-muted hover:text-cg-txt transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-cg-txt mb-2">Privacy Policy</h1>
          <p className="text-sm text-cg-faint">Protection des données — Last updated: April 2026</p>
        </div>

        <div className="bg-cg-surface border border-cg-border rounded-xl divide-y divide-cg-border">
          {SECTIONS.map(s => (
            <div key={s.title} className="px-8 py-6">
              <h2 className="text-sm font-semibold text-cg-txt mb-3">{s.title}</h2>
              <p className="text-sm text-cg-muted leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-cg-border mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-cg-faint">© 2026 CogniGrid AI</p>
          <div className="flex gap-5 text-xs text-cg-faint">
            <Link to="/terms"   className="hover:text-cg-muted transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-cg-muted transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
