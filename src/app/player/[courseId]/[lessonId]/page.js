"use client";
export const runtime = 'edge';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import ProtectedRoute from '../../../../components/ProtectedRoute';

function getVideoEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1` : url;
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

function PlayerContent() {
  const params = useParams();
  const { courseId, lessonId } = params;
  const { user, updateProgress, courses } = useAuth();
  const router = useRouter();
  
  const [course, setCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);

  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [readerFontSize, setReaderFontSize] = useState(16);
  const [mobileSyllabusOpen, setMobileSyllabusOpen] = useState(false);

  // Video proxy state (protects YouTube URL)
  const [proxyEmbedUrl, setProxyEmbedUrl] = useState('');
  const [loadingProxy, setLoadingProxy] = useState(false);

  // Code block state
  const [activeCodeTab, setActiveCodeTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState(-1);

  // Lesson notes toggle
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
    }
  }, [activeLesson?.id]);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === Infinity) return "00:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    const returnedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${returnedMinutes}:${returnedSeconds}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.log("Audio play error:", e));
      }
    }
  };

  const skipTime = (amount) => {
    if (audioRef.current) {
      let newTime = audioRef.current.currentTime + amount;
      if (newTime < 0) newTime = 0;
      if (newTime > duration) newTime = duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  useEffect(() => {
    if (courseId && courses) {
      const foundCourse = courses.find(c => c.id === courseId);
      setCourse(foundCourse);

      if (foundCourse) {
        let foundLesson = null;
        if (foundCourse.syllabus) {
          foundCourse.syllabus.forEach(mod => {
            if (mod.lessons) {
              mod.lessons.forEach(les => {
                if (les.id === lessonId) {
                  foundLesson = les;
                }
              });
            }
          });
        }

        // Default to first lesson if not found or not specified
        if (!foundLesson && foundCourse.syllabus?.[0]?.lessons?.[0]) {
          foundLesson = foundCourse.syllabus[0].lessons[0];
        }
        setActiveLesson(foundLesson);
      }
    }
  }, [courseId, lessonId, courses]);

  // Fetch embed URL via proxy for video lessons
  useEffect(() => {
    if (activeLesson && activeLesson.type === 'video' && activeLesson.url) {
      setLoadingProxy(true);
      setProxyEmbedUrl('');
      fetch(`/api/video-proxy?courseId=${courseId}&lessonId=${activeLesson.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.embedUrl) {
            setProxyEmbedUrl(data.embedUrl);
          } else {
            // Fallback to direct embed if proxy fails
            setProxyEmbedUrl(getVideoEmbedUrl(activeLesson.url));
          }
        })
        .catch(() => {
          setProxyEmbedUrl(getVideoEmbedUrl(activeLesson.url));
        })
        .finally(() => setLoadingProxy(false));
    }
    // Reset code tab
    setActiveCodeTab(0);
    setCopiedIndex(-1);
    setShowNotes(false);
  }, [activeLesson?.id, courseId]);

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(-1), 2000);
    });
  };

  if (!course || !activeLesson) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'white' }}>
        <p>Carregando aula...</p>
      </div>
    );
  }

  // Double check security block (if user isn't enrolled)
  const isEnrolled = user && user.enrolledCourses && user.enrolledCourses.includes(courseId);
  if (user && !isEnrolled) {
    return (
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'white', gap: '20px' }}>
        <h2>Acesso Negado</h2>
        <p>Você não possui inscrição ativa neste curso.</p>
        <Link href="/cursos" className="btn btn-primary">Ver Catálogo de Cursos</Link>
      </div>
    );
  }

  // Get list of completed lessons
  const completedList = (user && user.progress && user.progress[courseId]) 
    ? user.progress[courseId].completedLessons || [] 
    : [];
  const isActiveCompleted = completedList.includes(activeLesson.id);

  // Find next lesson
  let allLessonsList = [];
  if (course.syllabus) {
    course.syllabus.forEach(mod => {
      if (mod.lessons) {
        mod.lessons.forEach(les => {
          allLessonsList.push(les);
        });
      }
    });
  }

  const currentIndex = allLessonsList.findIndex(l => l.id === activeLesson.id);
  const nextLesson = allLessonsList[currentIndex + 1];

  const handleToggleComplete = async (e, targetLessonId) => {
    e.preventDefault();
    e.stopPropagation();
    const isCompleted = completedList.includes(targetLessonId);
    await updateProgress(courseId, targetLessonId, !isCompleted);
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      router.push(`/player/${courseId}/${nextLesson.id}`);
    } else {
      alert("Parabéns! Você concluiu todas as aulas deste curso.");
      router.push('/dashboard');
    }
  };

  return (
    <main style={{ paddingTop: '80px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white' }} className="player-page-container">
      
      {/* Sidebar: Modules Accordion */}
      <aside className={`player-sidebar ${mobileSyllabusOpen ? 'player-sidebar--open' : ''}`}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Link href="/dashboard" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Dashboard
            </Link>
            <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={course.title}>
              {course.title}
            </h2>
          </div>
          <button 
            className="mobile-syllabus-close"
            onClick={() => setMobileSyllabusOpen(false)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', padding: 0 }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', flexGrow: 1 }} id="player-syllabus">
          {course.syllabus ? course.syllabus.map((mod, modIdx) => (
            <div key={modIdx} className="player-mod">
              <div className="player-mod__header" style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(0,0,0,0.2)', fontSize: 'var(--font-xs)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {mod.moduleTitle}
              </div>
              <div className="player-mod__list">
                {mod.lessons?.map(les => {
                  const isActive = les.id === activeLesson.id;
                  const isCompleted = completedList.includes(les.id);
                  
                  return (
                    <Link 
                      key={les.id} 
                      href={`/player/${courseId}/${les.id}`} 
                      onClick={() => setMobileSyllabusOpen(false)}
                      className={`player-les ${isActive ? 'player-les--active' : ''}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: 'var(--space-3) var(--space-4)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                    >
                      <div 
                        className={`player-les__check ${isCompleted ? 'player-les__check--done' : ''}`}
                        onClick={(e) => handleToggleComplete(e, les.id)}
                        style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-cyan)', background: isCompleted ? 'rgba(0, 245, 212, 0.1)' : 'transparent', flexShrink: 0 }}
                      >
                        {isCompleted && '✓'}
                      </div>
                      <div className="player-les__info" style={{ flexGrow: 1, minWidth: 0 }}>
                        <span className="player-les__title" style={{ display: 'block', fontSize: 'var(--font-sm)', color: isActive ? 'var(--accent-cyan)' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {les.title}
                        </span>
                        <span className="player-les__meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                            {les.type === 'pdf' ? 'menu_book' : 'play_circle'}
                          </span>
                          {les.duration}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )) : (
            <p style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
              Nenhum conteúdo de aula cadastrado.
            </p>
          )}
        </div>
      </aside>

      <section className="player-content-pane">
        
        {/* Mobile Top Navigation Bar */}
        <div className="player-mobile-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: 'var(--font-sm)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span> Voltar
          </Link>
          <button 
            className="btn btn-sm btn-outline"
            onClick={() => setMobileSyllabusOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu</span>
            Aulas / Módulos
          </button>
        </div>
        
        {/* Video / Slide Area */}
        {/* Video / Slide / Audio Area */}
        <div className="player-media-wrapper" id="player-media">
          {activeLesson.type === 'pdf' ? (
            <div className="pdf-viewer" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="pdf-viewer__header" style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-sm)', alignItems: 'center' }}>
                <span>{activeLesson.fileUrl ? 'E-book Seguro' : activeLesson.content ? 'Leitor de E-book Seguro' : 'Material Didático'}: <strong>{activeLesson.title}</strong></span>
                
                {/* Font controls only if text content is loaded */}
                {activeLesson.content && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={() => setReaderFontSize(prev => Math.max(12, prev - 2))}
                      style={{ minWidth: '30px', padding: '2px 8px' }}
                      title="Diminuir Fonte"
                    >
                      A-
                    </button>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tamanho: {readerFontSize}px</span>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={() => setReaderFontSize(prev => Math.min(24, prev + 2))}
                      style={{ minWidth: '30px', padding: '2px 8px' }}
                      title="Aumentar Fonte"
                    >
                      A+
                    </button>
                  </div>
                )}

                {activeLesson.fileUrl && (
                  <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> Leitura Exclusiva na Plataforma
                  </span>
                )}
              </div>
              <div 
                className="pdf-viewer__page" 
                style={{ 
                  flexGrow: 1, 
                  padding: activeLesson.fileUrl ? '0' : 'var(--space-6) var(--space-8)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  overflowY: activeLesson.fileUrl ? 'hidden' : 'auto',
                  width: '100%',
                  height: '100%'
                }}
                onContextMenu={(e) => e.preventDefault()}
                onCopy={(e) => { e.preventDefault(); alert("Cópia não autorizada. Este conteúdo é protegido pela plataforma!"); }}
              >
                {activeLesson.fileUrl ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <iframe 
                      src={`${activeLesson.fileUrl}#toolbar=0&navpanes=0&scrollbar=1`} 
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    
                    {/* Floating watermark overlay */}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '20px', 
                      right: '20px', 
                      background: 'rgba(15, 23, 42, 0.85)', 
                      border: '1px solid var(--border-color)', 
                      padding: '8px 15px', 
                      borderRadius: 'var(--radius-md)', 
                      pointerEvents: 'none', 
                      zIndex: 2, 
                      fontSize: '11px', 
                      color: 'var(--accent-cyan)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                      Visualizado por: {user?.name || 'Estudante'} ({user?.email})
                    </div>
                  </div>
                ) : activeLesson.content ? (
                  <div 
                    style={{ 
                      background: 'rgba(15, 23, 42, 0.45)', 
                      border: '1px solid var(--border-color)', 
                      padding: 'var(--space-8)', 
                      borderRadius: 'var(--radius-md)', 
                      width: '100%', 
                      maxWidth: '700px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '20px',
                      userSelect: 'none',
                      MozUserSelect: 'none',
                      WebkitUserSelect: 'none',
                      msUserSelect: 'none',
                      position: 'relative'
                    }}
                  >
                    {/* Security Watermark */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> Leitor Protegido
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Visualizado por: {user?.name || 'Estudante'} ({user?.email})
                      </span>
                    </div>

                    {/* eBook Text Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {activeLesson.content.map((paragraph, index) => (
                        <p 
                          key={index} 
                          style={{ 
                            color: 'rgba(255,255,255,0.85)', 
                            fontSize: `${readerFontSize}px`, 
                            lineHeight: 1.7, 
                            textAlign: 'justify',
                            margin: 0
                          }}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Footer Watermark */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', marginTop: '15px', textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                        © 2026 NSNexus • Todos os direitos reservados. Cópia, distribuição ou compartilhamento são proibidos sob as leis de proteção de direitos autorais.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pdf-viewer__dummy-page" style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ color: 'var(--accent-cyan)', fontSize: 'var(--font-lg)', fontWeight: 'bold' }}>{activeLesson.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6 }}>
                      Este é um documento didático estruturado para estudos corporativos da NSNexus.
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6 }}>
                      O conteúdo completo desta aula está consolidado e disponível para leitura imediata na plataforma ou download.
                    </p>
                    <div style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: 'var(--space-4)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                      "A estruturação e automação de processos corporativos trazem redução de custos imediata e liberam o time para tarefas analíticas."
                    </div>
                    <button className="btn btn-sm btn-outline" style={{ alignSelf: 'flex-start', marginTop: '10px' }} onClick={() => alert('Material baixado!')}>
                      Download PDF Completo
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : activeLesson.type === 'audio' ? (
            <div className="audio-player-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.95), rgba(9, 10, 15, 0.98))', padding: 'var(--space-6)', boxSizing: 'border-box' }}>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes bounce-wave {
                  0%, 100% { height: 12px; }
                  50% { height: 60px; }
                }
                .wave-bar {
                  width: 5px;
                  background: linear-gradient(180deg, var(--accent-cyan), var(--accent-blue));
                  border-radius: 3px;
                  height: 15px;
                  transition: height 0.2s;
                  box-shadow: 0 0 10px rgba(0, 245, 212, 0.4);
                }
                .wave-bar.playing {
                  animation: bounce-wave 1.2s ease-in-out infinite;
                }
                .wave-bar.playing:nth-child(1) { animation-delay: 0.1s; }
                .wave-bar.playing:nth-child(2) { animation-delay: 0.4s; }
                .wave-bar.playing:nth-child(3) { animation-delay: 0.2s; }
                .wave-bar.playing:nth-child(4) { animation-delay: 0.6s; }
                .wave-bar.playing:nth-child(5) { animation-delay: 0.3s; }
                
                .custom-range::-webkit-slider-runnable-track {
                  background: rgba(255,255,255,0.1);
                  height: 6px;
                  border-radius: 3px;
                }
                .custom-range::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  background: var(--accent-cyan);
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                  margin-top: -4px;
                  cursor: pointer;
                  box-shadow: 0 0 8px var(--accent-cyan);
                }
              `}} />
              
              <audio 
                ref={audioRef}
                src={activeLesson.url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '30px', flexGrow: 1, alignItems: 'center', boxSizing: 'border-box' }}>
                
                {/* Album Cover & Waveform */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ position: 'relative', width: '180px', height: '180px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0, 245, 212, 0.15)', border: '1px solid rgba(0, 245, 212, 0.2)' }}>
                    <img 
                      src={`/${course.banner}`} 
                      alt={course.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>
                    
                    {/* Floating Headphones Icon */}
                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(0, 245, 212, 0.2)', backdropFilter: 'blur(4px)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-cyan)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-cyan)' }}>headset</span>
                    </div>
                  </div>

                  {/* Waveform visualization */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '65px' }}>
                    <div className={`wave-bar ${isPlaying ? 'playing' : ''}`}></div>
                    <div className={`wave-bar ${isPlaying ? 'playing' : ''}`}></div>
                    <div className={`wave-bar ${isPlaying ? 'playing' : ''}`}></div>
                    <div className={`wave-bar ${isPlaying ? 'playing' : ''}`}></div>
                    <div className={`wave-bar ${isPlaying ? 'playing' : ''}`}></div>
                  </div>
                </div>

                {/* Player Controls & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <span className="badge badge-systems" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Audiobook</span>
                    <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', marginTop: '8px', color: 'white' }}>{activeLesson.title}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>{course.title}</p>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <input 
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="custom-range"
                      style={{ width: '100%', background: 'transparent', WebkitAppearance: 'none', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls (Play, Skip, Speed, Volume) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                      
                      {/* Backward 10s */}
                      <button 
                        onClick={() => skipTime(-10)} 
                        className="btn btn-outline" 
                        style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}
                        title="Voltar 10 segundos"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>replay_10</span>
                      </button>

                      {/* Play/Pause */}
                      <button 
                        onClick={handlePlayPause} 
                        className="btn btn-primary" 
                        style={{ width: '56px', height: '56px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(0, 245, 212, 0.4)', border: 'none', background: 'var(--accent-cyan)', color: 'black' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      {/* Forward 10s */}
                      <button 
                        onClick={() => skipTime(10)} 
                        className="btn btn-outline" 
                        style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}
                        title="Avançar 10 segundos"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>forward_10</span>
                      </button>
                    </div>

                    {/* Speed & Volume controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', flexWrap: 'wrap', gap: '15px' }}>
                      
                      {/* Playback speed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>slow_motion_video</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 1.25, 1.5, 2].map(rate => (
                            <button 
                              key={rate} 
                              onClick={() => handleSpeedChange(rate)} 
                              className="btn btn-xs"
                              style={{ 
                                padding: '2px 6px', 
                                fontSize: '10px', 
                                background: playbackRate === rate ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                                color: playbackRate === rate ? 'black' : 'white',
                                border: 'none'
                              }}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Volume */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                          {volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                        </span>
                        <input 
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', WebkitAppearance: 'none' }}
                        />
                      </div>

                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : activeLesson.type === 'code' ? (
            /* ===== CODE BLOCKS VIEWER ===== */
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', overflow: 'hidden' }}>
              {/* Tab bar */}
              {activeLesson.codeBlocks && activeLesson.codeBlocks.length > 0 && (
                <>
                  <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', padding: '0 15px', flexWrap: 'wrap', gap: '2px' }}>
                    {activeLesson.codeBlocks.map((block, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => setActiveCodeTab(bIdx)}
                        style={{
                          padding: '10px 16px',
                          background: activeCodeTab === bIdx ? 'rgba(16,185,129,0.15)' : 'transparent',
                          border: 'none',
                          borderBottom: activeCodeTab === bIdx ? '2px solid #34d399' : '2px solid transparent',
                          color: activeCodeTab === bIdx ? '#34d399' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.7 }}>{block.language}</span>
                        {block.filename || `Bloco ${bIdx + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Code content */}
                  <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                    <button
                      onClick={() => handleCopyCode(activeLesson.codeBlocks[activeCodeTab]?.code || '', activeCodeTab)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '15px',
                        background: copiedIndex === activeCodeTab ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: copiedIndex === activeCodeTab ? '#34d399' : 'var(--text-secondary)',
                        padding: '5px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        zIndex: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {copiedIndex === activeCodeTab ? 'check' : 'content_copy'}
                      </span>
                      {copiedIndex === activeCodeTab ? 'Copiado!' : 'Copiar'}
                    </button>

                    <pre style={{
                      margin: 0,
                      padding: '20px',
                      color: '#e6edf3',
                      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
                      fontSize: '13px',
                      lineHeight: 1.6,
                      counterReset: 'line',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {(activeLesson.codeBlocks[activeCodeTab]?.code || '').split('\n').map((line, lineIdx) => (
                        <div key={lineIdx} style={{ display: 'flex', minHeight: '20px' }}>
                          <span style={{
                            display: 'inline-block',
                            width: '40px',
                            textAlign: 'right',
                            paddingRight: '15px',
                            color: 'rgba(255,255,255,0.2)',
                            userSelect: 'none',
                            flexShrink: 0,
                            fontSize: '12px'
                          }}>
                            {lineIdx + 1}
                          </span>
                          <code>{line}</code>
                        </div>
                      ))}
                    </pre>
                  </div>
                </>
              )}
              {(!activeLesson.codeBlocks || activeLesson.codeBlocks.length === 0) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                  <p>Nenhum bloco de código cadastrado para esta aula.</p>
                </div>
              )}
            </div>
          ) : activeLesson.type === 'download' ? (
            /* ===== DOWNLOAD CARD ===== */
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(15,23,42,0.95), rgba(9,10,15,0.98))' }}>
              <div style={{
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: '16px',
                padding: '40px 50px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                maxWidth: '420px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
                  border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#fbbf24' }}>download</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', marginBottom: '8px' }}>{activeLesson.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                    {activeLesson.downloadName || 'Arquivo disponível para download'}
                  </p>
                </div>
                {activeLesson.downloadUrl ? (
                  <a
                    href={activeLesson.downloadUrl}
                    download={activeLesson.downloadName || true}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 30px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      fontWeight: 'bold',
                      textDecoration: 'none'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                    Baixar Arquivo
                  </a>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>URL de download não configurada.</p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              {loadingProxy ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', borderLeftColor: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}></div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Carregando vídeo...</p>
                </div>
              ) : proxyEmbedUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  <iframe
                    src={proxyEmbedUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {/* Top overlay to block channel name & share button clicks */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                  {/* Bottom-right overlay to block watch on YouTube */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '160px', height: '50px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                  {/* Bottom-left overlay */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '80px', height: '50px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                </div>
              ) : activeLesson.url ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  <iframe
                    src={getVideoEmbedUrl(activeLesson.url)}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '160px', height: '50px', zIndex: 10, background: 'transparent', cursor: 'default' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', color: 'var(--text-muted)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>videocam_off</span>
                  <p>Nenhum vídeo configurado para esta aula.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }} id="player-meta">
          <div>
            <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold' }}>{activeLesson.title}</h1>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Módulo: {course.syllabus.find(m => m.lessons?.some(l => l.id === activeLesson.id))?.moduleTitle}</p>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button 
              className={`btn ${isActiveCompleted ? 'btn-secondary' : 'btn-outline'}`}
              onClick={(e) => handleToggleComplete(e, activeLesson.id)}
            >
              {isActiveCompleted ? '✓ Concluído' : 'Marcar como Concluída'}
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleNextLesson}
            >
              {nextLesson ? 'Próxima Aula' : 'Concluir Curso'}
            </button>
          </div>
        </div>

        {/* ===== LESSON NOTES / DESCRIPTION / DOWNLOADS ===== */}
        {(activeLesson.description || activeLesson.downloadUrl || (activeLesson.codeBlocks && activeLesson.type !== 'code')) && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
            <button
              onClick={() => setShowNotes(!showNotes)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'var(--font-sm)',
                padding: '8px 0',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: showNotes ? 'rotate(90deg)' : 'rotate(0)' }}>chevron_right</span>
              📋 Notas da Aula / Recursos
            </button>

            {showNotes && (
              <div style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '8px' }}>
                {/* Description text */}
                {activeLesson.description && (
                  <div>
                    <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-cyan)' }}>Descrição</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{activeLesson.description}</p>
                  </div>
                )}

                {/* Download link if video lesson also has download */}
                {activeLesson.downloadUrl && activeLesson.type !== 'download' && (
                  <div>
                    <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', marginBottom: '8px', color: '#fbbf24' }}>📥 Arquivo para Download</h4>
                    <a
                      href={activeLesson.downloadUrl}
                      download={activeLesson.downloadName || true}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                      style={{ display: 'inline-flex', gap: '6px', textDecoration: 'none', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                      {activeLesson.downloadName || 'Baixar arquivo'}
                    </a>
                  </div>
                )}

                {/* Code blocks if video lesson also has code */}
                {activeLesson.codeBlocks && activeLesson.type !== 'code' && (
                  <div>
                    <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', marginBottom: '8px', color: '#34d399' }}>💻 Código de Referência</h4>
                    {activeLesson.codeBlocks.map((block, bIdx) => (
                      <div key={bIdx} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: '4px 4px 0 0', border: '1px solid rgba(255,255,255,0.05)', borderBottom: 'none' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{block.filename || block.language}</span>
                          <button
                            onClick={() => handleCopyCode(block.code, 100 + bIdx)}
                            style={{ background: 'transparent', border: 'none', color: copiedIndex === 100 + bIdx ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{copiedIndex === 100 + bIdx ? 'check' : 'content_copy'}</span>
                            {copiedIndex === 100 + bIdx ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre style={{ margin: 0, padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0 0 4px 4px', overflow: 'auto', maxHeight: '300px' }}>
                          <code style={{ color: '#a5f3fc', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.5 }}>{block.code}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </section>

      {/* Mobile Syllabus Drawer Overlay */}
      {mobileSyllabusOpen && (
        <div 
          onClick={() => setMobileSyllabusOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1040
          }}
        />
      )}
    </main>
  );
}

export default function PlayerPage() {
  return (
    <ProtectedRoute>
      <PlayerContent />
    </ProtectedRoute>
  );
}
