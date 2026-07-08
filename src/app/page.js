"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { COURSES_DATA, SERVICES_DATA, TESTIMONIALS_DATA } from '../data/platformData';
import { CourseCard } from '../components/CourseCard';
import { ServiceCard } from '../components/ServiceCard';
import { db } from '../utils/firebase/client';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';

function getVideoEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1&rel=0` : url;
  }
  if (url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    const videoId = match ? match[1] : null;
    return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : url;
  }
  if (url.includes('panda.video') || url.includes('pandasplay.com')) {
    return url;
  }
  return url;
}

function getProjectCover(proj) {
  if (proj.coverUrl) return proj.coverUrl;
  if (!proj.isStatic && proj.mediaUrl) {
    if (proj.mediaUrl.includes('youtube.com') || proj.mediaUrl.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = proj.mediaUrl.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }
  return proj.mediaUrl;
}

const SHOWCASE_PROJECTS = [
  {
    id: "proj-1",
    title: "Portal ANS Digital",
    type: "sharepoint",
    badge: "SharePoint & HTML/JS",
    desc: "Substituição completa do Power Apps. Portal de controle operacional leve integrado nativamente no SharePoint Online.",
    metricIcon: "speed",
    metricLabel: "Carregamento instantâneo (< 1s)",
    coverUrl: "/images/sharepoint.jpeg",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4",
    isStatic: false
  },
  {
    id: "proj-2",
    title: "Dashboard de Kaizens",
    type: "sharepoint",
    badge: "SharePoint & HTML/JS",
    desc: "Dashboard integrado para registro e monitoramento de Kaizens em tempo real, sincronizado de forma automática via SharePoint.",
    metricIcon: "trending_up",
    metricLabel: "Gestão visual de melhorias",
    coverUrl: "/images/kaizen.png",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4",
    isStatic: false
  },
  {
    id: "proj-3",
    title: "Sistema de Provas DBU",
    type: "sharepoint",
    badge: "SharePoint & HTML/JS",
    desc: "Plataforma de avaliações corporativas integrada ao SharePoint, gerando histórico de notas com painel administrativo para edição.",
    metricIcon: "quiz",
    metricLabel: "Correção automática e relatórios",
    coverUrl: "/images/proativo.jpeg",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4",
    isStatic: false
  },
  {
    id: "proj-4",
    title: "Gestão Pernambucana",
    type: "web",
    badge: "Sistemas Web",
    desc: "Sistema estilo SaaS para gestão da rotina industrial (retífica, usinagem e mecânica) com cadastro operacional e painel financeiro.",
    metricIcon: "precision_manufacturing",
    metricLabel: "Faturamento e controle industrial",
    coverUrl: "/images/powerapps.jpeg",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4",
    isStatic: false
  },
  {
    id: "proj-5",
    title: "Portal Imobiliário",
    type: "web",
    badge: "Criação de Sites",
    desc: "Site imobiliário moderno de alta conversão com catálogo de imóveis interativo, filtros de busca avançados e contato via WhatsApp.",
    metricIcon: "home",
    metricLabel: "Integração direta com WhatsApp",
    coverUrl: "/images/whatsapp.jpeg",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4",
    isStatic: false
  },
  {
    id: "proj-6",
    title: "Delivery de Pizzaria",
    type: "web",
    badge: "Criação de Sites",
    desc: "Cardápio interativo e landing page otimizada de delivery para pizzaria, com fechamento de pedidos direto para o WhatsApp comercial.",
    metricIcon: "restaurant",
    metricLabel: "Pedidos e taxas automatizadas",
    coverUrl: "/images/powerautomate.jpeg",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4",
    isStatic: false
  },
  {
    id: "proj-7",
    title: "App Viva (Aura)",
    type: "powerapps",
    badge: "Power Apps",
    desc: "Aplicativo gamificado para incentivo a tarefas diárias de saúde física e mental das equipes da Aura.",
    metricIcon: "volunteer_activism",
    metricLabel: "Engajamento e bem-estar",
    coverUrl: "/images/viva.jpeg",
    mediaUrl: "/images/viva.jpeg",
    isStatic: true
  },
  {
    id: "proj-8",
    title: "App Autonova",
    type: "powerapps",
    badge: "Power Apps",
    desc: "Aplicativo de check-in e check-out de frotas com câmera integrada para controle de danos físicos de veículos da Autonova.",
    metricIcon: "directions_car",
    metricLabel: "Laudo com foto e assinatura digital",
    coverUrl: "/images/autonova.png",
    mediaUrl: "/images/autonova.png",
    isStatic: true
  },
  {
    id: "proj-9",
    title: "App ComoEstou",
    type: "powerapps",
    badge: "Power Apps",
    desc: "Preenchimento e painel de estado emocional diário das equipes da Geralogística para monitorar clima.",
    metricIcon: "mood",
    metricLabel: "Acompanhamento preventivo de clima",
    coverUrl: "/images/comoestou.jpeg",
    mediaUrl: "/images/comoestou.jpeg",
    isStatic: true
  }
];

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [modalVideo, setModalVideo] = useState(null);
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ dbId: doc.id, ...doc.data() });
        });

        if (list.length > 0) {
          setProjects(list);
        } else {
          console.log("Projects collection empty, populating initial data...");
          const saved = [];
          for (let i = 0; i < SHOWCASE_PROJECTS.length; i++) {
            const p = SHOWCASE_PROJECTS[i];
            const data = {
              id: p.id,
              title: p.title,
              type: p.type,
              badge: p.badge,
              desc: p.desc,
              metricIcon: p.metricIcon,
              metricLabel: p.metricLabel,
              coverUrl: p.coverUrl,
              mediaUrl: p.mediaUrl,
              isStatic: p.isStatic,
              order: i
            };
            const docRef = await addDoc(collection(db, 'projects'), data);
            saved.push({ dbId: docRef.id, ...data });
          }
          setProjects(saved);
        }
      } catch (err) {
        console.error("Error loading projects from Firestore:", err);
        setProjects(SHOWCASE_PROJECTS);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);
  
  // Selected testimonials display
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth <= 1024 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      return isMobileDevice;
    };
    
    const wasMobile = checkDevice();
    const handleResize = () => {
      checkDevice();
    };
    window.addEventListener("resize", handleResize);

    // 1. Load Spline script dynamically ONLY on PC (desktop)
    let splineInterval;
    let handleWheel;
    if (!wasMobile) {
      const scriptId = 'spline-viewer-script';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'module';
        script.src = 'https://unpkg.com/@splinetool/viewer@1.9.0/build/spline-viewer.js';
        document.head.appendChild(script);
      }

      const cleanSpline = () => {
        const viewers = document.querySelectorAll('spline-viewer');
        viewers.forEach((viewer) => {
          if (viewer && viewer.shadowRoot) {
            const logo = viewer.shadowRoot.querySelector('#logo');
            if (logo) {
              logo.remove();
            }
          }
        });
      };
      splineInterval = setInterval(cleanSpline, 500);

      handleWheel = (e) => {
        const isSpline = e.target.closest && (e.target.closest('spline-viewer') || e.target.tagName === 'SPLINE-VIEWER');
        if (isSpline) {
          e.stopPropagation();
        }
      };
      window.addEventListener('wheel', handleWheel, { capture: true, passive: true });
    }

    // 2. Set up interactive Canvas particles background
    const canvas = document.getElementById("hero-particles");
    let animationFrameId;
    let resizeHandler;
    let mouseMoveHandler;
    let mouseLeaveHandler;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      let particlesArray = [];
      
      const resizeCanvas = () => {
        if (canvas && canvas.parentElement) {
          canvas.width = canvas.parentElement.offsetWidth;
          canvas.height = canvas.parentElement.offsetHeight;
        }
      };
      
      resizeCanvas();
      resizeHandler = () => {
        resizeCanvas();
        init();
      };
      window.addEventListener("resize", resizeHandler);

      let mouse = {
        x: null,
        y: null,
        radius: 120
      };

      mouseMoveHandler = (event) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
      };
      window.addEventListener("mousemove", mouseMoveHandler);

      mouseLeaveHandler = () => {
        mouse.x = null;
        mouse.y = null;
      };
      window.addEventListener("mouseleave", mouseLeaveHandler);

      class Particle {
        constructor(x, y, directionX, directionY, size, color) {
          this.x = x;
          this.y = y;
          this.directionX = directionX;
          this.directionY = directionY;
          this.size = size;
          this.color = color;
        }
        
        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
          ctx.fillStyle = this.color;
          ctx.fill();
        }
        
        update() {
          if (this.x > canvas.width || this.x < 0) {
            this.directionX = -this.directionX;
          }
          if (this.y > canvas.height || this.y < 0) {
            this.directionY = -this.directionY;
          }

          if (mouse.x !== null && mouse.y !== null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouse.radius + this.size) {
              if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
                this.x += 3;
              }
              if (mouse.x > this.x && this.x > this.size * 10) {
                this.x -= 3;
              }
              if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
                this.y += 3;
              }
              if (mouse.y > this.y && this.y > this.size * 10) {
                this.y -= 3;
              }
            }
          }

          this.x += this.directionX;
          this.y += this.directionY;
          this.draw();
        }
      }

      const init = () => {
        particlesArray = [];
        let numberOfParticles = (canvas.width * canvas.height) / 12000;
        numberOfParticles = Math.min(numberOfParticles, 80);
        
        for (let i = 0; i < numberOfParticles; i++) {
          let size = (Math.random() * 2) + 1;
          let x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
          let y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
          let directionX = (Math.random() * 0.4) - 0.2;
          let directionY = (Math.random() * 0.4) - 0.2;
          let color = i % 2 === 0 ? 'rgba(0, 245, 212, 0.2)' : 'rgba(0, 102, 255, 0.25)';
          particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
      };

      const connect = () => {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
          for (let b = a; b < particlesArray.length; b++) {
            let dx = particlesArray[a].x - particlesArray[b].x;
            let dy = particlesArray[a].y - particlesArray[b].y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 120) {
              opacityValue = 1 - (distance / 120);
              ctx.strokeStyle = `rgba(0, 102, 255, ${opacityValue * 0.08})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
              ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
              ctx.stroke();
            }
          }
        }
      };

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particlesArray.length; i++) {
          particlesArray[i].update();
        }
        connect();
      };

      init();
      animate();
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (splineInterval) clearInterval(splineInterval);
      if (handleWheel) window.removeEventListener('wheel', handleWheel, { capture: true });
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (mouseMoveHandler) window.removeEventListener("mousemove", mouseMoveHandler);
      if (mouseLeaveHandler) window.removeEventListener("mouseleave", mouseLeaveHandler);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Featured lists
  const featuredCourses = COURSES_DATA.slice(0, 3);
  const featuredServices = SERVICES_DATA;

  // Open video modal
  const openVideo = (url, title) => {
    setModalVideo(url);
    setModalTitle(title);
  };

  // Close video modal
  const closeVideo = () => {
    setModalVideo(null);
    setModalTitle('');
  };

  // Testimonials stack logic removed - replaced with 3-column layout

  return (
    <>
      {/* Hero Section */}
      <section className="hero" style={{ position: 'relative' }}>
        <div className="hero__bg-glow"></div>
        <canvas className="hero__bg-particles" id="hero-particles"></canvas>
        
        {!isMobile && (
          <div className="hero__spline-container" style={{ display: 'block', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'auto' }}>
            <spline-viewer url="https://prod.spline.design/jw6O8S1ec1vIprQq/scene.splinecode" style={{ display: 'block', width: '100%', height: '100%' }}></spline-viewer>
          </div>
        )}

        <div className="container hero__container">
          <div className="hero__content animate-fade-in-up delay-200">
            <span className="hero__badge">
              <span className="hero__badge-dot"></span>
              Plataforma Corporativa & Consultoria
            </span>
            
            <h1 className="hero__title">
              Desenvolva Tecnologias sob a <span className="accent-gradient">Ótica de Negócios</span>
            </h1>
            
            <p className="hero__description" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
              Aprenda Power BI, Power Apps, SharePoint, Sistemas e IA sob a ótica de negócios. Domine as ferramentas que aceleram decisões e automatizam rotinas.
            </p>
            
            <div className="hero__actions" style={{ marginBottom: 'var(--space-8)', justifyContent: 'center' }}>
              <Link href="/cursos" className="btn btn-lg btn-primary">
                Conhecer Cursos
              </Link>
              <Link href="/servicos" className="btn btn-lg btn-secondary">
                Agendar Consultoria
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Divisor Luminoso (Horizon Glow) entre Hero e Expertises */}
      <div className="hero-glow-divider">
        <div className="hero-glow-divider__line"></div>
        <div className="hero-glow-divider__ambient"></div>
      </div>

      {/* Tech Cards Section */}
      <section className="container" style={{ paddingBottom: 'var(--space-12)' }}>
        <div className="features-grid">
          {/* 1. Power BI */}
          <div className="feature-card feature-card--pbi">
            <div className="feature-card__icon">
              <span className="material-symbols-outlined">bar_chart</span>
            </div>
            <h3>Power BI</h3>
            <p>Dashboards executivos, modelagem dimensional Star Schema, fórmulas DAX avançadas, e inteligência de tempo voltadas para decisões rápidas.</p>
            
            {/* Background SVG Watermark */}
            <svg className="feature-card__bg-icon" viewBox="0 0 100 100" fill="currentColor">
              <rect x="20" y="55" width="16" height="30" rx="2" />
              <rect x="42" y="35" width="16" height="50" rx="2" />
              <rect x="64" y="15" width="16" height="70" rx="2" />
            </svg>
          </div>

          {/* 2. Power Apps */}
          <div className="feature-card feature-card--powerapps">
            <div className="feature-card__icon">
              <span className="material-symbols-outlined">widgets</span>
            </div>
            <h3>Power Apps</h3>
            <p>Desenvolvimento de aplicativos canvas corporativos dinâmicos com Power Fx para simplificar cadastros e formulários internos.</p>
            
            {/* Background SVG Watermark */}
            <svg className="feature-card__bg-icon" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 15 L80 40 L50 65 L20 40 Z" />
              <path d="M50 35 L80 60 L50 85 L20 60 Z" opacity="0.65" />
            </svg>
          </div>

          {/* 3. SharePoint */}
          <div className="feature-card feature-card--sharepoint">
            <div className="feature-card__icon">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <h3>SharePoint</h3>
            <p>Modelagem de intranets e portais modernos com controle total de acessos e permissões para organizar dados e arquivos empresariais.</p>
            
            {/* Background SVG Watermark */}
            <svg className="feature-card__bg-icon" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="16" />
              <circle cx="50" cy="20" r="9" />
              <circle cx="76" cy="35" r="9" />
              <circle cx="76" cy="65" r="9" />
              <circle cx="50" cy="80" r="9" />
              <circle cx="24" cy="65" r="9" />
              <circle cx="24" cy="35" r="9" />
              <path d="M50 50 L50 20 M50 50 L76 35 M50 50 L76 65 M50 50 L50 80 M50 50 L24 65 M50 50 L24 35" stroke="currentColor" strokeWidth="4.5" />
            </svg>
          </div>

          {/* 4. Inteligência Artificial */}
          <div className="feature-card feature-card--ai">
            <div className="feature-card__icon">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <h3>Inteligência Artificial</h3>
            <p>Automatizações completas com Copilot, análise preditiva, criação de prompts estruturados e leitura de PDFs com IA Builder.</p>
            
            {/* Background SVG Watermark */}
            <svg className="feature-card__bg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
              <path d="M30 40 C 35 25, 65 25, 70 40 C 85 45, 85 75, 70 80 C 65 95, 35 95, 30 80 C 15 75, 15 45, 30 40 Z" />
              <circle cx="50" cy="45" r="5" fill="currentColor" />
              <circle cx="38" cy="55" r="5" fill="currentColor" />
              <circle cx="62" cy="55" r="5" fill="currentColor" />
              <circle cx="50" cy="68" r="5" fill="currentColor" />
              <line x1="50" y1="45" x2="38" y2="55" />
              <line x1="50" y1="45" x2="62" y2="55" />
              <line x1="50" y1="68" x2="38" y2="55" />
              <line x1="50" y1="68" x2="62" y2="55" />
            </svg>
          </div>

          {/* 5. Criação de Sistemas */}
          <div className="feature-card feature-card--sistemas">
            <div className="feature-card__icon">
              <span className="material-symbols-outlined">code</span>
            </div>
            <h3>Criação de Sistemas</h3>
            <p>Desenvolvimento de portais web leves com HTML, CSS e JavaScript puro para rodar dentro do SharePoint sem taxas extras de licenças.</p>
            
            {/* Background SVG Watermark */}
            <svg className="feature-card__bg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="35 30 15 50 35 70" />
              <polyline points="65 30 85 50 65 70" />
              <line x1="55" y1="25" x2="45" y2="75" />
            </svg>
          </div>

          {/* 6. Criação de Sites */}
          <div className="feature-card feature-card--sites">
            <div className="feature-card__icon">
              <span className="material-symbols-outlined">desktop_windows</span>
            </div>
            <h3>Criação de Sites</h3>
            <p>Criação de landing pages e plataformas otimizadas de alta conversão para atrair e qualificar clientes e leads.</p>
            
            {/* Background SVG Watermark */}
            <svg className="feature-card__bg-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
              <rect x="10" y="20" width="80" height="60" rx="6" />
              <line x1="10" y1="35" x2="90" y2="35" />
              <circle cx="20" cy="27" r="3" fill="currentColor" />
              <circle cx="30" cy="27" r="3" fill="currentColor" />
              <circle cx="40" cy="27" r="3" fill="currentColor" />
              <rect x="20" y="45" width="22" height="25" rx="2" />
              <line x1="50" y1="48" x2="80" y2="48" />
              <line x1="50" y1="58" x2="75" y2="58" />
              <line x1="50" y1="68" x2="70" y2="68" />
            </svg>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-10)', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
              Treinamento de Impacto
            </span>
            <h2 style={{ fontSize: 'var(--font-3xl)', marginTop: 'var(--space-2)' }}>Nossos Cursos Destaques</h2>
          </div>
          <Link href="/cursos" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Ver Todos Cursos <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </Link>
        </div>

        <div className="card-grid" id="featured-courses-grid">
          {featuredCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* Portfolio Showcase Section */}
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-12) auto' }}>
          <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
            Portfólio de Projetos Reais
          </span>
          <h2 style={{ fontSize: 'var(--font-3xl)', marginTop: 'var(--space-2)' }}>
            Sistemas Entregues pela NSNexus
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
            Clique nas demonstrações em vídeo de portais SharePoint e sites desenvolvidos por nós para grandes e médias corporações.
          </p>
        </div>

        {/* Portfolio Grid Layout */}
        <div className="card-grid">
          {loadingProjects ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '30px', height: '30px', borderRadius: '50%', borderLeftColor: 'var(--accent-cyan)', animation: 'spin 1s linear infinite', margin: '0 auto 15px auto' }}></div>
              Carregando projetos do portfólio...
            </div>
          ) : projects.map(proj => (
            <div 
              key={proj.id || proj.dbId} 
              className={`showcase-card ${!proj.isStatic ? 'showcase-card--video' : ''}`}
              onClick={() => !proj.isStatic && openVideo(proj.mediaUrl, proj.title)}
              style={{ cursor: proj.isStatic ? 'default' : 'pointer' }}
            >
              <div className="showcase-card__img-wrapper">
                <img src={getProjectCover(proj)} alt={proj.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!proj.isStatic && (
                  <div className="showcase-card__play-btn">
                    <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>play_arrow</span>
                  </div>
                )}
              </div>
              <span className={`showcase-card__badge showcase-card__badge--${proj.type}`}>
                {proj.badge}
              </span>
              <h3 className="showcase-card__title">{proj.title}</h3>
              <p className="showcase-card__desc">{proj.desc}</p>
              <div className="showcase-card__metric">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{proj.metricIcon || 'trending_up'}</span>
                <span>{proj.metricLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{ background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)', padding: 'var(--space-16) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto var(--space-12) auto' }}>
            <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
              Sucesso Comprovado
            </span>
            <h2 style={{ fontSize: 'var(--font-3xl)', marginTop: 'var(--space-2)' }}>O que dizem os nossos clientes e alunos</h2>
          </div>
          
          <div className="card-grid" style={{ marginTop: 'var(--space-10)' }}>
            {[
              TESTIMONIALS_DATA.find(t => t.name === "Rodrigo Silva"),
              TESTIMONIALS_DATA.find(t => t.name === "Juliana Ramos"),
              TESTIMONIALS_DATA.find(t => t.name === "Ricardo Souza")
            ].filter(Boolean).map((test) => (
              <div 
                key={test.name}
                style={{
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-8) var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '260px'
                }}
              >
                <p style={{ 
                  fontStyle: 'italic', 
                  color: 'var(--text-secondary)', 
                  fontSize: 'var(--font-sm)', 
                  lineHeight: 1.6, 
                  marginBottom: 'var(--space-8)',
                  flexGrow: 1
                }}>
                  "{test.quote}"
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
                  <img 
                    src={test.avatar} 
                    alt={test.name} 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #334155' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong style={{ color: 'white', fontSize: 'var(--font-sm)', fontWeight: 'bold' }}>{test.name}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.4 }}>{test.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final Banner Section */}
      <section style={{ background: 'var(--bg-secondary)', padding: 'var(--space-20) 0' }}>
        <div className="container">
          <div style={{ background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-16) var(--space-8)', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-cyan-glow)' }}>
            <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(0, 245, 212, 0.08) 0%, rgba(6, 7, 13, 0) 70%)', pointerEvents: 'none' }}></div>
            
            <span className="accent-gradient" style={{ fontWeight: 700, fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block', marginBottom: 'var(--space-4)' }}>
              Acelere seus Resultados
            </span>
            <h2 style={{ fontSize: 'var(--font-4xl)', marginBottom: 'var(--space-6)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              Quer decolar sua carreira ou sua empresa?
            </h2>
            <p style={{ maxWidth: '600px', margin: '0 auto var(--space-8) auto' }}>
              Seja através de nossos cursos práticos ou de uma consultoria premium sob demanda, nós temos as ferramentas certas para elevar o nível das suas entregas corporativas.
            </p>
            
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/cursos" className="btn btn-lg btn-primary">Matricular-se nos Cursos</Link>
              <Link href="/servicos" className="btn btn-lg btn-outline">Solicitar Consultoria</Link>
            </div>
          </div>
        </div>
      </section>


      {/* Video Modal */}
      {modalVideo && (
        <div id="video-modal" className="video-modal active" onClick={closeVideo}>
          <div className="video-modal__content animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <button id="video-modal-close" className="video-modal__close" onClick={closeVideo}>
              &times;
            </button>
            <div className="video-modal__body" id="video-modal-body">
              <h3 style={{ marginBottom: '15px', color: 'white' }}>{modalTitle}</h3>
              {modalVideo.includes('youtube.com') || modalVideo.includes('youtu.be') || modalVideo.includes('vimeo.com') || modalVideo.includes('panda.video') || modalVideo.includes('pandasplay.com') ? (
                <div style={{ position: 'relative', width: '100%', height: '450px', overflow: 'hidden', borderRadius: '8px' }}>
                  <iframe 
                    src={getVideoEmbedUrl(modalVideo)} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                  />
                  {/* Top overlay to block channel name & share button clicks */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                  {/* Bottom-right overlay to block watch on YouTube clicks */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '150px', height: '60px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                </div>
              ) : (
                <video src={modalVideo} controls autoPlay style={{ width: '100%', borderRadius: '8px' }}></video>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
