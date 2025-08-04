import { useState, useRef, useCallback } from 'react';

interface HeaderMappingProps {
  sourceHeaders: string[];
  targetHeaders: { key: string; label: string; required: boolean }[];
  mapping: Record<string, string | null>;
  onMappingChange: (mapping: Record<string, string | null>) => void;
}

interface DragState {
  isDragging: boolean;
  draggedHeader: string | null;
  draggedType: 'source' | 'target' | null;
}

interface Connection {
  sourceHeader: string;
  targetKey: string;
  sourceIndex: number;
  targetIndex: number;
}

export function HeaderMapping({ sourceHeaders, targetHeaders, mapping, onMappingChange }: HeaderMappingProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedHeader: null,
    draggedType: null
  });
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const sourceContainerRef = useRef<HTMLDivElement>(null);
  const targetContainerRef = useRef<HTMLDivElement>(null);

  // Calculate connections for drawing lines
  const connections: Connection[] = [];
  Object.entries(mapping).forEach(([targetKey, sourceHeader]) => {
    if (sourceHeader) {
      const sourceIndex = sourceHeaders.indexOf(sourceHeader);
      const targetIndex = targetHeaders.findIndex(t => t.key === targetKey);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        connections.push({
          sourceHeader,
          targetKey,
          sourceIndex,
          targetIndex
        });
      }
    }
  });

  const handleDragStart = useCallback((header: string, type: 'source' | 'target') => {
    setDragState({
      isDragging: true,
      draggedHeader: header,
      draggedType: type
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedHeader: null,
      draggedType: null
    });
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, header: string, type: 'source' | 'target') => {
    e.preventDefault();
    if (dragState.isDragging && dragState.draggedType !== type) {
      setDropTarget(header);
    }
  }, [dragState]);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetHeader: string, targetType: 'source' | 'target') => {
    e.preventDefault();
    
    if (!dragState.draggedHeader || !dragState.draggedType) return;
    
    const newMapping = { ...mapping };
    
    if (dragState.draggedType === 'source' && targetType === 'target') {
      // Dragging from source to target - create new mapping
      const targetKey = targetHeaders.find(t => t.label === targetHeader)?.key;
      if (targetKey) {
        // Remove any existing mapping to this target
        Object.keys(newMapping).forEach(key => {
          if (newMapping[key] === dragState.draggedHeader) {
            newMapping[key] = null;
          }
        });
        // Create new mapping
        newMapping[targetKey] = dragState.draggedHeader;
      }
    } else if (dragState.draggedType === 'target' && targetType === 'source') {
      // Dragging from target to source - create new mapping
      const draggedTargetKey = targetHeaders.find(t => t.label === dragState.draggedHeader)?.key;
      if (draggedTargetKey) {
        // Remove any existing mapping to this target
        Object.keys(newMapping).forEach(key => {
          if (newMapping[key] === targetHeader) {
            newMapping[key] = null;
          }
        });
        // Create new mapping
        newMapping[draggedTargetKey] = targetHeader;
      }
    }
    
    onMappingChange(newMapping);
    handleDragEnd();
  }, [dragState, mapping, targetHeaders, onMappingChange, handleDragEnd]);

  const handleSvgDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!dragState.draggedHeader) return;
    
    // Dropping on SVG area removes any existing connection
    const newMapping = { ...mapping };
    
    if (dragState.draggedType === 'source') {
      // Remove mapping where this source header is used
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === dragState.draggedHeader) {
          newMapping[key] = null;
        }
      });
    } else if (dragState.draggedType === 'target') {
      // Remove mapping for this target
      const targetKey = targetHeaders.find(t => t.label === dragState.draggedHeader)?.key;
      if (targetKey) {
        newMapping[targetKey] = null;
      }
    }
    
    onMappingChange(newMapping);
    handleDragEnd();
  }, [dragState, mapping, targetHeaders, onMappingChange, handleDragEnd]);

  const getHeaderElement = useCallback((_header: string, index: number, type: 'source' | 'target') => {
    const container = type === 'source' ? sourceContainerRef.current : targetContainerRef.current;
    if (!container) return null;
    
    const headerElements = container.querySelectorAll('[data-header]');
    return headerElements[index] as HTMLElement;
  }, []);

  const calculateLineCoordinates = useCallback((connection: Connection) => {
    const sourceElement = getHeaderElement(connection.sourceHeader, connection.sourceIndex, 'source');
    const targetElement = getHeaderElement(targetHeaders[connection.targetIndex].label, connection.targetIndex, 'target');
    
    if (!sourceElement || !targetElement || !svgRef.current) {
      return null;
    }
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    
    const x1 = sourceRect.right - svgRect.left;
    const y1 = sourceRect.top + sourceRect.height / 2 - svgRect.top;
    const x2 = targetRect.left - svgRect.left;
    const y2 = targetRect.top + targetRect.height / 2 - svgRect.top;
    
    return { x1, y1, x2, y2 };
  }, [getHeaderElement, targetHeaders]);

  return (
    <div className="flex gap-0 min-h-[400px]">
      {/* Source Headers */}
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Your Column Headers</h4>
        <div 
          ref={sourceContainerRef}
          data-testid="source-headers"
          className="space-y-2"
        >
          {sourceHeaders.map((header, index) => (
            <div
              key={index}
              data-header={header}
              data-testid="source-header"
              draggable
              onDragStart={() => handleDragStart(header, 'source')}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, header, 'source')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, header, 'source')}
              className={`
                px-3 py-2 bg-blue-50 border border-blue-200 rounded-md cursor-move
                hover:bg-blue-100 transition-colors
                ${dragState.isDragging && dragState.draggedHeader === header ? 'opacity-50 scale-95' : ''}
                ${dropTarget === header && dragState.draggedType === 'target' ? 'bg-green-100 border-green-300' : ''}
              `}
            >
              <div className="flex items-center">
                <div className="w-2 h-6 bg-blue-400 rounded-sm mr-2 flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-900 truncate">{header}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Connection Area */}
      <div className="w-16 flex-shrink-0 relative">
        <svg
          ref={svgRef}
          data-testid="mapping-svg"
          className="w-full h-full absolute inset-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleSvgDrop}
        >
          {connections.map((connection) => {
            const coords = calculateLineCoordinates(connection);
            if (!coords) return null;
            
            return (
              <g key={`${connection.sourceHeader}-${connection.targetKey}`}>
                <line
                  data-testid="connection-line"
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeDasharray="none"
                />
                <circle
                  cx={coords.x1}
                  cy={coords.y1}
                  r="4"
                  fill="#3B82F6"
                />
                <circle
                  cx={coords.x2}
                  cy={coords.y2}
                  r="4"
                  fill="#3B82F6"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full">
            <defs>
              <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
                <circle cx="2" cy="2" r="1" fill="#9CA3AF" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>
      </div>

      {/* Target Headers */}
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Expected Fields</h4>
        <div 
          ref={targetContainerRef}
          data-testid="target-headers"
          className="space-y-2"
        >
          {targetHeaders.map((target) => {
            const isConnected = mapping[target.key] !== null && mapping[target.key] !== undefined;
            const connectedSource = mapping[target.key];
            
            return (
              <div
                key={target.key}
                data-header={target.label}
                data-testid="target-header"
                draggable
                onDragStart={() => handleDragStart(target.label, 'target')}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, target.label, 'target')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, target.label, 'target')}
                className={`
                  px-3 py-2 border rounded-md cursor-move transition-colors
                  ${isConnected 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : target.required 
                      ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }
                  ${dragState.isDragging && dragState.draggedHeader === target.label ? 'opacity-50 scale-95' : ''}
                  ${dropTarget === target.label && dragState.draggedType === 'source' ? 'bg-green-100 border-green-300' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <div className={`w-2 h-6 rounded-sm mr-2 flex-shrink-0 ${
                      isConnected ? 'bg-green-400' : target.required ? 'bg-red-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {target.label}
                      {target.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </div>
                  {isConnected && connectedSource && (
                    <div className="ml-2 flex-shrink-0">
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        {connectedSource}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden mapping indicators for testing */}
      <div className="hidden">
        {connections.map((connection) => (
          <div
            key={`${connection.sourceHeader}-${connection.targetKey}`}
            data-testid="mapping-indicator"
          >
            {connection.sourceHeader} → {targetHeaders.find(t => t.key === connection.targetKey)?.label}
          </div>
        ))}
      </div>
    </div>
  );
}
