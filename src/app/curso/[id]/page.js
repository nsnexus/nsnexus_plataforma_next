"use client";
export const runtime = 'edge';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { CountdownTimer } from '../../../components/CountdownTimer';
import { db } from '../../../utils/firebase/client';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const MOCK_REVIEWS = [
  {
    dbId: "mock-1",
    userName: "Mariana Costa",
    userCargo: "Coordenadora de Operações",
    rating: 5,
    comment: "Excelente curso! A didática é fantástica e a aplicação prática no SharePoint nos ajudou a economizar muito com licenças na empresa. Recomendo fortemente!",
    created_at: "2026-06-15T14:30:00Z"
  },
  {
    dbId: "mock-2",
    userName: "Rodrigo Almeida",
    userCargo: "Analista de Planejamento",
    rating: 5,
    comment: "Sensacional. O foco em soluções de negócio reais sem precisar programar é o grande diferencial. Consegui automatizar três processos na mesma semana.",
    created_at: "2026-06-20T10:15:00Z"
  },
  {
    dbId: "mock-3",
    userName: "Beatriz Nogueira",
    userCargo: "Gerente de Projetos",
    rating: 5,
    comment: "Material de extrema qualidade. O suporte do instrutor no esclarecimento das dúvidas é muito ágil. Vale cada centavo do investimento.",
    created_at: "2026-06-25T18:45:00Z"
  }
];

export default function CursoDetalhePage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const { user, courses } = useAuth();
  const [course, setCourse] = useState(null);
  const [processingBuy, setProcessingBuy] = useState(false);

  // Review states
  const [courseReviews, setCourseReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchReviews = async () => {
    if (!id) return;
    setLoadingReviews(true);
    try {
      const q = query(collection(db, 'reviews'), where('courseId', '==', id));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ dbId: doc.id, ...doc.data() });
      });
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setCourseReviews(list);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (id && courses) {
      const found = courses.find(c => c.id === id);
      setCourse(found);
    }
  }, [id, courses]);

  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id]);

  const reviewsToDisplay = useMemo(() => {
    return courseReviews.length > 0 ? courseReviews : MOCK_REVIEWS;
  }, [courseReviews]);

  const averageRating = useMemo(() => {
    const total = reviewsToDisplay.reduce((acc, r) => acc + r.rating, 0);
    return (total / reviewsToDisplay.length).toFixed(1);
  }, [reviewsToDisplay]);

  const hasUserReviewed = useMemo(() => {
    if (!user || courseReviews.length === 0) return false;
    return courseReviews.some(r => r.userId === user.id);
  }, [user, courseReviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        userId: user.id,
        userName: user.name || 'Aluno',
        userCargo: user.cargo || '',
        courseId: id,
        rating: formRating,
        comment: formComment,
        created_at: new Date().toISOString()
      });
      alert("Avaliação enviada com sucesso!");
      setFormComment('');
      setFormRating(5);
      fetchReviews();
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Erro ao enviar avaliação: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuyClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem("post_login_redirect", `/checkout/${course?.id}`);
      }
      router.push('/login');
      return;
    }

    router.push(`/checkout/${course?.id}`);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && course && user) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('buy') === 'true') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        router.push(`/checkout/${course?.id}`);
      }
    }
  }, [user, course]);

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
  const totalLessons = course.syllabus?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;



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

        {/* ========== AVALIAÇÕES DOS ALUNOS SECTION ========== */}
        <div style={{ marginTop: 'var(--space-16)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <span className="accent-gradient" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--font-sm)', letterSpacing: '0.05em' }}>
                Opinião dos Estudantes
              </span>
              <h2 style={{ fontSize: 'var(--font-2xl)', marginTop: 'var(--space-2)' }}>Avaliações do Curso</h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '10px 20px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                {averageRating}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', color: '#ffb000' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: `"FILL" ${i < Math.round(averageRating) ? 1 : 0}` }}>star</span>
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{courseReviews.length} avaliações</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-10)', alignItems: 'start' }} className="reviews-layout">
            
            {/* Left side: Add Review form (if completed and hasn't reviewed yet) */}
            <div style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', marginBottom: '15px', color: 'white' }}>Sua Avaliação</h3>
              
              {!user ? (
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', margin: 0 }}>Faça login na plataforma para deixar sua avaliação.</p>
              ) : !user.completedCourses?.includes(course?.id) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '32px', textAlign: 'center' }}>🎓</span>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, lineHeight: '1.4' }}>
                    <strong>Exclusivo para formados:</strong> Apenas alunos que completaram o curso e receberam o diploma podem deixar feedback!
                  </p>
                </div>
              ) : hasUserReviewed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
                  <span style={{ fontSize: '28px', color: 'var(--accent-cyan)' }}>✓</span>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                    Você já enviou sua avaliação para este curso. Obrigado pelo seu feedback!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nota (Estrelas)</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormRating(star)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ffb000' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '28px', fontVariationSettings: `"FILL" ${star <= formRating ? 1 : 0}` }}>
                            star
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comentário / Opinião</label>
                    <textarea
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      placeholder="Compartilhe sua experiência real com o curso..."
                      required
                      rows="3"
                      style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: 'var(--font-sm)', resize: 'vertical' }}
                    />
                  </div>

                  <button type="submit" disabled={submittingReview} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    {submittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                  </button>
                </form>
              )}
            </div>

            {/* Right side: List of reviews */}
            <div style={{ width: '100%', overflow: 'hidden' }}>
              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando avaliações...</div>
              ) : (
                <>
                  <style>{`
                    .reviews-scroll-container {
                      display: flex;
                      gap: 20px;
                      overflow-x: auto;
                      padding: 10px 5px 20px 5px;
                      scroll-behavior: smooth;
                      scroll-snap-type: x mandatory;
                      scrollbar-width: thin;
                    }
                    .reviews-scroll-container::-webkit-scrollbar {
                      height: 6px;
                    }
                    .reviews-scroll-container::-webkit-scrollbar-track {
                      background: rgba(255,255,255,0.02);
                      border-radius: 3px;
                    }
                    .reviews-scroll-container::-webkit-scrollbar-thumb {
                      background: rgba(0, 245, 212, 0.2);
                      border-radius: 3px;
                    }
                    .reviews-scroll-container::-webkit-scrollbar-thumb:hover {
                      background: rgba(0, 245, 212, 0.4);
                    }
                    .review-card-item {
                      background: rgba(15,23,42,0.3);
                      border: 1px solid var(--border-color);
                      border-radius: var(--radius-md);
                      padding: 20px;
                      display: flex;
                      flex-direction: column;
                      gap: 8px;
                      box-sizing: border-box;
                    }
                    .review-card-item--scroll {
                      flex: 0 0 320px;
                      scroll-snap-align: start;
                    }
                    .review-card-item--list {
                      width: 100%;
                    }
                  `}</style>

                  <div className={reviewsToDisplay.length > 3 ? "reviews-scroll-container" : ""} style={reviewsToDisplay.length <= 3 ? { display: 'flex', flexDirection: 'column', gap: '15px' } : {}}>
                    {reviewsToDisplay.map((review) => (
                      <div 
                        key={review.dbId} 
                        className={reviewsToDisplay.length > 3 ? "review-card-item review-card-item--scroll" : "review-card-item review-card-item--list"}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: 'var(--font-sm)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {review.userName}
                            {review.userCargo && (
                              <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', fontSize: 'var(--font-xs)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                {review.userCargo}
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {review.created_at ? new Date(review.created_at).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', color: '#ffb000' }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: `"FILL" ${i < review.rating ? 1 : 0}` }}>star</span>
                          ))}
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', margin: 0, lineHeight: 1.5 }}>
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

      </section>
    </main>
  );
}
