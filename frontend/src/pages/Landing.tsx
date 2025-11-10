import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBranding } from '../contexts/BrandingContext';
import { ThemeToggleCompact } from '../components/ThemeToggle';

export function Landing() {
  const { brandName } = useBranding();
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('advanced');

  const scenarios = {
    frontline: {
      name: 'Front-Line Bots',
      description: 'Basic support automation',
      currentSpend: 3900,
      routedSpend: 1300,
      savings: 67
    },
    advanced: {
      name: 'Advanced Automation',
      description: 'Internal AI workflows',
      currentSpend: 58500,
      routedSpend: 25700,
      savings: 56
    },
    business: {
      name: 'AI-Run Business',
      description: 'Everything powered by AI',
      currentSpend: 900000,
      routedSpend: 210600,
      savings: 77
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center overflow-hidden">
      <div className="hero-backdrop" />
      <div className="hero-orb" />
      
      {/* Theme toggle in top-right corner */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggleCompact />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-20 text-center relative z-10">
        {/* Hero Section */}
        <div className="mb-20">
          <h1 className="text-6xl sm:text-7xl font-bold mb-6 leading-tight">
            Australia's Trusted Sovereign AI Gateway
          </h1>
          <div className="max-w-4xl mx-auto">
            <p className="text-xl text-gray-200 mb-6 font-light leading-relaxed">
              Deliver AI at scale with total control, compliance, and cost transparency.
            </p>
          </div>
        </div>

        {/* Core Value Propositions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="group">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-xl p-8 h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="text-blue-400 text-sm font-bold tracking-wider mb-4 uppercase">Optimize</div>
              <h3 className="text-2xl font-bold text-white mb-4">Control your AI spend.<br />Maximise performance.</h3>
              <p className="text-gray-300 leading-relaxed mb-6">Intelligent routing sends simple queries to affordable models and complex tasks to premium AI — enterprise performance at startup prices.</p>

              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-6 rounded-lg border border-cyan-400/30 mb-6">
                <h4 className="text-lg font-semibold text-white mb-4">Cut AI Costs by up to 80% — Without Losing Power</h4>
                <button
                  onClick={() => setShowSavingsModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  See how much you could save
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-gray-200 text-sm">• Automatic cost-performance balancing</p>
                <p className="text-gray-200 text-sm">• No surprise bills, predictable scaling</p>
                <p className="text-gray-200 text-sm">• Set once, optimize continuously</p>
              </div>
            </div>
          </div>

          <div className="group">
            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-xl p-8 h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="text-green-400 text-sm font-bold tracking-wider mb-4 uppercase">Comply</div>
              <h3 className="text-2xl font-bold text-white mb-4">Legislative Compliance</h3>
              <p className="text-gray-300 leading-relaxed mb-4">AI can accidentally expose sensitive data or violate privacy laws, leading to massive fines, legal battles, and damaged reputation.</p>

              <div className="space-y-3">
                <p className="text-gray-200 text-sm">
                  <span className="text-green-400 font-semibold">• Privacy protection:</span> Automatic data classification and sovereignty controls keep Australian data in Australia.
                </p>
                <p className="text-gray-200 text-sm">
                  <span className="text-green-400 font-semibold">• Regulatory compliance:</span> Built-in support for Privacy Act, CDR, and industry-specific requirements.
                </p>
                <p className="text-gray-200 text-sm">
                  <span className="text-green-400 font-semibold">• Audit & accountability:</span> Complete audit trails and automated compliance reporting.
                </p>
              </div>
            </div>
          </div>

          <div className="group">
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-xl p-8 h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="text-purple-400 text-sm font-bold tracking-wider mb-4 uppercase">Govern</div>
              <h3 className="text-2xl font-bold text-white mb-4">Centralized Policies</h3>
              <p className="text-gray-300 leading-relaxed mb-4">Not all users are equal. Centralise enterprise controls to manage access, permissions, and AI usage across your entire organization.</p>

              <div className="space-y-2">
                <p className="text-gray-200 text-sm">• Role-based access controls and permissions</p>
                <p className="text-gray-200 text-sm">• Enterprise-wide policy enforcement</p>
                <p className="text-gray-200 text-sm">• Unified governance dashboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="text-center mb-20">
          <Link to="/login" className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-semibold px-12 py-4 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
            Start Your Sovereign AI Journey
          </Link>
          <p className="text-gray-400 mt-4 text-sm">Join leading Australian organizations already using AuzGuard</p>
        </div>

        {/* Footer */}
        <div className="pt-12 border-t border-gray-700/50 mt-16">
          <p className="text-gray-400 text-lg font-light">Secure • Compliant • Australian‑owned</p>
        </div>
      </div>

      {/* Savings Calculator Modal */}
      {showSavingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-400/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Estimate Your AI Savings</h2>
                <button
                  onClick={() => setShowSavingsModal(false)}
                  className="text-gray-300 hover:text-cyan-400 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="mb-8">
                <p className="text-gray-300 mb-6">
                  Based on real customer scenarios, routing AI workloads intelligently can cut LLM costs by 50–80% while maintaining near-identical accuracy.
                </p>
                <p className="text-gray-300 mb-4">Choose your scale:</p>

                {/* Scenario Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {Object.entries(scenarios).map(([key, scenario]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedScenario(key)}
                      className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                        selectedScenario === key
                          ? 'border-cyan-400 bg-cyan-900/40 text-white'
                          : 'border-gray-600 bg-gray-800/60 text-gray-200 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      <div className={`text-lg mb-1 ${selectedScenario === key ? 'text-cyan-400' : 'text-gray-400'}`}>
                        {key === 'frontline' ? '🟢' : key === 'advanced' ? '🔵' : '🔴'}
                      </div>
                      <div className="font-semibold text-white">{scenario.name}</div>
                      <div className="text-sm text-gray-400">{scenario.description}</div>
                    </button>
                  ))}
                </div>

                {/* Results */}
                <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/30 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Current Spend</div>
                      <div className="text-xl font-bold text-red-400">
                        {formatCurrency(scenarios[selectedScenario as keyof typeof scenarios].currentSpend)}
                      </div>
                      <div className="text-xs text-gray-400">/ month</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">With Routing</div>
                      <div className="text-xl font-bold text-green-400">
                        {formatCurrency(scenarios[selectedScenario as keyof typeof scenarios].routedSpend)}
                      </div>
                      <div className="text-xs text-gray-400">/ month</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Your Savings</div>
                      <div className="text-xl font-bold text-cyan-400">
                        {formatCurrency(scenarios[selectedScenario as keyof typeof scenarios].currentSpend - scenarios[selectedScenario as keyof typeof scenarios].routedSpend)}
                      </div>
                      <div className="text-xs text-gray-400">/ month ({scenarios[selectedScenario as keyof typeof scenarios].savings}%)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  onClick={() => setShowSavingsModal(false)}
                  className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center font-semibold px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-300"
                >
                  Sign up
                </Link>
                <button
                  onClick={() => setShowSavingsModal(false)}
                  className="inline-block bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Book demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
