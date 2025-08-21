import { useState } from 'react';
import { PlusIcon, ShieldCheckIcon, UsersIcon, KeyIcon, CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Flag } from '@/hooks/useFlags';

interface FlagListProps {
  flags: Flag[];
  selectedFlag: Flag | null;
  onFlagSelect: (flag: Flag) => void;
  onGrantFlag: () => void;
  isLoading?: boolean;
}

const flagCategoryIcons = {
  verification: ShieldCheckIcon,
  subscription: KeyIcon,
  feature: CheckCircleIcon,
  compliance: ExclamationTriangleIcon,
  admin: UsersIcon,
};

const flagCategoryColors = {
  verification: 'bg-blue-100 text-blue-800 border-blue-200',
  subscription: 'bg-purple-100 text-purple-800 border-purple-200',
  feature: 'bg-green-100 text-green-800 border-green-200',
  compliance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
};

export function FlagList({ 
  flags, 
  selectedFlag, 
  onFlagSelect, 
  onGrantFlag, 
  isLoading = false 
}: FlagListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Filter flags based on search term and selected categories
  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategories.size === 0 || 
                           selectedCategories.has(flag.category || 'other');
    
    return matchesSearch && matchesCategory;
  });

  // Group filtered flags by category
  const flagsByCategory = filteredFlags.reduce((acc, flag) => {
    const category = flag.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(flag);
    return acc;
  }, {} as Record<string, Flag[]>);

  // Get all unique categories
  const allCategories = Array.from(new Set(flags.map(f => f.category || 'other')));

  const toggleCategory = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow animate-pulse">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Flags</h2>
          <button
            onClick={onGrantFlag}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Grant
          </button>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search flags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {allCategories.map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedCategories.has(category)
                  ? flagCategoryColors[category as keyof typeof flagCategoryColors] || 'bg-gray-100 text-gray-800 border-gray-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
          {selectedCategories.size > 0 && (
            <button
              onClick={() => setSelectedCategories(new Set())}
              className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 hover:bg-red-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {Object.entries(flagsByCategory).length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            No flags match your search criteria
          </div>
        ) : (
          Object.entries(flagsByCategory).map(([category, categoryFlags]) => (
            <div key={category} className="p-4">
              <h3 className="font-medium text-sm text-gray-500 uppercase tracking-wider mb-2">
                {category} ({categoryFlags.length})
              </h3>
              <div className="space-y-2">
                {categoryFlags.map((flag) => {
                  const Icon = flagCategoryIcons[category as keyof typeof flagCategoryIcons] || ShieldCheckIcon;
                  
                  return (
                    <button
                      key={flag.id}
                      onClick={() => onFlagSelect(flag)}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                        selectedFlag?.id === flag.id
                          ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-5 w-5 mt-0.5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{flag.name}</div>
                          {flag.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {flag.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}