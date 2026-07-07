"use client";
export const runtime = 'edge';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { CountdownTimer } from '../../../components/CountdownTimer';
import { db } from '../../../utils/firebase/client';
import { collection, addDoc } from 'firebase/firestore';

export default function CursoDetalhePage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { user, courses } = useAuth();
  const [course, setCourse] = useState(null);
  const [processingBuy, setProcessingBuy] = useState(false);

  useEffect(() => {
    if (id && courses) {
      const found = courses.find(c => c.id === id);
      setCourse(found);
    }
  }, [id, courses]);

  if (!course) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'white' }}>
        <p>Carregando detalhes do curso...</p>
      </div>
    );
  }

  const isBiblioteca = course.id === 'biblioteca-prompts-ia';
  const isEnrolled = user && user.enrolledCourses && user.enrolledCourses.includes(course.id);
  const isClosed = course.isClosed;

  const handleBuyClick = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (processingBuy) return;

    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem("post_login_redirect", `/curso/${course.id}?buy=true`);
      }
      router.push('/login');
      return;
    }

    setProcessingBuy(true);
    try {
      let checkoutUrl = course.paymentLink || '#';
      let transactionId = 'MP-PENDING-' + Math.floor(10000000 + Math.random() * 90000000);

      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            courseId: course.id,
            courseTitle: course.title,
            coursePrice: course.price,
            userId: user.id,
            userEmail: user.email
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.init_point) {
            checkoutUrl = data.init_point;
            const prefIdMatch = data.init_point.match(/pref_id=([^&]+)/);
            if (prefIdMatch && prefIdMatch[1]) {
              transactionId = 'MP-PREF-' + prefIdMatch[1];
            }
          }
        }
      } catch (apiErr) {
        console.warn("Mercado Pago API error, falling back to static link:", apiErr);
      }

      // Save pending purchase in Firestore
      await addDoc(collection(db, 'purchases'), {
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || 'Aluno',
        course_id: course.id,
        price_paid: course.price,
        status: 'pending',
        payment_id: transactionId,
        created_at: new Date().toISOString()
      });

      // Redirect directly to Mercado Pago
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error("Erro ao processar compra:", err);
      alert("Erro ao processar compra: " + err.message);
      setProcessingBuy(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && course && user && !processingBuy) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('buy') === 'true') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        handleBuyClick();
      }
    }
  }, [user, course]);

  return (
    <main style={{ paddingTop: '100px', minHeight: '80vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        {/* Breadcrumb */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Link href="/cursos" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span> Voltar para Cursos
          </Link>
        </div>

        {/* Detailed Hero Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-8)' }} className="course-detail-layout">
          
          {/* Main Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className={`badge ${course.badgeClass}`} style={{ alignSelf: 'flex-start' }}>{course.badgeLabel}</span>
              <span className="badge badge-closed" style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                {course.level}
              </span>
            </div>

            <h1 style={{ fontSize: 'var(--font-4xl)', fontFamily: 'var(--font-heading)', fontWeight: 800, lineHeight: 1.2 }}>
              {course.title}
            </h1>
            
            <p style={{ fontSize: 'var(--font-md)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {course.description}
            </p>

            {/* Metrics */}
            <div style={{ display: 'flex', gap: 'var(--space-6)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: 'var(--space-4) 0', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', textTransform: 'uppercase' }}>Duração / Ementa</div>
                <div style={{ fontWeight: 'bold', fontSize: 'var(--font-lg)', color: 'var(--accent-cyan)' }}>{course.duration}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', textTransform: 'uppercase' }}>Atividades</div>
                <div style={{ fontWeight: 'bold', fontSize: 'var(--font-lg)', color: 'var(--accent-cyan)' }}>
                  {isBiblioteca ? course.lessonsCount : `${totalLessons} Aulas`}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)', textTransform: 'uppercase' }}>Avaliação</div>
                <div style={{ fontWeight: 'bold', fontSize: 'var(--font-lg)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ★ {course.rating.toFixed(2)} <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', fontWeight: 'normal' }}>({course.reviewsCount} avaliações)</span>
                </div>
              </div>
            </div>

            {/* Collapsible Syllabus */}
            <div style={{ marginTop: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--font-2xl)', marginBottom: 'var(--space-6)' }}>Conteúdo do Curso</h3>
              
              {course.syllabus && course.syllabus.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {course.syllabus.map((mod, mIndex) => (
                    <details 
                      key={mIndex} 
                      style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
                      open={mIndex === 0}
                    >
                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 'var(--font-md)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{mod.moduleTitle}</span>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{mod.lessons?.length || 0} aulas</span>
                      </summary>
                      
                      <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {mod.lessons?.map((less, lIndex) => (
                          <div key={less.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', fontSize: 'var(--font-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                                {less.type === 'video' ? 'play_circle' : 'article'}
                              </span>
                              <span>{lIndex + 1}. {less.title}</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>{less.duration}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Syllabus personalizado de acordo com o escopo do cliente.</p>
              )}
            </div>

          </div>

          {/* Pricing / Side Card Column */}
          <div style={{ alignSelf: 'start', position: 'sticky', top: '120px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-cyan-glow)' }}>
              
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
                <img src={`/${course.banner}`} alt={course.title} style={{ width: '100%', objectFit: 'cover' }} />
              </div>

              {isBiblioteca && (
                <>
                  <div className="course-card__promo-timer" style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px' }}>alarm</span>
                    Promoção acaba em: &nbsp;
                    <CountdownTimer />
                  </div>
                  <div style={{ 
                    background: 'rgba(0, 245, 212, 0.1)', 
                    border: '1px solid rgba(0, 245, 212, 0.25)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: 'var(--space-3) var(--space-4)', 
                    marginBottom: 'var(--space-4)', 
                    fontSize: '11px',
                    color: '#00f5d4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    lineHeight: 1.4
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>workspace_premium</span>
                    <span><strong>SUPER BÔNUS:</strong> Comprando a biblioteca de prompts, você ganha acesso grátis e imediato ao <strong>E-book: Sistemas & Vídeos Virais com IA</strong> (Valor original de R$ 49,90)!</span>
                  </div>
                </>
              )}

              {/* Pricing details */}
              <div style={{ marginBottom: 'var(--space-6)' }}>
                {isClosed ? (
                  <div>
                    <span style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Sob Encomenda</span>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>Carga horária e grade customizadas para a sua equipe.</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                        R$ {course.originalPrice.toFixed(2)}
                      </span>
                      <span className="badge badge-ia" style={{ fontSize: '10px', padding: '2px 6px' }}>Oferta por tempo limitado</span>
                    </div>
                    <div style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                      R$ {course.price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                      Ou em até 12x no cartão de crédito
                    </div>
                  </div>
                )}
              </div>

              {isEnrolled ? (
                <Link href={course.id === 'biblioteca-prompts-ia' ? '/biblioteca-prompts' : `/player/${course.id}/${course.syllabus?.[0]?.lessons?.[0]?.id || ''}`} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '5px' }}>menu_book</span> Estudar Agora
                </Link>
              ) : isClosed ? (
                <a 
                  href={course.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-full"
                  style={{ justifyContent: 'center' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '5px' }}>mail</span> Solicitar Treinamento
                </a>
              ) : (
                <button 
                  onClick={handleBuyClick}
                  disabled={processingBuy}
                  className="btn btn-primary btn-full"
                  style={{ justifyContent: 'center', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '5px' }}>shopping_cart</span>
                  {processingBuy ? 'Redirecionando...' : 'Comprar'}
                </button>
              )}

              <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)' }}>workspace_premium</span>
                  Certificado de conclusão incluído
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)' }}>support_agent</span>
                  Suporte direto com instrutor
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent-cyan)' }}>all_inclusive</span>
                  Acesso vitalício ao conteúdo
                </div>
              </div>

            </div>
          </div>

        </div>

      </section>
    </main>
  );
}
