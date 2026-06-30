import React from 'react';
import { SERVICES_DATA } from '../../data/platformData';
import { ServiceCard } from '../../components/ServiceCard';

export const metadata = {
  title: "Consultoria sob Medida — NSNexus",
  description: "Sistemas de alto impacto corporativo. Automatize rotinas operacionais e crie dashboards analíticos em tempo recorde.",
};

export default function ServicosPage() {
  return (
    <main style={{ paddingTop: '100px', minHeight: '80vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-12) auto' }}>
          <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
            Consultoria e Desenvolvimento
          </span>
          <h2 style={{ fontSize: 'var(--font-3xl)', marginTop: 'var(--space-2)' }}>Sistemas de Alto Impacto Corporativo</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
            Nossa equipe de especialistas desenha e implementa soluções sob medida para sua empresa. Automatize rotinas operacionais e crie dashboards analíticos em tempo recorde.
          </p>
        </div>

        {/* Services Grid */}
        <div className="card-grid">
          {SERVICES_DATA.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

      </section>
    </main>
  );
}
