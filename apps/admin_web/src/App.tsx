import React from 'react';

export const App: React.FC = () => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1E293B', paddingBottom: '1rem' }}>
        <h1 style={{ color: '#F97316', margin: 0 }}>QueueLess India</h1>
        <p style={{ color: '#8B98AD', margin: '0.25rem 0 0 0' }}>
          Platform Admin Dashboard &bull; Milestone 0 Foundation
        </p>
      </header>
      <main style={{ marginTop: '2rem' }}>
        <div
          style={{
            background: '#131926',
            border: '1px solid #1E293B',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '600px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#10B981' }}>System Status: Operational</h3>
          <p style={{ color: '#F8FAFC', fontSize: '0.9rem' }}>
            Scaffolding active. Waiting for M4 Admin Web implementation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
