// components/Dashboard/DocumentsTab.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { extend } from '../../components/svg';

const tabs = ['mydocs', 'shared', 'fleetdocs', 'publicdocs'];
const labelMap: Record<string, string> = {
  mydocs: 'My docs',
  shared: 'Shared',
  fleetdocs: 'Fleet docs',
  publicdocs: 'Public docs',
};

const documents = [
  {
    title: 'Engine-Check-Guide.pdf',
    updated: '11m ago',
    createdBy: 'jordan.m@ironfleet.ai',
  },
  {
    title: 'Cabin-Safety-Tips.docx',
    updated: '20m ago',
    createdBy: 'rachel.k@ironfleet.ai',
  },
  {
    title: 'Oil-Pressure-Checklist.pdf',
    updated: '1d ago',
    createdBy: 'samir.k@ironfleet.ai',
  },
];

export default function DocumentsTab() {
  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6 col-span-1.5 w-full">
      <div className="flex flex-row justify-between items-center mb-4">
        <h3 className="text-xs sm:text-sm font-semibold">All Documents</h3>
        <button className="flex items-center justify-center hover:bg-gray-100 rounded-md p-1">
          <img src={extend} alt="extend" className="w-5 h-5 cursor-pointer" />
        </button>
      </div>

      <Tabs defaultValue="mydocs" className="flex flex-col">
        <TabsList className="flex min-w-0 overflow-x-auto border-b border-gray-200 mb-4 no-scrollbar">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {labelMap[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="mydocs"
          className="text-xs sm:text-sm text-gray-700 divide-y divide-gray-200 h-44 overflow-y-auto"
        >
          {documents.map(({ title, updated, createdBy }) => (
            <div key={title} className="flex justify-between py-3 items-center">
              <div>
                <div className="font-semibold text-gray-800 text-sm">
                  {title}
                </div>
                <div className="text-gray-400">{`Updated ${updated}`}</div>
              </div>
              <div className="text-xs text-gray-500">{createdBy}</div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="shared" className="text-xs text-gray-700">
          <div className="py-3 text-gray-500">No shared documents yet.</div>
        </TabsContent>

        <TabsContent value="fleetdocs" className="text-xs text-gray-700">
          <div className="py-3 text-gray-500">No fleet documents yet.</div>
        </TabsContent>

        <TabsContent value="publicdocs" className="text-xs text-gray-700">
          <div className="py-3 text-gray-500">No public documents yet.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
