"use client";
export const runtime = 'edge';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { db } from '../../../../utils/firebase/client';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore/lite';

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
  const { user, updateProgress, toggleBookmark, courses } = useAuth();
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

  // Lesson resources, notes and Q&A toggles
  const [showResources, setShowResources] = useState(false);
  const [showStudentNotes, setShowStudentNotes] = useState(false);
  const [studentNote, setStudentNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  // Q&A states
  const [questions, setQuestions] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState('');

  // Quiz States
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizError, setQuizError] = useState('');

  useEffect(() => {
    const fetchNote = async () => {
      if (user && activeLesson) {
        setLoadingNote(true);
        try {
          const noteId = `${user.id}_${courseId}_${activeLesson.id}`;
          const noteRef = doc(db, 'notes', noteId);
          const noteSnap = await getDoc(noteRef);
          if (noteSnap.exists()) {
            setStudentNote(noteSnap.data().content || '');
          } else {
            setStudentNote('');
          }
        } catch (err) {
          console.error("Erro ao carregar nota", err);
        } finally {
          setLoadingNote(false);
        }
      }
    };
    fetchNote();
  }, [user, courseId, activeLesson?.id]);

  const handleSaveNote = async () => {
    if (!user || !activeLesson) return;
    setSavingNote(true);
    try {
      const noteId = `${user.id}_${courseId}_${activeLesson.id}`;
      const noteRef = doc(db, 'notes', noteId);
      await setDoc(noteRef, {
        userId: user.id,
        courseId,
        lessonId: activeLesson.id,
        content: studentNote,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar nota", err);
      alert("Erro ao salvar anotação.");
    } finally {
      setSavingNote(false);
    }
  };

  const isLessonLocked = (lesId) => {
    if (!course || !course.sequentialUnlock || !user) return false;
    
    const linearLessons = [];
    if (course.syllabus) {
      course.syllabus.forEach(mod => {
        if (mod.lessons) {
          linearLessons.push(...mod.lessons);
        }
      });
    }

    const idx = linearLessons.findIndex(l => l.id === lesId);
    if (idx <= 0) return false;

    const prevLesson = linearLessons[idx - 1];
    const completedList = (user.progress && user.progress[courseId]) 
      ? user.progress[courseId].completedLessons || [] 
      : [];
    return !completedList.includes(prevLesson.id);
  };

  const getEstimatedTimeLeft = () => {
    if (!course || !user) return '0 min';
    const completedList = (user.progress && user.progress[courseId]) 
      ? user.progress[courseId].completedLessons || [] 
      : [];
    
    let totalSeconds = 0;
    if (course.syllabus) {
      course.syllabus.forEach(mod => {
        if (mod.lessons) {
          mod.lessons.forEach(les => {
            if (!completedList.includes(les.id)) {
              const durStr = les.duration?.toLowerCase() || '';
              let mins = 0;
              if (durStr.includes('min')) {
                mins = parseInt(durStr.replace('min', '').trim()) || 0;
              } else if (durStr.includes('seg')) {
                mins = (parseInt(durStr.replace('seg', '').trim()) || 0) / 60;
              } else if (durStr.includes('h')) {
                const parts = durStr.split('h');
                const hrs = parseInt(parts[0].trim()) || 0;
                const remaining = parts[1]?.replace('m', '').trim() || '';
                const remMins = parseInt(remaining) || 0;
                mins = (hrs * 60) + remMins;
              } else {
                mins = parseInt(durStr) || 5; 
              }
              totalSeconds += mins * 60;
            }
          });
        }
      });
    }

    if (totalSeconds === 0) return 'Concluído';
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const fetchQuestions = async () => {
    if (!courseId || !activeLesson?.id) return;
    setLoadingQuestions(true);
    try {
      const qRef = collection(db, 'questions');
      const q = query(
        qRef,
        where('courseId', '==', courseId),
        where('lessonId', '==', activeLesson.id)
      );
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      data.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setQuestions(data);
    } catch (err) {
      console.error("Erro ao buscar dúvidas:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (showQuestions) {
      fetchQuestions();
    }
  }, [showQuestions, courseId, activeLesson?.id]);

  const handlePostQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !user || submittingQuestion) return;
    setSubmittingQuestion(true);
    try {
      const questionData = {
        courseId,
        lessonId: activeLesson.id,
        userId: user.id,
        userName: user.name || 'Estudante',
        userAvatar: user.avatar_url || '',
        content: newQuestionText.trim(),
        createdAt: new Date().toISOString(),
        replies: []
      };

      const docRef = await addDoc(collection(db, 'questions'), questionData);
      setQuestions(prev => [{ id: docRef.id, ...questionData }, ...prev]);
      setNewQuestionText('');
    } catch (err) {
      console.error("Erro ao postar dúvida:", err);
      alert("Erro ao postar dúvida. Tente novamente.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handlePostReply = async (questionId) => {
    const text = replyTextMap[questionId];
    if (!text || !text.trim() || !user || submittingReplyId) return;
    setSubmittingReplyId(questionId);
    try {
      const parentQuestion = questions.find(q => q.id === questionId);
      if (!parentQuestion) return;

      const newReply = {
        replyId: Date.now().toString(),
        userId: user.id,
        userName: user.name || 'Estudante',
        userAvatar: user.avatar_url || '',
        role: user.role || 'student',
        content: text.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedReplies = [...(parentQuestion.replies || []), newReply];
      
      const qRef = doc(db, 'questions', questionId);
      await updateDoc(qRef, { replies: updatedReplies });

      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, replies: updatedReplies } : q));
      setReplyTextMap(prev => ({ ...prev, [questionId]: '' }));
    } catch (err) {
      console.error("Erro ao postar resposta:", err);
      alert("Erro ao enviar resposta.");
    } finally {
      setSubmittingReplyId('');
    }
  };

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
    // Reset states
    setActiveCodeTab(0);
    setCopiedIndex(-1);
    setShowResources(false);
    setShowStudentNotes(false);
    setShowQuestions(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizError('');
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
      
      {/* Mobile Syllabus Overlay */}
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

      {/* Sidebar: Modules Accordion */}
      <aside className={`player-sidebar ${mobileSyllabusOpen ? 'player-sidebar--open' : ''}`}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Link href="/dashboard" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Dashboard
            </Link>
            <h2 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)' }}>list_alt</span>
               Conteúdo do Curso
             </h2>
             <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
               {course.title}
             </p>
             <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
               <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
               Tempo restante: {getEstimatedTimeLeft()}
             </p>
             
             {/* WhatsApp Group Link */}
             <a 
               href="https://chat.whatsapp.com/KXwpTXV7a7A3UJRVmD1BZ3?s=cl&p=a&ilr=4"
               target="_blank"
               rel="noopener noreferrer"
               style={{
                 marginTop: '10px',
                 padding: '6px 12px',
                 background: '#25d366',
                 color: 'white',
                 borderRadius: '4px',
                 fontSize: '11px',
                 fontWeight: 'bold',
                 textDecoration: 'none',
                 display: 'inline-flex',
                 alignItems: 'center',
                 gap: '6px',
                 cursor: 'pointer',
                 boxShadow: '0 2px 8px rgba(37, 211, 102, 0.2)'
               }}
             >
               <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chat</span>
               Grupo de Alunos
             </a>
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
                  const isLocked = isLessonLocked(les.id);
                  
                  if (isLocked) {
                    return (
                      <div 
                        key={les.id} 
                        className="player-les player-les--locked"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid rgba(255,255,255,0.02)', opacity: 0.45, cursor: 'not-allowed' }}
                      >
                        <div 
                          style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}
                        >
                          🔒
                        </div>
                        <div className="player-les__info" style={{ flexGrow: 1, minWidth: 0 }}>
                          <span className="player-les__title" style={{ display: 'block', fontSize: 'var(--font-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {les.title}
                          </span>
                          <span className="player-les__meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>lock</span>
                            Trancada
                          </span>
                        </div>
                      </div>
                    );
                  }

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
                            {les.type === 'pdf' ? 'menu_book' : les.type === 'quiz' ? 'quiz' : 'play_circle'}
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
          {isLessonLocked(activeLesson.id) ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px', color: 'white', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)', minHeight: '400px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--accent-purple)' }}>lock</span>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Esta aula está trancada</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '14px', lineHeight: 1.6 }}>
                Você precisa concluir as aulas anteriores deste curso antes de poder assistir a esta aula. Marque as aulas anteriores como concluídas na barra lateral.
              </p>
              <Link href="/dashboard" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Voltar ao Dashboard
              </Link>
            </div>
          ) : activeLesson.type === 'quiz' ? (
            /* ===== QUIZ VIEWER ===== */
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflowY: 'auto' }}>
              <div style={{ padding: '40px 20px', maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <h1 style={{ fontSize: '28px', color: 'var(--accent-cyan)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  📝 Quiz / Avaliação: {activeLesson.title}
                </h1>
                
                {(!activeLesson.quizQuestions || activeLesson.quizQuestions.length === 0) ? (
                  <p style={{ color: 'var(--text-muted)' }}>Este quiz ainda não possui perguntas cadastradas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {activeLesson.quizQuestions.map((q, qIdx) => {
                      const selectedOpt = quizAnswers[q.id];
                      return (
                        <div key={q.id || qIdx} style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'left' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: 'white' }}>
                            {qIdx + 1}. {q.question}
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {q.options?.map((opt, oIdx) => {
                              const isSelected = selectedOpt === oIdx;
                              const isCorrect = q.correctAnswerIndex === oIdx;
                              
                              let optBg = 'transparent';
                              let optBorder = 'rgba(255,255,255,0.1)';
                              if (isSelected) {
                                optBg = 'rgba(0, 102, 255, 0.15)';
                                optBorder = 'var(--accent-blue)';
                              }
                              
                              if (quizSubmitted) {
                                if (isCorrect) {
                                  optBg = 'rgba(16, 185, 129, 0.15)';
                                  optBorder = '#10b981';
                                } else if (isSelected && !isCorrect) {
                                  optBg = 'rgba(239, 68, 68, 0.15)';
                                  optBorder = '#ef4444';
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  disabled={quizSubmitted}
                                  onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                                  style={{
                                    textAlign: 'left',
                                    padding: '12px 15px',
                                    borderRadius: '6px',
                                    border: `1px solid ${optBorder}`,
                                    background: optBg,
                                    color: 'white',
                                    cursor: quizSubmitted ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '14px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: '2px solid ' + (isSelected ? 'var(--accent-blue)' : 'rgba(255,255,255,0.4)'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-blue)' }} />}
                                  </div>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {quizSubmitted ? (
                      <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '25px', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: quizScore >= 70 ? '#10b981' : '#ef4444', marginBottom: '10px' }}>
                          {quizScore >= 70 ? '🎉 Aprovado!' : '⚠️ Tente Novamente'}
                        </h2>
                        <p style={{ fontSize: '16px', margin: '0 0 15px 0' }}>
                          Sua nota: <strong>{quizScore}%</strong> (Mínimo exigido: 70%)
                        </p>
                        
                        {quizScore >= 70 ? (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Parabéns! Você atingiu a pontuação mínima e pode marcar esta aula como concluída.
                          </p>
                        ) : (
                          <button
                            onClick={() => {
                              setQuizSubmitted(false);
                              setQuizAnswers({});
                              setQuizScore(0);
                            }}
                            className="btn btn-primary"
                            style={{ margin: '10px auto 0 auto' }}
                          >
                            Refazer Quiz
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const unanswered = activeLesson.quizQuestions.some(q => quizAnswers[q.id] === undefined);
                          if (unanswered) {
                            alert("Por favor, responda todas as questões antes de enviar.");
                            return;
                          }

                          let correctCount = 0;
                          activeLesson.quizQuestions.forEach(q => {
                            if (quizAnswers[q.id] === q.correctAnswerIndex) {
                              correctCount++;
                            }
                          });

                          const score = Math.round((correctCount / activeLesson.quizQuestions.length) * 100);
                          setQuizScore(score);
                          setQuizSubmitted(true);

                          if (score >= 70) {
                            updateProgress(courseId, activeLesson.id, true);
                          }
                        }}
                        className="btn btn-primary"
                        style={{ alignSelf: 'flex-start', padding: '12px 30px' }}
                      >
                        Enviar Respostas
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeLesson.type === 'pdf' ? (
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
          ) : activeLesson.type === 'article' ? (
            /* ===== ARTICLE / TUTORIAL VIEWER ===== */
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflowY: 'auto' }}>
              <div style={{ padding: '40px 20px', maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <h1 style={{ fontSize: '32px', color: 'var(--accent-cyan)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>{activeLesson.title}</h1>
                
                {(!activeLesson.articleBlocks || activeLesson.articleBlocks.length === 0) ? (
                  <p style={{ color: 'var(--text-muted)' }}>Esta aula ainda não possui conteúdo estruturado.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {activeLesson.articleBlocks.map((block, bIdx) => {
                      if (block.type === 'heading') {
                        return <h2 key={bIdx} style={{ fontSize: '22px', color: 'white', fontWeight: 'bold', marginTop: '10px' }}>{block.content}</h2>;
                      }
                      if (block.type === 'text') {
                        return <p key={bIdx} style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{block.content}</p>;
                      }
                      if (block.type === 'image') {
                        return (
                          <figure key={bIdx} style={{ margin: '10px 0', textAlign: 'center' }}>
                            <img src={block.url} alt={block.caption || 'Imagem da aula'} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            {block.caption && <figcaption style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>{block.caption}</figcaption>}
                          </figure>
                        );
                      }
                      if (block.type === 'callout') {
                        const colors = {
                          info: { bg: 'rgba(56,189,248,0.1)', border: '#38bdf8', icon: '💡' },
                          warning: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', icon: '⚠️' },
                          success: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', icon: '✅' },
                          danger: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', icon: '🚨' }
                        };
                        const style = colors[block.variant || 'info'];
                        return (
                          <div key={bIdx} style={{ background: style.bg, borderLeft: `4px solid ${style.border}`, padding: '15px 20px', borderRadius: '4px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '20px' }}>{style.icon}</span>
                            <p style={{ margin: 0, fontSize: '15px', color: 'white', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{block.content}</p>
                          </div>
                        );
                      }
                      if (block.type === 'divider') {
                        return <div key={bIdx} style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />;
                      }
                      if (block.type === 'code') {
                        return (
                          <div key={bIdx} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '8px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{block.language}</span>
                              <button
                                onClick={() => handleCopyCode(block.content, bIdx)}
                                style={{ background: 'transparent', border: 'none', color: copiedIndex === bIdx ? '#34d399' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{copiedIndex === bIdx ? 'check' : 'content_copy'}</span>
                                {copiedIndex === bIdx ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: '15px', color: '#e6edf3', fontSize: '13px', lineHeight: 1.5, overflowX: 'auto', fontFamily: "'Cascadia Code', monospace" }}>
                              <code>{block.content}</code>
                            </pre>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeLesson.type === 'code' ? (
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
          
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button 
              onClick={() => toggleBookmark(courseId, activeLesson.id)}
              className="btn btn-outline"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                borderColor: user?.bookmarks?.[courseId]?.includes(activeLesson.id) ? 'var(--accent-cyan)' : 'var(--border-color)',
                color: user?.bookmarks?.[courseId]?.includes(activeLesson.id) ? 'var(--accent-cyan)' : 'white',
                background: user?.bookmarks?.[courseId]?.includes(activeLesson.id) ? 'rgba(0, 245, 212, 0.05)' : 'transparent',
                cursor: 'pointer'
              }}
              title={user?.bookmarks?.[courseId]?.includes(activeLesson.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: user?.bookmarks?.[courseId]?.includes(activeLesson.id) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
              {user?.bookmarks?.[courseId]?.includes(activeLesson.id) ? 'Favorito' : 'Favoritar'}
            </button>
            <button 
              className={`btn ${isActiveCompleted ? 'btn-secondary' : 'btn-outline'}`}
              disabled={activeLesson.type === 'quiz' && !isActiveCompleted && (!quizSubmitted || quizScore < 70)}
              onClick={(e) => handleToggleComplete(e, activeLesson.id)}
              style={{
                cursor: (activeLesson.type === 'quiz' && !isActiveCompleted && (!quizSubmitted || quizScore < 70)) ? 'not-allowed' : 'pointer'
              }}
              title={activeLesson.type === 'quiz' && !isActiveCompleted && (!quizSubmitted || quizScore < 70) ? "Você precisa passar no quiz com 70% ou mais para concluir esta aula." : ""}
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

        {/* ===== PERSONAL NOTES & RESOURCES TOGGLES ===== */}
        <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
          <button
            onClick={() => { setShowStudentNotes(!showStudentNotes); setShowResources(false); setShowQuestions(false); }}
            className={`btn ${showStudentNotes ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-sm)', padding: '8px 15px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
            Anotações Pessoais
          </button>
          
          <button 
            disabled={!activeLesson.description && !activeLesson.downloadUrl && (!activeLesson.codeBlocks || activeLesson.type === 'code')}
            onClick={() => { setShowResources(!showResources); setShowStudentNotes(false); setShowQuestions(false); }}
            className={`btn ${showResources ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: 'var(--font-sm)', padding: '8px 16px', borderRadius: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            Recursos / Downloads
          </button>

          <button 
            onClick={() => { setShowQuestions(!showQuestions); setShowStudentNotes(false); setShowResources(false); }}
            className={`btn ${showQuestions ? 'btn-primary' : 'btn-outline'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: 'var(--font-sm)', padding: '8px 16px', borderRadius: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>forum</span>
            Dúvidas da Aula (Q&A)
          </button>
        </div>

        {/* ===== STUDENT NOTES PANEL ===== */}
        {showStudentNotes && (
          <div style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--accent-cyan)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', color: 'var(--accent-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                Minhas Anotações
              </h4>
              {loadingNote && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Carregando...</span>}
            </div>
            
            <textarea
              rows="6"
              value={studentNote}
              onChange={(e) => setStudentNote(e.target.value)}
              placeholder="Escreva suas anotações para esta aula aqui. Elas serão salvas automaticamente ao clicar em Salvar."
              style={{ padding: '15px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', lineHeight: 1.6 }}
              disabled={loadingNote}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSaveNote} 
                disabled={savingNote || loadingNote}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{savingNote ? 'sync' : 'save'}</span>
                {savingNote ? 'Salvando...' : 'Salvar Anotações'}
              </button>
            </div>
          </div>
        )}

        {/* ===== RESOURCES PANEL ===== */}
        {showResources && (activeLesson.description || activeLesson.downloadUrl || (activeLesson.codeBlocks && activeLesson.type !== 'code')) && (
          <div style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            {/* Description text */}
            {activeLesson.description && (
              <div>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-cyan)' }}>Descrição / Notas do Instrutor</h4>
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

        {/* ===== QUESTIONS / Q&A PANEL ===== */}
        {showQuestions && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', marginTop: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', marginBottom: '15px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)', fontSize: '20px' }}>forum</span>
              Dúvidas da Aula (Q&A)
            </h3>

            {/* Post New Question Form */}
            <form onSubmit={handlePostQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
              <textarea
                placeholder="Tem alguma dúvida sobre esta aula? Pergunte aqui..."
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px 15px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', resize: 'vertical' }}
              />
              <button
                type="submit"
                disabled={submittingQuestion || !newQuestionText.trim()}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-end', fontSize: '13px', padding: '6px 15px', cursor: 'pointer' }}
              >
                {submittingQuestion ? 'Enviando...' : 'Postar Dúvida'}
              </button>
            </form>

            {/* Questions List */}
            {loadingQuestions ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando dúvidas...</p>
            ) : questions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nenhuma dúvida registrada para esta aula. Seja o primeiro a perguntar!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {questions.map((question) => (
                  <div key={question.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '15px' }}>
                    
                    {/* Parent Question Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      {question.userAvatar ? (
                        <img src={question.userAvatar} alt={question.userName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifySelf: 'center', fontSize: '12px', fontWeight: 'bold', justifyContent: 'center' }}>
                          {question.userName?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong style={{ fontSize: '13px', color: 'white' }}>{question.userName}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          {new Date(question.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '0 0 12px 0' }}>
                      {question.content}
                    </p>

                    {/* Replies */}
                    {question.replies && question.replies.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '20px', borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '15px', marginBottom: '15px' }}>
                        {question.replies.map((reply) => (
                          <div key={reply.replyId} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: reply.role === 'admin' ? '1px solid rgba(139, 92, 246, 0.15)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              {reply.userAvatar ? (
                                <img src={reply.userAvatar} alt={reply.userName} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: reply.role === 'admin' ? 'var(--accent-purple)' : 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                  {reply.userName?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <strong style={{ fontSize: '12px', color: 'white' }}>
                                  {reply.userName} 
                                  {reply.role === 'admin' && <span style={{ marginLeft: '5px', fontSize: '9px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)', padding: '1px 4px', borderRadius: '3px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>ADMIN</span>}
                                </strong>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                  {new Date(reply.createdAt).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, margin: 0, whiteSpace: 'pre-wrap' }}>
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Post Reply Box */}
                    <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                      <input
                        type="text"
                        placeholder="Responder a esta dúvida..."
                        value={replyTextMap[question.id] || ''}
                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [question.id]: e.target.value }))}
                        style={{ flexGrow: 1, padding: '6px 12px', borderRadius: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '13px' }}
                      />
                      <button
                        onClick={() => handlePostReply(question.id)}
                        disabled={submittingReplyId === question.id || !(replyTextMap[question.id] || '').trim()}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        {submittingReplyId === question.id ? '...' : 'Responder'}
                      </button>
                    </div>

                  </div>
                ))}
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
