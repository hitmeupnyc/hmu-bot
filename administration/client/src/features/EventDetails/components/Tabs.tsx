import { ReactNode } from 'react';

interface TabsProps {
  activeTab: 'overview';
  onTabChange: (tab: 'overview') => void;
  children: ReactNode;
}

export function Tabs({ activeTab, onTabChange, children }: TabsProps) {
  const tabs = [{ key: 'overview', label: 'Overview' }] as const;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}
