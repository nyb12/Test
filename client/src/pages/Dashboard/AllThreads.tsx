import React from 'react';
import { Link } from 'wouter';
import { Users, Clock, MessageCircle } from 'lucide-react';

interface Thread {
  id: string;
  title: string;
  participants: number;
  createdAt: string;
  lastActivity: string;
  isActive?: boolean;
}

interface AllThreadsProps {
  threads?: Thread[];
}

export default function AllThreads({ threads = [] }: AllThreadsProps) {
  // Mock data for demonstration - replace with real data
  const mockThreads: Thread[] = [
    {
      id: '1',
      title: 'Engine Maintenance Discussion',
      participants: 5,
      createdAt: '2024-01-15',
      lastActivity: '2 hours ago',
      isActive: true,
    },
    {
      id: '2',
      title: 'Safety Protocol Review',
      participants: 8,
      createdAt: '2024-01-14',
      lastActivity: '1 day ago',
    },
    {
      id: '3',
      title: 'Flight Schedule Updates',
      participants: 12,
      createdAt: '2024-01-13',
      lastActivity: '3 days ago',
    },
    {
      id: '4',
      title: 'Technical Support - Landing Gear',
      participants: 3,
      createdAt: '2024-01-12',
      lastActivity: '1 week ago',
    },
    {
      id: '5',
      title: 'Training Session Planning',
      participants: 6,
      createdAt: '2024-01-11',
      lastActivity: '1 week ago',
    },
  ];

  const displayThreads = threads.length > 0 ? threads : mockThreads;

  return (
    <div className="bg-white rounded-2xl shadow p-4 md:p-6 w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">All Threads</h3>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-500 uppercase border-b">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium normal-case">
                Title
              </th>
              <th scope="col" className="px-3 py-2 font-medium normal-case">
                Created on
              </th>
            </tr>
          </thead>
          <tbody>
            {displayThreads.map((thread) => (
              <tr
                key={thread.id}
                className={`cursor-pointer border-b transition-colors ${
                  thread.isActive
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
              >
                <td className="px-3 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {thread.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      {`${thread.participants} ${
                        thread.participants === 1 ? 'person' : 'people'
                      } included`}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(thread.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  , {new Date(thread.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {displayThreads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No threads available</p>
        </div>
      )}
    </div>
  );
}
