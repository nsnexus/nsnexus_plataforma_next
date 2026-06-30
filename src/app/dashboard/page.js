"use client";
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function DashboardContent() {
  const { user, courses } = useAuth();
  const [activeTab, setActiveTab] = React.useState('courses');

  if (!user) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'white' }}>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  // Find enrolled courses from courses list
  const enrolledCoursesList = courses.filter(c => user.enrolledCourses?.includes(c.id));
  
  // Categorize user products
  const myCourses = enrolledCoursesList.filter(c => c.type !== 'ebook' && c.type !== 'audiobook' && c.type !== 'pdf');
  const myEbooks = enrolledCoursesList.filter(c => c.type === 'ebook' || c.type === 'pdf');
  const myAudiobooks = enrolledCoursesList.filter(c => c.type === 'audiobook');
  
  // Find recommended courses (not enrolled yet)
  const recommendedCoursesList = courses.filter(c => !user.enrolledCourses?.includes(c.id) && !c.isClosed);

  // Helper to calculate progress
  const getCourseProgress = (course) => {
    const totalLessons = course.syllabus?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;
    
    if (totalLessons === 0) return { percentage: 0, completedCount: 0, totalCount: 0 };
    
    const completedList = user.progress?.[course.id]?.completedLessons || [];
    const percentage = Math.min(100, Math.round((completedList.length / totalLessons) * 100));
    
    return {
      percentage,
      completedCount: completedList.length,
      totalCount: totalLessons
    };
  };

  // Helper to get continue link
  const getContinueLink = (course) => {
    const completedList = user.progress?.[course.id]?.completedLessons || [];
    
    let nextLessonId = null;
    if (course.syllabus) {
      for (const mod of course.syllabus) {
        for (const les of mod.lessons) {
          if (!completedList.includes(les.id)) {
            nextLessonId = les.id;
            break;
          }
        }
        if (nextLessonId) break;
      }
    }

    // Default to first lesson if all completed or none found
    if (!nextLessonId && course.syllabus?.[0]?.lessons?.[0]) {
      nextLessonId = course.syllabus[0].lessons[0].id;
    }

    return `/player/${course.id}/${nextLessonId}`;
  };

  return (
    <main style={{ paddingTop: '100px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        {/* Student Profile Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', marginBottom: 'var(--space-10)', flexWrap: 'wrap' }}>
          <img 
            src={user.avatar_url} 
            alt={user.name} 
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-cyan)' }} 
          />
          <div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Olá, {user.name}!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Estudante NSNexus • {user.email}</p>
          </div>
          {user.role === 'admin' && (
            <Link href="/admin" className="btn btn-sm btn-primary" style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))', border: 'none', color: 'white' }}>
              Acessar Painel Admin
            </Link>
          )}
        </div>

        {/* Enrolled Products Section with Tabs */}
        <div style={{ marginBottom: 'var(--space-12)' }}>
          
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-8)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveTab('courses')}
              className={`btn btn-sm ${activeTab === 'courses' ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
              Meus Cursos ({myCourses.length})
            </button>
            <button 
              onClick={() => setActiveTab('ebooks')}
              className={`btn btn-sm ${activeTab === 'ebooks' ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>menu_book</span>
              E-books & Ferramentas ({myEbooks.length})
            </button>
            <button 
              onClick={() => setActiveTab('audiobooks')}
              className={`btn btn-sm ${activeTab === 'audiobooks' ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>headset</span>
              Audiobooks ({myAudiobooks.length})
            </button>
          </div>

          {/* Render Active Tab Grid */}
          {activeTab === 'courses' && (
            myCourses.length > 0 ? (
              <div className="card-grid">
                {myCourses.map(course => {
                  const { percentage, completedCount, totalCount } = getCourseProgress(course);
                  return (
                    <div key={course.id} className="course-card">
                      <div className="course-card__thumb">
                        <img src={`/${course.banner}`} alt={course.title} />
                        <div className="course-card__badge-group">
                          <span className={`badge ${course.badgeClass}`}>{course.badgeLabel}</span>
                        </div>
                      </div>
                      <div className="course-card__content" style={{ display: 'flex', flexDirection: 'column', height: 'auto' }}>
                        <h3 className="course-card__title" style={{ marginTop: '0' }}>{course.title}</h3>
                        <div style={{ margin: 'var(--space-4) 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>Progresso</span>
                            <span>{percentage}% ({completedCount}/{totalCount} aulas)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.3s' }}></div>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
                          <Link href={getContinueLink(course)} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                            {completedCount > 0 ? 'Continuar Curso' : 'Iniciar Curso'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)', background: 'rgba(15, 23, 42, 0.25)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>school</span>
                <h3 style={{ marginTop: 'var(--space-4)' }}>Nenhum curso matriculado</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-2) 0 var(--space-6) 0' }}>Você ainda não adquiriu nenhum treinamento corporativo.</p>
                <Link href="/cursos" className="btn btn-primary">Explorar Cursos</Link>
              </div>
            )
          )}

          {activeTab === 'ebooks' && (
            myEbooks.length > 0 ? (
              <div className="card-grid">
                {myEbooks.map(course => {
                  const isBiblioteca = course.id === 'biblioteca-prompts-ia';
                  const { percentage, completedCount, totalCount } = getCourseProgress(course);
                  return (
                    <div key={course.id} className="course-card">
                      <div className="course-card__thumb">
                        <img src={`/${course.banner}`} alt={course.title} />
                        <div className="course-card__badge-group">
                          <span className={`badge ${course.badgeClass}`}>{course.badgeLabel}</span>
                        </div>
                      </div>
                      <div className="course-card__content" style={{ display: 'flex', flexDirection: 'column', height: 'auto' }}>
                        <h3 className="course-card__title" style={{ marginTop: '0' }}>{course.title}</h3>
                        
                        {!isBiblioteca && (
                          <div style={{ margin: 'var(--space-4) 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              <span>Leitura</span>
                              <span>{percentage}% ({completedCount}/{totalCount} cap.)</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.3s' }}></div>
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
                          {isBiblioteca ? (
                            <Link href="/biblioteca-prompts" className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                              Acessar Biblioteca
                            </Link>
                          ) : (
                            <Link href={getContinueLink(course)} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                              {completedCount > 0 ? 'Continuar Leitura' : 'Ler E-book'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)', background: 'rgba(15, 23, 42, 0.25)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>menu_book</span>
                <h3 style={{ marginTop: 'var(--space-4)' }}>Nenhum E-book ou Ferramenta</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-2) 0 var(--space-6) 0' }}>Você ainda não adquiriu nenhum e-book ou ferramenta digital.</p>
                <Link href="/cursos?category=digital" className="btn btn-primary">Ver E-books</Link>
              </div>
            )
          )}

          {activeTab === 'audiobooks' && (
            myAudiobooks.length > 0 ? (
              <div className="card-grid">
                {myAudiobooks.map(course => {
                  const { percentage, completedCount, totalCount } = getCourseProgress(course);
                  return (
                    <div key={course.id} className="course-card">
                      <div className="course-card__thumb">
                        <img src={`/${course.banner}`} alt={course.title} />
                        <div className="course-card__badge-group">
                          <span className={`badge ${course.badgeClass}`}>{course.badgeLabel}</span>
                        </div>
                      </div>
                      <div className="course-card__content" style={{ display: 'flex', flexDirection: 'column', height: 'auto' }}>
                        <h3 className="course-card__title" style={{ marginTop: '0' }}>{course.title}</h3>
                        <div style={{ margin: 'var(--space-4) 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>Progresso</span>
                            <span>{percentage}% ({completedCount}/{totalCount} cap.)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.3s' }}></div>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
                          <Link href={getContinueLink(course)} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                            {completedCount > 0 ? 'Continuar Audiobook' : 'Ouvir Audiobook'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)', background: 'rgba(15, 23, 42, 0.25)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>headset</span>
                <h3 style={{ marginTop: 'var(--space-4)' }}>Nenhum Audiobook</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-2) 0 var(--space-6) 0' }}>Você ainda não adquiriu nenhum audiobook narrado por IA.</p>
                <Link href="/cursos?category=digital" className="btn btn-primary">Ver Audiobooks</Link>
              </div>
            )
          )}

        </div>

        {/* Recommended Section */}
        {recommendedCoursesList.length > 0 && (
          <div>
            <h2 style={{ fontSize: 'var(--font-xl)', marginBottom: 'var(--space-6)' }}>Recomendado para Você</h2>
            <div className="card-grid">
              {recommendedCoursesList.slice(0, 3).map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-card__thumb">
                    <img src={`/${course.banner}`} alt={course.title} />
                    <div className="course-card__badge-group">
                      <span className={`badge ${course.badgeClass}`}>{course.badgeLabel}</span>
                    </div>
                  </div>
                  <div className="course-card__content">
                    <h3 className="course-card__title" style={{ marginTop: '0' }}>{course.title}</h3>
                    <p className="course-card__desc">{course.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>R$ {course.price.toFixed(2)}</span>
                      <Link href={`/curso/${course.id}`} className="btn btn-sm btn-outline">Saber Mais</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
