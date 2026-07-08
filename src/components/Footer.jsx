import React from 'react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <Link href="/" className="logo" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
              <img src="/images/logo.png" alt="NSNexus" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '6px' }} />
              <span>NSNexus</span>
            </Link>
            <p className="footer__about-text">
              NSNexus é a plataforma corporativa criada por especialistas para capacitar profissionais de negócio nas ferramentas que movem o mercado moderno.
            </p>
            <div className="footer__socials">
              <a href="https://www.linkedin.com/company/nsnexus-tech/about/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="LinkedIn">in</a>
              <a href="https://www.youtube.com/channel/UCR2IZO34GezQ5uM_QU6whKg" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="YouTube">YT</a>
              <a href="https://www.instagram.com/nsnexustech" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Instagram">IG</a>
            </div>
          </div>
          
          <div>
            <h4 className="footer__title">Navegação</h4>
            <ul className="footer__links">
              <li><Link href="/">Início</Link></li>
              <li><Link href="/cursos">Cursos & Treinamentos</Link></li>
              <li><Link href="/biblioteca-prompts">Biblioteca de Prompts</Link></li>
              <li><Link href="/servicos">Consultoria sob Demanda</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="footer__title">Legal</h4>
            <ul className="footer__links">
              <li><Link href="/termos">Termos de Uso</Link></li>
              <li><Link href="/termos">Políticas de Privacidade</Link></li>
              <li><Link href="/sobre">Sobre a Empresa</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="footer__title">Contato</h4>
            <ul className="footer__links" style={{ color: 'var(--text-secondary)' }}>
              <li>Email: contato@nsnexus.com</li>
              <li>WhatsApp: +55 (94) 99108-1351</li>
              <li>Atendimento corporativo de Segunda a Sexta</li>
            </ul>
          </div>
        </div>
        
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} NSNexus Plataforma Corporativa. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
