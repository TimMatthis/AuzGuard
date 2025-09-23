import React from 'react';
import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center overflow-hidden">
      <div className="hero-backdrop" />
      <div className="hero-orb" />

      <div className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
        <div className="mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            <span className="brand-gradient-text">AuzGuard</span>
          </h1>
          <p className="text-xl text-gray-300 mb-6">Sovereign AI gateway for Australian compliance</p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Protect your AI workloads with comprehensive governance, compliance monitoring, and intelligent routing that keeps your data sovereign and secure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="feature-card">
            <div className="text-blue-400 text-xs font-bold tracking-widest mb-4">SECURE</div>
            <h3 className="text-lg font-semibold text-white mb-2">Compliance First</h3>
            <p className="text-gray-400 text-sm">Built-in support for Australian privacy laws, CDR, and industry regulations</p>
          </div>

          <div className="feature-card">
            <div className="text-green-400 text-xs font-bold tracking-widest mb-4">SMART</div>
            <h3 className="text-lg font-semibold text-white mb-2">Smart Routing</h3>
            <p className="text-gray-400 text-sm">Intelligent routing based on data classification and risk assessment</p>
          </div>

          <div className="feature-card">
            <div className="text-purple-400 text-xs font-bold tracking-widest mb-4">VISIBLE</div>
            <h3 className="text-lg font-semibold text-white mb-2">Full Visibility</h3>
            <p className="text-gray-400 text-sm">Complete audit trails and real-time monitoring of all AI interactions</p>
          </div>
        </div>

        {/* Two core components */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 mb-10">
          <div className="glass-card p-6 text-left">
            <p className="text-xs uppercase tracking-widest text-blue-300">Guardrails</p>
            <h3 className="text-2xl font-semibold text-white mt-1">Rules & Policies</h3>
            <p className="text-gray-300 mt-2 text-sm">Create, test, and publish rules that protect privacy, safety and compliance across your AI traffic.</p>
            <div className="mt-4 flex gap-3">
              <Link to="/policies" className="cta-button">Open Policies</Link>
              <Link to="/simulator" className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors border border-white/10">Simulator</Link>
            </div>
          </div>
          <div className="glass-card p-6 text-left">
            <p className="text-xs uppercase tracking-widest text-emerald-300">Routing</p>
            <h3 className="text-2xl font-semibold text-white mt-1">Models & Pools</h3>
            <p className="text-gray-300 mt-2 text-sm">Route requests to the right model endpoints using health, latency, and compliance-aware profiles.</p>
            <div className="mt-4 flex gap-3">
              <Link to="/routes" className="cta-button">Open Routing</Link>
              <Link to="/models" className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors border border-white/10">Models</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login" className="cta-button">Get Started</Link>
          <Link to="/login" className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors border border-white/10">Learn More</Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-500 text-sm">Secure • Compliant • Australian‑owned</p>
        </div>
      </div>
    </div>
  );
}
