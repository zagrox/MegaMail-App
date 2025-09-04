

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { renderBlock } from './blocks';
import Icon, { ICONS } from '../Icon';
import AddBlockPopover from './AddBlockPopover';

interface SortableBlockProps {
    id: string;
    item: any;
    index: number;
    onRemove: (id: string) => void;
    onDuplicate: (id: string) => void;
    onEditImage: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onEdit: (id: string) => void;
    onContentChange: (id: string, content: any) => void;
    onStyleChange: (id: string, style: any) => void;
    onInsertBlock: (blockType: string) => void;
    onSetColumns: (id: string, layoutConfig: { flex: number }[]) => void;
    allHandlers: any; // Object containing all handlers for nested blocks
    selectedBlockId: string | null;
}

export const SortableBlock = (props: SortableBlockProps) => {
    const { id, item, onRemove, onDuplicate, isSelected, onSelect, onEdit, onInsertBlock } = props;
    const { t } = useTranslation();
    const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleInsert = (blockType: string) => {
        onInsertBlock(blockType);
        setIsAddPopoverOpen(false);
    };

    const getBlockTypeTranslationKey = (type: string) => {
        const key = type.toLowerCase();
        // Check if a specific translation exists, otherwise fallback to the type itself
        return t(key, { ns: 'translation', defaultValue: type });
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-block-id={id}
            className={`canvas-item ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelect(id);}}
        >
            {renderBlock(item, props)}

            {isSelected && (
                <>
                    <div
                        className="canvas-item-actions-bar"
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="canvas-item-actions-bar-left">
                           {/* FIX: Changed path prop to children for Icon component */}
                           <Icon>{ICONS.DRAG_HANDLE}</Icon>
                           <span>{getBlockTypeTranslationKey(item.type)}</span>
                        </div>
                        <div className="canvas-item-actions-bar-right">
                            {/* FIX: Changed path prop to children for Icon component */}
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(id); }} aria-label={t('editBlock')}>
                                <Icon>{ICONS.PENCIL}</Icon>
                            </button>
                            {/* FIX: Changed path prop to children for Icon component */}
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onDuplicate(id); }} aria-label={t('duplicateBlock')}>
                                <Icon>{ICONS.DUPLICATE}</Icon>
                            </button>
                            {/* FIX: Changed path prop to children for Icon component */}
                            <button className="btn-icon btn-icon-danger" onClick={(e) => { e.stopPropagation(); onRemove(id); }} aria-label={t('deleteBlock')}>
                                <Icon>{ICONS.DELETE}</Icon>
                            </button>
                        </div>
                    </div>

                    <div className="canvas-item-add-wrapper">
                        <button
                            className="canvas-item-add-button"
                            onClick={(e) => { e.stopPropagation(); setIsAddPopoverOpen(p => !p); }}
                            aria-label={t('addBlock')}
                        >
                            {/* FIX: Changed path prop to children for Icon component */}
                            <Icon>{ICONS.PLUS}</Icon>
                        </button>
                        {isAddPopoverOpen && (
                            <AddBlockPopover onSelectBlockType={handleInsert} onClose={() => setIsAddPopoverOpen(false)} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};