"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { db } from '../../utils/firebase/client';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore/lite';

function DashboardContent() {
  const { user, courses, reloadUser } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [selectedCertificateCourse, setSelectedCertificateCourse] = useState(null);

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoBase64, setEditPhotoBase64] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [checkingPaymentId, setCheckingPaymentId] = useState(null);

  // Gamification & referrals state
  const [referralsCount, setReferralsCount] = useState(0);

  // Review modal state
  const [selectedReviewCourse, setSelectedReviewCourse] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (selectedCertificateCourse) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [selectedCertificateCourse]);

  const getInitials = (name) => {
    if (!name) return 'EX';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleOpenEditProfile = () => {
    setEditName(user.name || '');
    setEditPhotoBase64(user.avatar_url && !user.avatar_url.includes('unsplash.com') ? user.avatar_url : '');
    setEditCargo(user.cargo || '');
    setShowEditProfileModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor, selecione uma imagem válida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setEditPhotoBase64(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("O nome não pode ficar em branco.");
      return;
    }

    setSavingProfile(true);
    try {
      const profileRef = doc(db, 'profiles', user.id);
      await updateDoc(profileRef, {
        name: editName.trim(),
        avatar_url: editPhotoBase64,
        cargo: editCargo.trim()
      });

      await reloadUser();
      alert("Perfil atualizado com sucesso!");
      setShowEditProfileModal(false);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Erro ao salvar perfil: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCheckPayment = async (courseId, purchaseId) => {
    setCheckingPaymentId(purchaseId);
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          courseId: courseId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'approved') {
          alert("✅ Pagamento confirmado! Seu acesso ao curso foi liberado.");
          await reloadUser();
          setPendingPurchases(prev => prev.filter(p => p.id !== purchaseId));
        } else {
          alert("⌛ O Mercado Pago ainda não confirmou o recebimento deste pagamento. Se você acabou de pagar, aguarde de 1 a 2 minutos e clique novamente.");
        }
      } else {
        alert("Não conseguimos verificar com o Mercado Pago. Tente novamente em alguns segundos.");
      }
    } catch (err) {
      console.error("Erro ao verificar pagamento:", err);
      alert("Erro de conexão ao verificar pagamento.");
    } finally {
      setCheckingPaymentId(null);
    }
  };

  // Fetch pending purchases and auto-expire items older than 24 hours
  useEffect(() => {
    if (user && user.id) {
      const fetchPendingPurchases = async () => {
        try {
          const purchasesRef = collection(db, 'purchases');
          const q = query(
            purchasesRef, 
            where('user_id', '==', user.id), 
            where('status', '==', 'pending')
          );
          const querySnapshot = await getDocs(q);
          const pending = [];
          const now = new Date();
          for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const createdAtStr = data.created_at || data.updated_at;
            if (createdAtStr) {
              const createdAt = new Date(createdAtStr);
              const diffMs = now.getTime() - createdAt.getTime();
              const diffHours = diffMs / (1000 * 60 * 60);
              if (diffHours >= 24) {
                // Silently expire in database
                try {
                  await updateDoc(doc(db, 'purchases', docSnap.id), {
                    status: 'expired',
                    updated_at: now.toISOString()
                  });
                } catch (err) {
                  console.error("Erro ao expirar compra:", err);
                }
                continue; // Skip rendering
              }
            }
            pending.push({ id: docSnap.id, ...data });
          }
          setPendingPurchases(pending);
        } catch (e) {
          console.error("Erro ao buscar compras pendentes:", e);
        }
      };
      fetchPendingPurchases();
    }
  }, [user]);

  // Fetch count of successful referrals
  useEffect(() => {
    if (user && user.id) {
      const fetchReferrals = async () => {
        try {
          const purchasesRef = collection(db, 'purchases');
          const q = query(
            purchasesRef,
            where('ref_user_id', '==', user.id),
            where('status', '==', 'approved')
          );
          const snap = await getDocs(q);
          setReferralsCount(snap.size);
        } catch (e) {
          console.error("Erro ao buscar indicações:", e);
        }
      };
      fetchReferrals();
    }
  }, [user]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReviewCourse || !user) return;
    setSubmittingReview(true);
    setReviewError('');
    try {
      await addDoc(collection(db, 'reviews'), {
        userId: user.id,
        userName: user.name || 'Aluno',
        userCargo: user.cargo || '',
        courseId: selectedReviewCourse.id,
        rating: reviewRating,
        comment: reviewComment,
        created_at: new Date().toISOString()
      });
      alert("Avaliação enviada com sucesso! Obrigado pelo seu feedback.");
      setSelectedReviewCourse(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      console.error("Error submitting review:", err);
      setReviewError("Erro ao enviar avaliação: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShareReferral = (course) => {
    if (!user) return;
    const refLink = `${window.location.origin}/curso/${course.id}?ref=${user.id}`;
    navigator.clipboard.writeText(refLink).then(() => {
      alert(`🔗 Link de indicação copiado com sucesso para o curso "${course.title}"!\n\nEnvie para seus amigos. Se 3 amigos comprarem através dele, você ganha a Mentoria Individual Grátis!`);
    }).catch(err => {
      console.error("Erro ao copiar link:", err);
      alert(`Link de indicação: ${refLink}`);
    });
  };

  // Auto-verify all pending payments in background when dashboard loads
  useEffect(() => {
    if (typeof window === 'undefined' || !user || !user.id || pendingPurchases.length === 0) return;

    const verifyAllPending = async () => {
      let anyApproved = false;
      for (const purchase of pendingPurchases) {
        try {
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              courseId: purchase.course_id
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'approved') {
              anyApproved = true;
            }
          }
        } catch (err) {
          console.error("Erro na verificação automática:", err);
        }
      }
      if (anyApproved) {
        await reloadUser();
        // Reload local list
        try {
          const purchasesRef = collection(db, 'purchases');
          const q = query(
            purchasesRef, 
            where('user_id', '==', user.id), 
            where('status', '==', 'pending')
          );
          const querySnapshot = await getDocs(q);
          const pending = [];
          querySnapshot.forEach(doc => {
            pending.push({ id: doc.id, ...doc.data() });
          });
          setPendingPurchases(pending);
          alert("✅ Seu pagamento foi processado com sucesso e o acesso ao curso foi liberado!");
        } catch (e) {
          console.error(e);
        }
      }
    };

    // Delay checking slightly to allow MP Webhook to act first
    const timer = setTimeout(() => {
      verifyAllPending();
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, pendingPurchases.length]);

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
      nextLessonId = course.syllabus?.[0]?.lessons?.[0]?.id || '';
    }

    return `/player/${course.id}/${nextLessonId}`;
  };

  return (
    <main style={{ paddingTop: '100px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        {/* Student Profile Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', marginBottom: 'var(--space-10)', flexWrap: 'wrap' }}>
          {user.avatar_url && !user.avatar_url.includes('unsplash.com') ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-cyan)' }} 
            />
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              border: '2px solid var(--accent-cyan)',
              flexShrink: 0
            }}>
              {getInitials(user.name)}
            </div>
          )}
          
          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold', margin: 0 }}>Olá, {user.name}!</h1>
              <button 
                onClick={handleOpenEditProfile} 
                className="btn btn-sm btn-outline" 
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '11px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>edit</span>
                Editar Perfil
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>Estudante NSNexus • {user.email}</p>
          </div>
          
          {user.role === 'admin' && (
            <Link href="/admin" className="btn btn-sm btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))', border: 'none', color: 'white', textDecoration: 'none' }}>
              Acessar Painel Admin
            </Link>
          )}
        </div>

        {/* Indique & Ganhe Mission */}
        {user && (
          <div style={{
            background: 'rgba(0, 245, 212, 0.05)',
            border: '1px solid rgba(0, 245, 212, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-8)'
          }}>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', margin: '0 0 5px 0' }}>
              <span className="material-symbols-outlined">rocket_launch</span>
              Missão Indique & Ganhe
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', margin: '0 0 15px 0', lineHeight: 1.4 }}>
              Indique 3 amigos usando seu link exclusivo e ganhe uma <strong>Mentoria Individual Gratuita</strong>!
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--font-sm)' }}>
              <span>Progresso das indicações confirmadas:</span>
              <span style={{ fontWeight: 'bold', color: referralsCount >= 3 ? 'var(--accent-cyan)' : 'white' }}>
                {referralsCount >= 3 ? '🎉 Completa!' : `${referralsCount} de 3 amigos`}
              </span>
            </div>
            
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{
                width: `${Math.min(100, (referralsCount / 3) * 100)}%`,
                height: '100%',
                background: referralsCount >= 3 ? 'var(--accent-cyan)' : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
                transition: 'width 0.3s'
              }}></div>
            </div>

            {referralsCount >= 3 ? (
              <div style={{ background: 'rgba(0, 245, 212, 0.1)', border: '1px solid var(--accent-cyan)', padding: '12px 15px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-xs)', color: 'var(--accent-cyan)', lineHeight: 1.5 }}>
                <strong>🚀 MISSÃO CUMPRIDA!</strong> Você indicou {referralsCount} amigos com sucesso e conquistou a sua Mentoria Individual Grátis! Fale com o suporte clicando no balão de bate-papo da Fabi no canto inferior direito para agendar.
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Dica: Clique em "Indicar" no card de qualquer curso abaixo para gerar seu link de recomendação.
              </p>
            )}
          </div>
        )}

        {/* Pending Purchases Alert */}
        {pendingPurchases.length > 0 && (
          <div style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5) var(--space-6)',
            marginBottom: 'var(--space-8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#eab308', fontWeight: 'bold' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>hourglass_empty</span>
              <span style={{ fontSize: 'var(--font-md)' }}>Pagamento sob Análise</span>
            </div>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Identificamos o seu pedido para o(s) produto(s) abaixo. Nosso time está validando a transação. O acesso será liberado em breve!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px 15px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.03)' }}>
              {pendingPurchases.map(p => {
                const courseObj = courses.find(c => c.id === p.course_id);
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: 'var(--font-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>shopping_bag</span>
                      <strong>{courseObj?.title || p.course_id}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Código: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{p.payment_id}</span>
                      </div>
                      <button
                        onClick={() => handleCheckPayment(p.course_id, p.id)}
                        disabled={checkingPaymentId === p.id}
                        className="btn btn-sm btn-outline"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          borderColor: 'var(--accent-cyan)',
                          color: 'var(--accent-cyan)',
                          background: 'rgba(0, 245, 212, 0.05)',
                          borderRadius: '4px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', animation: checkingPaymentId === p.id ? 'spin 1s linear infinite' : 'none' }}>sync</span>
                        {checkingPaymentId === p.id ? 'Verificando...' : 'Checar Pagamento'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Dica: Caso tenha acabado de pagar por boleto ou cartão/PIX via link externo, a compensação pode levar alguns minutos.
            </p>
          </div>
        )}

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
                        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Link href={getContinueLink(course)} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                            {completedCount > 0 ? 'Continuar Curso' : 'Iniciar Curso'}
                          </Link>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                            <button 
                              onClick={() => handleShareReferral(course)}
                              className="btn btn-sm btn-outline"
                              style={{ 
                                justifyContent: 'center', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: '6px 10px',
                                borderRadius: '4px'
                              }}
                              title="Compartilhar link de indicação"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>share</span>
                              Indicar
                            </button>
                            <button 
                              onClick={() => {
                                setReviewRating(5);
                                setReviewComment('');
                                setReviewError('');
                                setSelectedReviewCourse(course);
                              }}
                              className="btn btn-sm btn-outline"
                              style={{ 
                                justifyContent: 'center', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: '6px 10px',
                                borderRadius: '4px'
                              }}
                              title="Avaliar este curso"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>star</span>
                              Avaliar
                            </button>
                          </div>
                          {(percentage === 100 || user.completedCourses?.includes(course.id)) && (
                            <button 
                              onClick={() => setSelectedCertificateCourse(course)}
                              className="btn btn-full" 
                              style={{ 
                                justifyContent: 'center', 
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                                border: 'none', 
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer',
                                padding: '8px 12px',
                                fontSize: 'var(--font-sm)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 'bold'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>workspace_premium</span>
                              Gerar Certificado
                            </button>
                          )}
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

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-modal-overlay {
            visibility: visible !important;
            background: #ffffff !important;
            position: absolute !important;
            padding: 0 !important;
            margin: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 99999 !important;
          }
          .print-certificate-container, .print-certificate-container * {
            visibility: visible !important;
          }
          .print-certificate-container {
            position: relative !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 100% !important;
            padding: 20mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Certificate Modal */}
      {selectedCertificateCourse && (
        <div 
          className="video-modal video-modal--active print-modal-overlay" 
          onClick={() => setSelectedCertificateCourse(null)} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 2000, 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)'
          }}
        >
          <div 
            className="print-certificate-container"
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '850px', 
              width: '95%', 
              background: '#ffffff', 
              color: '#0f172a',
              padding: '40px', 
              borderRadius: '12px', 
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Close Button (Hidden in Print) */}
            <button 
              className="no-print"
              onClick={() => setSelectedCertificateCourse(null)} 
              style={{ 
                position: 'absolute',
                top: '15px',
                right: '20px',
                background: 'transparent', 
                border: 'none', 
                color: '#64748b', 
                fontSize: '28px', 
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              &times;
            </button>

            {/* Certificate Border Design */}
            <div style={{
              border: '6px double #d97706',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              position: 'relative',
              background: '#fcfbf7'
            }}>
              
              {/* Decorative Corner Seals */}
              <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: '2px solid #d97706', borderLeft: '2px solid #d97706' }}></div>
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: '2px solid #d97706', borderRight: '2px solid #d97706' }}></div>
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: '2px solid #d97706', borderLeft: '2px solid #d97706' }}></div>
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: '2px solid #d97706', borderRight: '2px solid #d97706' }}></div>

              {/* Logo/Badge */}
              <div style={{ marginBottom: '20px' }}>
                <span className="accent-gradient" style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-heading)', letterSpacing: '0.05em' }}>
                  NSNEXUS
                </span>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', marginTop: '2px', fontWeight: 'bold' }}>
                  Treinamentos Corporativos
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-heading)', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', letterSpacing: '0.02em' }}>
                CERTIFICADO DE CONCLUSÃO
              </h2>

              <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.8, maxWidth: '650px', margin: '0 auto 30px auto' }}>
                Certificamos que o aluno(a) <strong style={{ fontSize: '18px', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '2px' }}>{user.name}</strong> concluiu com êxito o treinamento corporativo
                <br />
                <strong style={{ fontSize: '18px', color: '#d97706' }}>{selectedCertificateCourse.title}</strong>,
                com nível de qualificação <strong style={{ color: '#0f172a' }}>{selectedCertificateCourse.level}</strong>, carga horária de <strong style={{ color: '#0f172a' }}>{selectedCertificateCourse.duration}</strong> e aproveitamento integral do conteúdo programático.
              </p>

              {/* Signatures & Info Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: '40px', flexWrap: 'wrap', gap: '30px' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #94a3b8', width: '200px', margin: '0 auto 8px auto' }}></div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Coordenação Acadêmica</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>NSNexus Education</div>
                </div>

                {/* Seal Icon */}
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px dashed #d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#d97706' }}>workspace_premium</span>
                </div>

                <div>
                  <div style={{ borderBottom: '1px solid #94a3b8', width: '200px', margin: '0 auto 8px auto', fontSize: '13px', color: '#334155', fontFamily: 'monospace' }}>
                    {new Date().toLocaleDateString('pt-BR')}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>Data de Emissão</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Acesso Vitalício</div>
                </div>
              </div>

              {/* Authenticity Hash */}
              <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '35px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Código de Autenticidade: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>NS-{selectedCertificateCourse.id.substring(0,4).toUpperCase()}-{user.id.substring(0,6).toUpperCase()}</span>
              </div>

            </div>

            {/* Print & Close Controls (Hidden in Print) */}
            <div className="no-print" style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={() => setSelectedCertificateCourse(null)} 
                className="btn btn-outline"
                style={{ borderColor: '#cbd5e1', color: '#475569' }}
              >
                Fechar
              </button>
              <button 
                onClick={() => window.print()} 
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span>
                Imprimir / Salvar PDF
              </button>
            </div>

          </div>
        </div>
      )}
      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6, 7, 13, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            width: '100%',
            maxWidth: '450px',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)' }}>person</span>
              Editar Perfil Acadêmico
            </h2>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Atualize suas informações abaixo. O nome digitado será o impresso oficialmente em seus certificados de conclusão.
            </p>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Photo Upload & Preview Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {editPhotoBase64 ? (
                  <img 
                    src={editPhotoBase64} 
                    alt="Preview" 
                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-cyan)' }} 
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: 'white',
                    border: '2px solid var(--accent-cyan)'
                  }}>
                    {getInitials(editName || user.name)}
                  </div>
                )}
                
                <div style={{ flexGrow: 1 }}>
                  <label 
                    htmlFor="photo-upload-input" 
                    className="btn btn-sm btn-outline" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      fontSize: '11px', 
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '6px 12px',
                      borderRadius: '4px'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>upload</span>
                    Escolher Foto
                  </label>
                  <input 
                    type="file" 
                    id="photo-upload-input" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  {editPhotoBase64 && (
                    <button 
                      type="button" 
                      onClick={() => setEditPhotoBase64('')}
                      style={{ 
                        display: 'block', 
                        background: 'none', 
                        border: 'none', 
                        color: '#ef4444', 
                        fontSize: '10px', 
                        marginTop: '6px', 
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Remover foto e usar iniciais
                    </button>
                  )}
                </div>
              </div>

              {/* Name Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome Completo (Certificado)</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  required
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    padding: '10px 12px',
                    fontSize: 'var(--font-sm)',
                    outline: 'none'
                  }}
                  placeholder="Seu nome completo para o certificado"
                />
              </div>

              {/* Cargo / Profissão Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cargo / Profissão</label>
                <input 
                  type="text" 
                  value={editCargo} 
                  onChange={(e) => setEditCargo(e.target.value)} 
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    padding: '10px 12px',
                    fontSize: 'var(--font-sm)',
                    outline: 'none'
                  }}
                  placeholder="ex: Analista de BI / Gerente de TI / Estudante"
                />
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowEditProfileModal(false)} 
                  disabled={savingProfile}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '12px', background: 'transparent', color: 'white', border: '1px solid var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingProfile}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Review Modal */}
      {selectedReviewCourse && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)',
            width: '100%',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-cyan-glow)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedReviewCourse(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Avaliar Curso</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '20px' }}>
              Deixe seu feedback real para o curso: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedReviewCourse.title}</strong>
            </p>

            {reviewError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: 'var(--font-sm)' }}>
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Star Rating Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nota (Estrelas)</label>
                <div style={{ display: 'flex', gap: '8px', padding: '5px 0' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ffb000' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', pointerEvents: 'none', fontVariationSettings: `"FILL" ${star <= reviewRating ? 1 : 0}` }}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment / Review */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comentário / Opinião</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="O que você achou das aulas, didática e exemplos práticos?"
                  required
                  rows="4"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    padding: '10px 12px',
                    fontSize: 'var(--font-sm)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedReviewCourse(null)} 
                  disabled={submittingReview}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '12px', background: 'transparent', color: 'white', border: '1px solid var(--border-color)' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  {submittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
