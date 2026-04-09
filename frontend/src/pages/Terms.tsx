import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    content: `By accessing or using CogniGrid AI ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Platform.`,
  },
  {
    title: '2. Use of the platform',
    content: `You may use the Platform only for lawful purposes and in accordance with these Terms. You agree not to use the Platform to upload content that infringes intellectual property rights, contains malware or harmful code, violates applicable laws, or is used for unauthorized data harvesting or scraping.`,
  },
  {
    title: '3. Account responsibilities',
    content: `You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account at security@cognigrid.ai.`,
  },
  {
    title: '4. Intellectual property',
    content: `The Platform, including all software, design, and content, is the property of CogniGrid AI and is protected by intellectual property laws. You retain ownership of all data and content you upload. By uploading content, you grant CogniGrid AI a limited license to process your content solely to provide the service.`,
  },
  {
    title: '5. Data processing',
    content: `By using the Platform, you acknowledge that uploaded files will be processed by automated systems including AI and ML models to extract knowledge and insights. This processing occurs on your designated infrastructure (on-premise) or our secured cloud infrastructure, as configured.`,
  },
  {
    title: '6. Service availability',
    content: `We strive for high availability but do not guarantee uninterrupted access. The Platform may be temporarily unavailable due to maintenance, updates, or technical issues. We are not liable for any losses resulting from service interruptions.`,
  },
  {
    title: '7. Limitation of liability',
    content: `CogniGrid AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount paid by you for the service in the twelve months preceding the claim.`,
  },
  {
    title: '8. Modifications',
    content: `We reserve the right to modify these Terms at any time. Changes will be communicated via email or in-app notification. Continued use of the Platform after changes constitutes acceptance of the new Terms.`,
  },
  {
    title: '9. Governing law',
    content: `These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms shall be resolved through binding arbitration or in the courts of the applicable jurisdiction.`,
  },
  {
    title: '10. Contact',
    content: `For any questions regarding these Terms, contact us at: legal@cognigrid.ai`,
  },
]

export default function Terms() {
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
          <h1 className="text-3xl font-bold text-cg-txt mb-2">Terms & Conditions</h1>
          <p className="text-sm text-cg-faint">Conditions générales d'utilisation — Last updated: April 2026</p>
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
            <Link to="/privacy" className="hover:text-cg-muted transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-cg-muted transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
