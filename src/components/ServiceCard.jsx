import React from 'react';

export const ServiceCard = ({ service }) => {
  return (
    <div className="service-card">
      <div className="service-card__icon">
        <span style={{ fontSize: 'var(--font-3xl)', fontFamily: "'Material Symbols Outlined', sans-serif" }}>
          {service.icon}
        </span>
      </div>
      <h3 className="service-card__title">{service.title}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', minHeight: '75px' }}>
        {service.description}
      </p>
      <ul className="service-card__features">
        {service.features.map((feat, index) => (
          <li key={index}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feat}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--text-muted)' }}>
          Investimento
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-cyan)', fontSize: 'var(--font-lg)' }}>
          {service.priceText}
        </span>
      </div>
      <a 
        href="https://wa.me/5594991081351?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20servi%C3%A7os%20de%20consultoria." 
        target="_blank" 
        rel="noopener noreferrer" 
        className="btn btn-primary btn-full" 
        style={{ marginTop: 'var(--space-4)' }}
      >
        Falar com Especialista
      </a>
    </div>
  );
};
export default ServiceCard;
