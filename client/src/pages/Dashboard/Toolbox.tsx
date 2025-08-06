// components/Dashboard/Toolbox.tsx
import {
  askquestion,
  createdocument,
  findparts,
  generatechecklist,
  reviewedocument,
  troubleshoot,
} from '../../components/svg';

const tools = [
  { label: 'Ask a question', icon: askquestion },
  { label: 'Troubleshoot', icon: troubleshoot },
  { label: 'Generate Checklist', icon: generatechecklist },
  { label: 'Create Document', icon: createdocument },
  { label: 'Review Document', icon: reviewedocument },
  { label: 'Find Parts', icon: findparts },
];

export default function Toolbox() {
  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col items-center w-full">
      <h3 className="text-xs sm:text-sm font-semibold mb-6 self-start">
        AI Toolbox
      </h3>
      <div className="grid grid-cols-3 gap-x-6 gap-y-6 w-full justify-items-center">
        {tools.map(({ label, icon }, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full mb-2 flex items-center justify-center text-xs font-semibold text-gray-500">
              <img
                src={icon}
                alt={label}
                className="w-10 h-10 sm:w-12 sm:h-12 cursor-pointer"
              />
            </div>
            <div className="text-[9px] sm:text-xs text-center text-gray-600">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
