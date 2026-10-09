import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalDropdownProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  anchorRef,
  isOpen,
  onClose,
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor || !menu) return;

      const anchorBounds = anchor.getBoundingClientRect();
      const menuBounds = menu.getBoundingClientRect();
      const margin = 8;
      const maxLeft = Math.max(margin, window.innerWidth - menuBounds.width - margin);
      const left = Math.min(
        Math.max(margin, anchorBounds.right - menuBounds.width),
        maxLeft
      );
      const availableBelow = window.innerHeight - anchorBounds.bottom - margin;
      const top =
        menuBounds.height <= availableBelow ||
        anchorBounds.top < menuBounds.height + margin
          ? anchorBounds.bottom + 4
          : anchorBounds.top - menuBounds.height - 4;
      const maxTop = Math.max(margin, window.innerHeight - menuBounds.height - margin);

      setPosition({ top: Math.min(Math.max(margin, top), maxTop), left });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !anchorRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    updatePosition();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? 'visible' : 'hidden',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 16px)',
      }}
      className="z-[100] w-44 overflow-y-auto rounded-lg border border-slate-750 bg-slate-900 py-1 text-xs shadow-xl"
    >
      {children}
    </div>,
    document.body
  );
};
