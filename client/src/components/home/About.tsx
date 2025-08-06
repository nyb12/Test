export default function About() {
  const tags = [
    "Clean Design",
    "Minimalist",
    "Responsive",
    "Fast Loading"
  ];
  
  return (
    <section className="bg-gray-50 rounded-xl p-10 mb-16">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-6">About This Design</h2>
        <p className="text-gray-600 mb-8">
          This minimalist design puts content first with clean typography, ample white space, and subtle animations. 
          The monochromatic color scheme maintains focus on what matters most—your content.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {tags.map((tag, index) => (
            <span 
              key={index}
              className="inline-block px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
