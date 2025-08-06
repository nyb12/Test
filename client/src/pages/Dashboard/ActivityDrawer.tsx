import React from 'react';
import { X } from 'lucide-react';

interface ActivityDrawerProps {
  setIsActivityDrawerOpen: (open: boolean) => void;
}

export default function ActivityDrawer({
  setIsActivityDrawerOpen,
}: ActivityDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30"
        onClick={() => setIsActivityDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="relative bg-white w-80 max-w-full h-full shadow-lg p-6 animate-slide-in-right">
        <button
          className="absolute top-4 right-4 text-gray-500"
          onClick={() => setIsActivityDrawerOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold mb-4">Activity</h2>
        {/* Your activity content here */}
        <p>Recent activity will be shown here.</p>
      </div>
    </div>
  );
}
