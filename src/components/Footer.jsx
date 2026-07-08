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
              <a 
                href="https://www.linkedin.com/company/nsnexus-tech/about/?viewAsMember=true" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer__social-link" 
                aria-label="LinkedIn"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ width: '16px', height: '16px' }}>
                  <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/>
                </svg>
              </a>
              <a 
                href="https://www.youtube.com/channel/UCR2IZO34GezQ5uM_QU6whKg" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer__social-link" 
                aria-label="YouTube"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ width: '16px', height: '16px' }}>
                  <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.104 1.981l-.062.564a2 2 0 0 1-1.414 1.42c-1.123.3-5.288.33-6.11.335h-.09c-.823-.003-4.987-.03-6.11-.334a2 2 0 0 1-1.414-1.42c-.101-.38-.172-.882-.22-1.402l-.01-.104-.022-.261-.008-.104c-.065-.913-.073-1.77-.074-1.956v-.075c.001-.194.01-1.107.104-1.98l.062-.565a2 2 0 0 1 1.414-1.42c1.123-.3 5.287-.33 6.11-.335zM6.5 5.201v5.596L11 8 6.5 5.201z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/nsnexustech" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer__social-link" 
                aria-label="Instagram"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ width: '16px', height: '16px' }}>
                  <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
              </a>
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
