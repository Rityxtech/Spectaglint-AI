import React, { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle, AlertCircle } from 'lucide-react';
import TechLoader from '../components/TechLoader';

const ExtensionInstall = () => {
  const [installInfo, setInstallInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInstallInfo();
  }, []);

  const fetchInstallInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://spectaglint-ai-production.up.railway.app'}/extension/install-info`);
      if (response.ok) {
        const data = await response.json();
        setInstallInfo(data);
      } else {
        setError('Failed to load extension information');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (installInfo?.downloadUrl) {
      window.open(installInfo.downloadUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <TechLoader
        title="FETCHING_EXTENSION_DATA"
        subtitle="LOADING_INSTALL_MANIFEST..."
        size="small"
        progress={55}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030504] p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-surface-container border border-red-500/20 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-on-surface mb-2">Connection Error</h1>
          <p className="text-on-surface-variant mb-4">{error}</p>
          <button
            onClick={fetchInstallInfo}
            className="px-4 py-2 bg-primary text-black font-bold uppercase text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030504] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Monitor className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-on-surface mb-2">Install Spectaglint AI Extension</h1>
          <p className="text-on-surface-variant">Enable real-time AI assistance for your meetings</p>
        </div>

        {/* Download Section */}
        <div className="bg-surface-container border border-outline-variant/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Download Extension
          </h2>
          <p className="text-on-surface-variant mb-4">
            Download the latest extension package to begin tracking and analyzing your live meetings.
          </p>
          <button
            onClick={handleDownload}
            className="w-full bg-primary text-black font-bold uppercase text-sm py-3 px-4 hover:bg-primary-dim transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Extension ZIP ({installInfo?.version || '1.0.0'})
          </button>
        </div>

        {/* Installation Instructions */}
        <div className="bg-surface-container border border-outline-variant/20 p-6">
          <h2 className="text-lg font-bold text-on-surface mb-4">Installation Instructions</h2>
          <div className="space-y-3">
            {installInfo?.instructions?.map((instruction, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-on-surface-variant">{instruction}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded">
            <h3 className="font-bold text-primary mb-2">Important Notes:</h3>
            <ul className="text-sm text-on-surface-variant space-y-1">
              <li>• The extension requires Chrome browser</li>
              <li>• "Developer mode" must be enabled in extensions settings</li>
              <li>• The extension will only work on supported meeting platforms (Google Meet, Zoom, Teams)</li>
              <li>• Make sure to refresh any open meeting tabs after installation</li>
            </ul>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 border border-outline-variant/40 text-on-surface hover:border-primary hover:text-primary transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default ExtensionInstall;