import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <nav style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        padding: '2rem 4rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        zIndex: 10 
      }}>
        <div style={{ 
          fontFamily: 'Orbitron', 
          fontSize: '1.5rem', 
          fontWeight: 800, 
          letterSpacing: '0.1em',
          color: '#fff'
        }}>
          ORBITA<span style={{ color: '#3b82f6' }}>-ATSAD</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/login" className="btn-secondary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>
            Login
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-content">
          <span className="hero-tag">Next-Gen Space Surveillance</span>
          <h1 className="hero-title">
            Secure the High Ground.
          </h1>
          <p className="hero-subtitle">
            ORBITA is the world's most advanced Aerospace Tracking & Situational Awareness Dashboard. 
            Monitor LEO constellations, predict conjunctions, and investigate anomalies with 
            AI-driven precision.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn-primary">
              Get Started
            </Link>
            <a href="#features" className="btn-secondary">
              Explore Capabilities
            </a>
          </div>
        </div>
      </section>

      {/* <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Operational Excellence</h2>
          <p className="section-desc">Mission-critical tools for modern orbital operations.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <h3 className="feature-title">Real-time Visualization</h3>
            <p className="feature-desc">Interactive Cesium-powered 3D globe with precise TLE propagation and constellation monitoring.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 className="feature-title">Anomaly Detection</h3>
            <p className="feature-desc">AI-driven telemetry analysis identifies deviations before they become critical mission failures.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h3 className="feature-title">Predictive Physics</h3>
            <p className="feature-desc">Automated conjunction screening and Kessler syndrome simulation with NASA-standard breakup models.</p>
          </div>
        </div>
      </section> */}

      <footer style={{ 
        padding: '4rem 1.5rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem'
      }}>
        <p>© 2026 ORBITA. All rights reserved. Classified System Access Required.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
