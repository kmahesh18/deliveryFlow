import React from "react";

const StyleTest = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 text-center">
          TailwindCSS Style Test
        </h1>

        {/* Color Test */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Color Palette Test
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary-500 h-20 rounded-lg flex items-center justify-center text-white font-medium">
              Primary
            </div>
            <div className="bg-success-500 h-20 rounded-lg flex items-center justify-center text-white font-medium">
              Success
            </div>
            <div className="bg-warning-500 h-20 rounded-lg flex items-center justify-center text-white font-medium">
              Warning
            </div>
            <div className="bg-danger-500 h-20 rounded-lg flex items-center justify-center text-white font-medium">
              Danger
            </div>
          </div>
        </div>

        {/* Button Test */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Button Components
          </h2>
          <div className="flex flex-wrap gap-4">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="btn-outline">Outline Button</button>
            <button className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg transition-colors">
              Success Button
            </button>
          </div>
        </div>

        {/* Form Test */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Form Components
          </h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Input
              </label>
              <input
                type="text"
                placeholder="Enter some text..."
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Textarea
              </label>
              <textarea
                placeholder="Enter your message..."
                rows={4}
                className="textarea-field"
              />
            </div>
          </div>
        </div>

        {/* Badge Test */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Status Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="badge-pending">Pending</span>
            <span className="badge-assigned">Assigned</span>
            <span className="badge-picked-up">Picked Up</span>
            <span className="badge-delivered">Delivered</span>
            <span className="badge-cancelled">Cancelled</span>
          </div>
        </div>

        {/* Grid Test */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Grid Layout Test
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">Card 1</h3>
              <p className="text-blue-700 text-sm">
                This is a test card with gradient background.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900">Card 2</h3>
              <p className="text-green-700 text-sm">
                This is another test card with different colors.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900">Card 3</h3>
              <p className="text-purple-700 text-sm">
                And here's a third card to complete the set.
              </p>
            </div>
          </div>
        </div>

        {/* Animation Test */}
        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Animation Test
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-100 p-4 rounded-lg animate-fade-in">
              <p className="text-blue-800 text-sm text-center">Fade In</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg animate-slide-in">
              <p className="text-green-800 text-sm text-center">Slide In</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg animate-bounce-in">
              <p className="text-purple-800 text-sm text-center">Bounce In</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg animate-pulse">
              <p className="text-yellow-800 text-sm text-center">Pulse</p>
            </div>
          </div>
        </div>

        {/* Shadow Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Shadow Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-soft">
              <h3 className="font-semibold">Soft Shadow</h3>
              <p className="text-gray-600 text-sm">Subtle shadow effect</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-medium">
              <h3 className="font-semibold">Medium Shadow</h3>
              <p className="text-gray-600 text-sm">More prominent shadow</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-strong">
              <h3 className="font-semibold">Strong Shadow</h3>
              <p className="text-gray-600 text-sm">Bold shadow effect</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleTest;
