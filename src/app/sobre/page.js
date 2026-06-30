import React from 'react';

export const metadata = {
  title: "Quem Somos — NSNexus",
  description: "A ponte entre tecnologia e resultado comercial. Saiba mais sobre a nossa expertise de mercado e nosso manifesto.",
};

export default function SobrePage() {
  return (
    <main style={{ paddingTop: '100px', minHeight: '80vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-12) auto' }}>
          <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
            Quem Somos
          </span>
          <h1 style={{ fontSize: 'var(--font-4xl)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-heading)' }}>
            A Ponte entre Tecnologia e Resultado Comercial
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Nascemos para resolver o principal problema corporativo: profissionais altamente técnicos que não se comunicam bem com a diretoria, ou gerentes que tomam decisões baseadas em planilhas cegas.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-12)', alignItems: 'center', marginTop: 'var(--space-12)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--font-3xl)', marginBottom: 'var(--space-6)', fontFamily: 'var(--font-heading)' }}>Nossa Expertise de Mercado</h2>
            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Fundada por especialistas com profunda experiência em grandes corporações, a NSNexus desenvolve capacitações e portais sob medida focados nas necessidades do mercado corporativo nacional.
            </p>
            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Acreditamos que o <strong>Power BI</strong>, <strong>Power Apps</strong> e o <strong>SharePoint</strong> não são destinos, mas meras ferramentas facilitadoras. O destino final de toda iniciativa deve ser a velocidade e precisão de decisões executivas.
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Nosso portfólio abrange desde treinamentos básicos até arquiteturas complexas de portais integrados rodando nativamente dentro do Microsoft 365, além de automações completas utilizando algoritmos modernos de Inteligência Artificial.
            </p>
          </div>
        </div>
        
        {/* Manifesto Section */}
        <div style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-12) var(--space-8)', marginTop: 'var(--space-16)' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto var(--space-12) auto' }}>
            <h2 style={{ fontSize: 'var(--font-3xl)', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>Nosso Manifesto</h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Quatro pilares fundamentais que norteiam todo o desenvolvimento e ensino da NSNexus.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-8)' }}>
            <div className="manifesto-point">
              <div style={{ fontSize: 'var(--font-3xl)', color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-2)' }}>01</div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>Negócio Sempre Primeiro</h3>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Qualquer dashboard ou sistema que não ajude a resolver um gargalo ou apoiar um direcionamento financeiro é inútil. Focamos sempre na dor real do negócio.</p>
            </div>
            
            <div className="manifesto-point">
              <div style={{ fontSize: 'var(--font-3xl)', color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-2)' }}>02</div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>Simplicidade Técnica</h3>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Ensinamos conceitos avançados através de analogias de negócios claras e fáceis de recordar. Menos jargões técnicos complexos, mais entendimento.</p>
            </div>
            
            <div className="manifesto-point">
              <div style={{ fontSize: 'var(--font-3xl)', color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-2)' }}>03</div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>Sistemas sem Licenças Extras</h3>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Acreditamos no potencial da web pura (HTML/JS) rodando dentro do SharePoint para economizar milhares de reais em licenças anuais adicionais.</p>
            </div>
            
            <div className="manifesto-point">
              <div style={{ fontSize: 'var(--font-3xl)', color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-2)' }}>04</div>
              <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>Design Premium & UX</h3>
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Um sistema ou relatório deve encantar à primeira vista. Dedicamos cuidado extremo ao layout, contraste de cores, fontes legíveis e responsividade.</p>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}
