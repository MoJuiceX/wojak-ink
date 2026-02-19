/**
 * Emoji Ring Editor Component
 *
 * Drag-and-drop interface for arranging emojis in the 18-slot ring.
 * Owned emojis can be placed in any position around the username.
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { EmojiRing } from './EmojiRing';
import type { EmojiRingPositions } from './EmojiRing';

interface EmojiRingEditorProps {
  username: string;
  nameEffectClass?: string;
  ownedEmojis: string[];
  currentPositions: EmojiRingPositions;
  onSave: (positions: EmojiRingPositions) => Promise<void>;
  title?: string | null;
  className?: string;
}

// Position labels for the ring
const POSITIONS = [
  'left_1', 'left_2', 'left_3',
  'right_1', 'right_2', 'right_3',
  'top_1', 'top_2', 'top_3', 'top_4', 'top_5', 'top_6',
  'bottom_1', 'bottom_2', 'bottom_3', 'bottom_4', 'bottom_5', 'bottom_6',
] as const;

type Position = typeof POSITIONS[number];

// Draggable emoji from palette
function DraggableEmoji({ emoji, id }: { emoji: string; id: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="w-10 h-10 flex items-center justify-center text-xl cursor-grab active:cursor-grabbing bg-white/10 rounded-lg hover:bg-white/20 transition-colors select-none"
    >
      {emoji}
    </div>
  );
}

// Droppable slot in the ring
function DroppableSlot({
  position,
  emoji,
  onClear,
}: {
  position: Position;
  emoji: string | null;
  onClear: (pos: Position) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: position,
  });

  const handleClick = () => {
    if (emoji) {
      onClear(position);
    }
  };

  // Determine position label
  const row = position.split('_')[0];
  const num = position.split('_')[1];

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`
        w-8 h-8 flex items-center justify-center text-lg
        border-2 border-dashed rounded-lg transition-all cursor-pointer
        ${isOver ? 'border-orange-400 bg-orange-500/30 scale-110' : 'border-white/30 hover:border-white/50'}
        ${emoji ? 'bg-white/10' : 'bg-transparent'}
      `}
      title={emoji ? `Click to remove (${row} ${num})` : `Drop emoji here (${row} ${num})`}
    >
      {emoji || <span className="text-xs text-white/30">{num}</span>}
    </div>
  );
}

export function EmojiRingEditor({
  username,
  nameEffectClass,
  ownedEmojis,
  currentPositions,
  onSave,
  title,
  className = '',
}: EmojiRingEditorProps) {
  const [positions, setPositions] = useState<EmojiRingPositions>(currentPositions);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sensors for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dropPosition = over.id as Position;
    const draggedEmoji = (active.id as string).replace('emoji-', '');

    // If valid position, place the emoji
    if (POSITIONS.includes(dropPosition as Position)) {
      setPositions(prev => ({
        ...prev,
        [dropPosition]: draggedEmoji,
      }));
      setHasChanges(true);
    }
  }, []);

  const handleClearSlot = useCallback((position: Position) => {
    setPositions(prev => ({
      ...prev,
      [position]: null,
    }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(positions);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    const cleared: EmojiRingPositions = {};
    POSITIONS.forEach(pos => {
      cleared[pos] = null;
    });
    setPositions(cleared);
    setHasChanges(true);
  };

  // Active emoji for drag overlay
  const activeEmoji = activeId?.replace('emoji-', '');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`emoji-ring-editor ${className}`}>
        {/* Preview Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">Preview</h3>
          <div className="bg-white/5 rounded-xl p-4 flex justify-center">
            <EmojiRing
              username={username}
              nameEffectClass={nameEffectClass}
              positions={positions}
              showTitle={!!title}
              title={title}
              size="large"
            />
          </div>
        </div>

        {/* Ring Layout Editor */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">Arrange Slots</h3>
          <div className="bg-white/5 rounded-xl p-4">
            {/* Top Row */}
            <div className="flex justify-center gap-1 mb-2">
              <DroppableSlot position="top_1" emoji={positions.top_1 || null} onClear={handleClearSlot} />
              <DroppableSlot position="top_2" emoji={positions.top_2 || null} onClear={handleClearSlot} />
              <DroppableSlot position="top_3" emoji={positions.top_3 || null} onClear={handleClearSlot} />
              <DroppableSlot position="top_4" emoji={positions.top_4 || null} onClear={handleClearSlot} />
              <DroppableSlot position="top_5" emoji={positions.top_5 || null} onClear={handleClearSlot} />
              <DroppableSlot position="top_6" emoji={positions.top_6 || null} onClear={handleClearSlot} />
            </div>

            {/* Middle Section: Left + Name + Right */}
            <div className="flex items-center justify-center gap-2 my-3">
              <div className="flex flex-col gap-1">
                <DroppableSlot position="left_1" emoji={positions.left_1 || null} onClear={handleClearSlot} />
                <DroppableSlot position="left_2" emoji={positions.left_2 || null} onClear={handleClearSlot} />
                <DroppableSlot position="left_3" emoji={positions.left_3 || null} onClear={handleClearSlot} />
              </div>

              <div className="px-4 py-2 bg-white/10 rounded-lg min-w-[120px] text-center">
                <span className={nameEffectClass}>{username}</span>
              </div>

              <div className="flex flex-col gap-1">
                <DroppableSlot position="right_1" emoji={positions.right_1 || null} onClear={handleClearSlot} />
                <DroppableSlot position="right_2" emoji={positions.right_2 || null} onClear={handleClearSlot} />
                <DroppableSlot position="right_3" emoji={positions.right_3 || null} onClear={handleClearSlot} />
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex justify-center gap-1 mt-2">
              <DroppableSlot position="bottom_1" emoji={positions.bottom_1 || null} onClear={handleClearSlot} />
              <DroppableSlot position="bottom_2" emoji={positions.bottom_2 || null} onClear={handleClearSlot} />
              <DroppableSlot position="bottom_3" emoji={positions.bottom_3 || null} onClear={handleClearSlot} />
              <DroppableSlot position="bottom_4" emoji={positions.bottom_4 || null} onClear={handleClearSlot} />
              <DroppableSlot position="bottom_5" emoji={positions.bottom_5 || null} onClear={handleClearSlot} />
              <DroppableSlot position="bottom_6" emoji={positions.bottom_6 || null} onClear={handleClearSlot} />
            </div>
          </div>
        </div>

        {/* Emoji Palette */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">
            Your Emojis ({ownedEmojis.length})
          </h3>
          <div className="bg-white/5 rounded-xl p-4">
            {ownedEmojis.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-4">
                Purchase emojis from the shop to use here
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {ownedEmojis.map((emoji, index) => (
                  <DraggableEmoji
                    key={`${emoji}-${index}`}
                    emoji={emoji}
                    id={`emoji-${emoji}`}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Drag emojis to slots above. Click a slot to clear it.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
              ${hasChanges && !isSaving
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
              }
            `}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeEmoji ? (
          <div className="w-10 h-10 flex items-center justify-center text-xl bg-orange-500/80 rounded-lg shadow-lg">
            {activeEmoji}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export type { EmojiRingEditorProps };
