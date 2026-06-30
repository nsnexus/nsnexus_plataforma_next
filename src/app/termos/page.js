import React from 'react';

export const metadata = {
  title: "Termos de Uso & Políticas de Privacidade — NSNexus",
  description: "Leia atentamente as diretrizes de utilização da plataforma e a forma como protegemos e gerenciamos suas informações estudantis.",
};

export default function TermosPage() {
  return (
    <main style={{ paddingTop: '100px', minHeight: '80vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-24)' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-12) auto' }}>
          <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
            Segurança & Transparência
          </span>
          <h1 style={{ fontSize: 'var(--font-4xl)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-heading)' }}>
            Termos de Uso & Privacidade
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Leia atentamente as diretrizes de utilização da plataforma e a forma como protegemos e gerenciamos suas informações estudantis.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }} className="docs-grid">
          
          {/* Terms of Use */}
          <div className="doc-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-2xl)', color: 'var(--accent-cyan)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)', fontFamily: 'var(--font-heading)' }}>
              Termos de Uso
            </h2>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              1. Aceitação dos Termos
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Ao se registrar ou adquirir qualquer curso ou consultoria da NSNexus, você concorda em cumprir e estar vinculado aos termos descritos aqui. Caso discorde de qualquer parte deles, orientamos que interrompa o uso.
            </p>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              2. Propriedade Intelectual
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Todos os conteúdos fornecidos na plataforma, incluindo vídeos, arquivos PDF, designs de código HTML/JS, modelos DAX e documentações são de propriedade exclusiva da NSNexus. É expressamente proibido:
            </p>
            <ul style={{ listStyleType: 'disc', paddingLeft: 'var(--space-6)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: 'var(--space-2)' }}>Compartilhar credenciais de login com terceiros.</li>
              <li style={{ marginBottom: 'var(--space-2)' }}>Distribuir, piratear ou vender materiais baixados da plataforma.</li>
              <li style={{ marginBottom: 'var(--space-2)' }}>Reproduzir a metodologia comercial de consultoria sem autorização.</li>
            </ul>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              3. Uso de Licenças
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Ao comprar um curso, você recebe uma licença individual, não exclusiva e intransferível para estudar o material. Códigos e modelos fornecidos podem ser adaptados e aplicados para uso no ambiente profissional do aluno.
            </p>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              4. Garantia e Reembolso
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              A NSNexus oferece uma garantia de reembolso de 7 dias a contar da data da compra. Se o aluno não estiver satisfeito, pode solicitar o reembolso integral enviando uma solicitação formal.
            </p>
          </div>
          
          {/* Privacy Policy */}
          <div className="doc-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-2xl)', color: 'var(--accent-cyan)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)', fontFamily: 'var(--font-heading)' }}>
              Políticas de Privacidade
            </h2>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              1. Coleta de Informações
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Coletamos dados essenciais fornecidos por você para o funcionamento da plataforma:
            </p>
            <ul style={{ listStyleType: 'disc', paddingLeft: 'var(--space-6)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: 'var(--space-2)' }}>Dados cadastrais (Nome, e-mail e foto de perfil).</li>
              <li style={{ marginBottom: 'var(--space-2)' }}>Dados de progresso de estudo (aulas assistidas e materiais baixados).</li>
              <li style={{ marginBottom: 'var(--space-2)' }}>Informações de autenticação de provedores parceiros (ex: Google).</li>
            </ul>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              2. Utilização dos Dados
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Os dados coletados são utilizados unicamente para personalizar sua experiência na área de membros, rastrear o progresso do seu curso e enviar comunicados importantes relacionados ao seu treinamento.
            </p>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              3. Compartilhamento com Terceiros
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              A NSNexus não vende ou transfere suas informações a terceiros. As integrações com APIs externas (como a autenticação do Google) seguem os protocolos de segurança de tais plataformas.
            </p>
            
            <h3 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-2)', fontWeight: 'bold' }}>
              4. Armazenamento e Cookies
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
              Armazenamos informações de login e preferências localmente no navegador (LocalStorage) e por meio de cookies seguros para manter sua sessão iniciada de maneira conveniente.
            </p>
          </div>

        </div>

      </section>
    </main>
  );
}
