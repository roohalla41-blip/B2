import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DesktopDashboardLinks from '@/components/sarraaf/DesktopDashboardLinks';

const STORAGE_KEY = 'dashboard_layout_v2';

export default function DashboardLinks({
  allLinks,
  renderLink,
  primaryCount = 9,
}) {
  const [layout, setLayout] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const linkMap = useMemo(() => {
    const m = {};
    for (const l of allLinks) m[l.path] = l;
    return m;
  }, [allLinks]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLayout(parsed.items || null);
      }
    } catch (e) {}
  }, []);

  const fullLayout = useMemo(() => {
    if (!layout) return allLinks.map(l => ({ type: 'link', path: l.path }));
    const used = new Set();
    for (const item of layout) {
      if (item.type === 'link') used.add(item.path);
      else if (item.type === 'folder') for (const p of item.paths || []) used.add(p);
    }
    const newLinks = allLinks.filter(l => !used.has(l.path)).map(l => ({ type: 'link', path: l.path }));
    return [...layout, ...newLinks];
  }, [layout, allLinks]);

  const save = useCallback((newLayout) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns: 3, items: newLayout }));
    } catch (e) {}
  }, []);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newLayout = [...fullLayout];

    if (source.droppableId === 'main' && destination.droppableId === 'main') {
      const [moved] = newLayout.splice(source.index, 1);
      newLayout.splice(destination.index, 0, moved);
    } else if (source.droppableId === 'main' && destination.droppableId === 'main-secondary') {
      const [moved] = newLayout.splice(source.index, 1);
      newLayout.splice(destination.index + primaryCount, 0, moved);
    } else if (source.droppableId === 'main-secondary' && destination.droppableId === 'main-secondary') {
      const [moved] = newLayout.splice(source.index + primaryCount, 1);
      newLayout.splice(destination.index + primaryCount, 0, moved);
    } else if (source.droppableId === 'main-secondary' && destination.droppableId === 'main') {
      const [moved] = newLayout.splice(source.index + primaryCount, 1);
      newLayout.splice(destination.index, 0, moved);
    }

    setLayout(newLayout);
    save(newLayout);
  };

  const renderItem = (item, index) => {
    if (item.type !== 'link') return null;
    const link = linkMap[item.path];
    if (!link) return null;
    return (
      <Draggable key={`link-${item.path}`} draggableId={`link-${item.path}`} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`w-full ${snapshot.isDragging ? 'opacity-80 z-50' : ''}`}
            style={provided.draggableProps.style}
          >
            {renderLink(link, false)}
          </div>
        )}
      </Draggable>
    );
  };

  const primaryItems = fullLayout.slice(0, primaryCount);
  const secondaryItems = fullLayout.slice(primaryCount);

  return (
    <>
    <DesktopDashboardLinks allLinks={allLinks} renderLink={renderLink} />
    <div className="md:hidden">
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Primary Grid — 3 columns mobile, 6 columns desktop */}
      <Droppable droppableId="main">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2 lg:gap-3 xl:gap-4 mb-3">
            {primaryItems.map((item, index) => renderItem(item, index))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* More Sections Button */}
      {secondaryItems.length > 0 && (
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-gradient-to-l from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all mb-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {secondaryItems.slice(0, 3).map((item, i) => {
                const link = item.type === 'link' ? linkMap[item.path] : null;
                const Icon = link?.icon;
                const gradient = link?.gradient || 'from-primary/30 to-primary/20';
                return (
                  <div key={i} className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center ring-2 ring-background`} style={{ zIndex: 3 - i }}>
                    {Icon && <Icon className="w-3 h-3 text-white" strokeWidth={2.2} />}
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] font-medium text-foreground">بخش‌های بیشتر</span>
          </div>
          {moreOpen ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-primary shrink-0" />}
        </button>
      )}

      {/* Secondary Section */}
      {moreOpen && secondaryItems.length > 0 && (
        <Droppable droppableId="main-secondary">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2 lg:gap-3 xl:gap-4 mb-3">
              {secondaryItems.map((item, index) => renderItem(item, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </DragDropContext>
    </div>
    </>
  );
}