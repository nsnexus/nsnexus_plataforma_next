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
    <main style={{ paddingTop: '80px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white', display: 'flex' }} className="player-page-container">
      
      {/* Sidebar: Modules Accordion */}
      <aside style={{ width: '320px', background: 'rgba(15, 23, 42, 0.6)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }} className="player-sidebar">
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Dashboard
          </Link>
          <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
            {course.title}
          </h2>
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

      {/* Main Content Pane */}
      <section style={{ flexGrow: 1, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} className="player-content-pane">
        
        {/* Video / Slide Area */}
        {/* Video / Slide / Audio Area */}
        <div style={{ flexGrow: 1, background: '#090a0f', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }} id="player-media">
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
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              {activeLesson.url && (activeLesson.url.includes('youtube.com') || activeLesson.url.includes('youtu.be') || activeLesson.url.includes('vimeo.com') || activeLesson.url.includes('panda.video') || activeLesson.url.includes('pandasplay.com')) ? (
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  <iframe 
                    src={getVideoEmbedUrl(activeLesson.url)} 
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
                <video 
                  src={activeLesson.url || "https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-close-up-3032-large.mp4"} 
                  controls 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  poster="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1280&auto=format&fit=crop"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer Meta Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }} id="player-meta">
          <div>
            <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold' }}>{activeLesson.title}</h1>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Módulo: {course.syllabus.find(m => m.lessons.includes(activeLesson))?.moduleTitle}</p>
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

      </section>
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
