interface Tab {
  key: string
  label: string
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export default function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-cg-bg rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            active === tab.key
              ? 'bg-cg-surface text-cg-txt shadow-sm border border-cg-border'
              : 'text-cg-muted hover:text-cg-txt'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
