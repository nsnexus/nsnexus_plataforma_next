"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../utils/firebase/client';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import AdminRoute from '../../components/AdminRoute';

function getProjectCover(proj) {
  if (!proj.isStatic && proj.mediaUrl) {
    if (proj.mediaUrl.includes('youtube.com') || proj.mediaUrl.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = proj.mediaUrl.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }
  if (proj.coverUrl) return proj.coverUrl;
  return proj.mediaUrl;
}

function AdminContent() {
  const { user, signOut, courses, reloadCourses } = useAuth();
  const router = useRouter();

  // Active section state
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Database lists
  const [dbUsers, setDbUsers] = useState([]);
  const [dbPurchases, setDbPurchases] = useState([]);
  const [dbProjects, setDbProjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Portfolio CRUD state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [savingProject, setSavingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    id: '',
    title: '',
    type: 'sharepoint',
    badge: 'SharePoint & HTML/JS',
    desc: '',
    metricIcon: 'speed',
    metricLabel: '',
    coverUrl: '/images/sharepoint.jpeg',
    mediaUrl: '',
    isStatic: true
  });

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState('all');

  // Manual purchase form states
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [manualPrice, setManualPrice] = useState(0);
  const [addingPurchase, setAddingPurchase] = useState(false);

  // Certificates management states
  const [showCertificatesModal, setShowCertificatesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [savingCertificates, setSavingCertificates] = useState(false);

  // Courses CRUD state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // null when adding
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    id: '',
    title: '',
    description: '',
    price: 0,
    original_price: 0,
    payment_link: '',
    duration: '',
    lessons_count: '',
    instructor: 'Especialistas em IA & Sistemas',
    type: 'video',
    category: 'sistemas',
    badge_class: 'badge-systems',
    badge_label: 'Sistemas & SharePoint',
    level: 'Sem Programação',
    banner: 'images/sharepoint.jpeg',
    is_closed: false,
    syllabus: []
  });

  // Fetch all profiles and purchases from Firestore
  const loadData = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch profiles
      const profilesRef = collection(db, 'profiles');
      const profilesSnap = await getDocs(profilesRef);
      const profiles = [];
      profilesSnap.forEach((doc) => {
        profiles.push(doc.data());
      });
      profiles.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setDbUsers(profiles);

      // 2. Fetch purchases
      const purchasesRef = collection(db, 'purchases');
      const purchasesSnap = await getDocs(purchasesRef);
      const purchases = [];
      purchasesSnap.forEach((doc) => {
        purchases.push({
          id: doc.id,
          ...doc.data()
        });
      });
      purchases.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setDbPurchases(purchases);

      // 3. Fetch projects
      const projectsRef = collection(db, 'projects');
      const projectsSnap = await getDocs(projectsRef);
      const projectsList = [];
      projectsSnap.forEach((doc) => {
        projectsList.push({
          dbId: doc.id,
          ...doc.data()
        });
      });
      projectsList.sort((a, b) => (a.order || 0) - (b.order || 0));
      setDbProjects(projectsList);

    } catch (err) {
      console.error('[Admin] Erro ao carregar dados:', err);
      alert('Erro ao buscar dados do banco de dados do Firestore.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleCourseCompletion = async (targetUser, courseId, shouldComplete) => {
    setSavingCertificates(true);
    try {
      const currentCompleted = targetUser.completedCourses || [];
      let updatedCompleted = [];
      if (shouldComplete) {
        if (!currentCompleted.includes(courseId)) {
          updatedCompleted = [...currentCompleted, courseId];
        } else {
          updatedCompleted = currentCompleted;
        }
      } else {
        updatedCompleted = currentCompleted.filter(id => id !== courseId);
      }

      // Update in Firestore
      const userRef = doc(db, 'profiles', targetUser.id);
      await updateDoc(userRef, { completedCourses: updatedCompleted });

      // Update local state to reflect change immediately
      const updatedUser = { ...targetUser, completedCourses: updatedCompleted };
      setSelectedUser(updatedUser);
      setDbUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));

      alert('Certificado atualizado com sucesso!');
    } catch (err) {
      console.error('[Admin] Erro ao atualizar conclusão do curso:', err);
      alert('Erro ao atualizar conclusão no Firestore.');
    } finally {
      setSavingCertificates(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdminLogout = async () => {
    await signOut();
    router.push('/');
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const totalUsers = dbUsers.length;
    const totalPurchases = dbPurchases.length;
    
    // Sum only approved purchases
    const approvedPurchases = dbPurchases.filter(p => p.status === 'approved');
    const totalRevenue = approvedPurchases.reduce((sum, p) => sum + (Number(p.price_paid) || 0), 0);

    // Conversion rate: users who purchased at least one approved course
    const payingUserIds = new Set(approvedPurchases.map(p => p.user_id));
    const conversionRate = totalUsers > 0 
      ? Math.round((payingUserIds.size / totalUsers) * 100) 
      : 0;

    return {
      totalUsers,
      totalPurchases,
      totalRevenue,
      conversionRate
    };
  }, [dbUsers, dbPurchases]);

  // Filter lists based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return dbUsers;
    const query = searchTerm.toLowerCase().trim();
    return dbUsers.filter(u => 
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      u.id.includes(query)
    );
  }, [dbUsers, searchTerm]);

  const filteredPurchases = useMemo(() => {
    let result = dbPurchases;
    
    // Status Filter
    if (purchaseFilter !== 'all') {
      result = result.filter(p => p.status === purchaseFilter);
    }

    if (!searchTerm.trim()) return result;
    const query = searchTerm.toLowerCase().trim();
    return result.filter(p => 
      (p.user_name && p.user_name.toLowerCase().includes(query)) ||
      (p.user_email && p.user_email.toLowerCase().includes(query)) ||
      (p.course_id && p.course_id.toLowerCase().includes(query)) ||
      (p.payment_id && p.payment_id.toLowerCase().includes(query))
    );
  }, [dbPurchases, purchaseFilter, searchTerm]);

  // Handle manual purchase insert
  const handleAddManualPurchase = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedCourseId) {
      alert("Selecione o usuário e o curso.");
      return;
    }

    setAddingPurchase(true);
    try {
      const selectedUser = dbUsers.find(u => u.id === selectedUserId);
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      
      const transactionId = 'MAN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // Insert purchase row into Firestore database
      await addDoc(collection(db, 'purchases'), {
        user_id: selectedUserId,
        user_email: selectedUser?.email || '',
        user_name: selectedUser?.name || 'Sem nome',
        course_id: selectedCourseId,
        price_paid: Number(manualPrice) || selectedCourse?.price || 0,
        status: 'approved',
        payment_id: transactionId,
        created_at: new Date().toISOString()
      });

      alert("Compra registrada com sucesso no banco de dados!");
      setShowAddPurchaseModal(false);
      setSelectedUserId('');
      setSelectedCourseId('');
      setManualPrice(0);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar compra: " + err.message);
    } finally {
      setAddingPurchase(false);
    }
  };

  // Toggle status of a purchase (Approve/Cancel)
  const togglePurchaseStatus = async (purchaseId, currentStatus) => {
    const nextStatus = currentStatus === 'approved' ? 'cancelled' : 'approved';
    if (!window.confirm(`Deseja alterar o status desta compra para ${nextStatus.toUpperCase()}?`)) return;

    try {
      const purchaseRef = doc(db, 'purchases', purchaseId);
      await updateDoc(purchaseRef, { status: nextStatus });
      
      alert("Status da transação atualizado com sucesso!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status: " + err.message);
    }
  };

  const getCourseTitle = (courseId) => {
    return courses.find(c => c.id === courseId)?.title || courseId;
  };

  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      id: '',
      title: '',
      description: '',
      price: 0,
      original_price: 0,
      payment_link: '',
      duration: '',
      lessons_count: '',
      instructor: 'Especialista NSNexus',
      type: 'video',
      category: 'sistemas',
      badge_class: 'badge-systems',
      badge_label: 'Sistemas & SharePoint',
      level: 'Sem Programação',
      banner: 'images/sharepoint.jpeg',
      is_closed: false,
      syllabus: []
    });
    setShowCourseModal(true);
  };

  const handleOpenEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      id: course.id,
      title: course.title,
      description: course.description || '',
      price: course.price || 0,
      original_price: course.originalPrice || 0,
      payment_link: course.paymentLink || '',
      duration: course.duration || '',
      lessons_count: course.lessonsCount || '',
      instructor: course.instructor || 'Especialista NSNexus',
      type: course.type || 'video',
      category: course.category || 'sistemas',
      badge_class: course.badgeClass || 'badge-systems',
      badge_label: course.badgeLabel || 'Sistemas & SharePoint',
      level: course.level || 'Sem Programação',
      banner: course.banner || 'images/sharepoint.jpeg',
      is_closed: !!course.isClosed,
      syllabus: course.syllabus || []
    });
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.id || !courseForm.title) {
      alert("ID e Título são obrigatórios.");
      return;
    }
    setSavingCourse(true);
    try {
      if (editingCourse) {
        // Update
        const courseRef = doc(db, 'courses', editingCourse.id);
        await setDoc(courseRef, {
          id: editingCourse.id,
          title: courseForm.title,
          description: courseForm.description,
          price: Number(courseForm.price) || 0,
          originalPrice: Number(courseForm.original_price) || 0,
          paymentLink: courseForm.payment_link,
          duration: courseForm.duration,
          lessonsCount: courseForm.lessons_count,
          instructor: courseForm.instructor,
          type: courseForm.type,
          category: courseForm.category,
          badgeClass: courseForm.badge_class,
          badgeLabel: courseForm.badge_label,
          level: courseForm.level,
          banner: courseForm.banner,
          isClosed: courseForm.is_closed,
          syllabus: courseForm.syllabus
        }, { merge: true });

        alert("Curso atualizado com sucesso!");
      } else {
        // Insert
        const courseRef = doc(db, 'courses', courseForm.id.trim());
        await setDoc(courseRef, {
          id: courseForm.id.trim(),
          title: courseForm.title,
          description: courseForm.description,
          price: Number(courseForm.price) || 0,
          originalPrice: Number(courseForm.original_price) || 0,
          paymentLink: courseForm.payment_link,
          duration: courseForm.duration,
          lessonsCount: courseForm.lessons_count,
          instructor: courseForm.instructor,
          type: courseForm.type,
          category: courseForm.category,
          badgeClass: courseForm.badge_class,
          badgeLabel: courseForm.badge_label,
          level: courseForm.level,
          banner: courseForm.banner,
          isClosed: courseForm.is_closed,
          syllabus: courseForm.syllabus,
          rating: 5.0,
          reviewsCount: 0
        });

        alert("Curso cadastrado com sucesso!");
      }
      setShowCourseModal(false);
      await reloadCourses();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar curso: " + err.message);
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Deseja realmente excluir este curso de forma permanente?")) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));

      alert("Curso excluído com sucesso!");
      await reloadCourses();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir curso: " + err.message);
    }
  };

  // Portfolio CRUD handlers
  const handleOpenAddProject = () => {
    setEditingProject(null);
    setProjectForm({
      id: 'proj-' + Math.floor(1000 + Math.random() * 9000),
      title: '',
      type: 'sharepoint',
      badge: 'SharePoint & HTML/JS',
      desc: '',
      metricIcon: 'speed',
      metricLabel: '',
      coverUrl: '/images/sharepoint.jpeg',
      mediaUrl: '',
      isStatic: true
    });
    setShowProjectModal(true);
  };

  const handleOpenEditProject = (proj) => {
    setEditingProject(proj);
    setProjectForm({
      id: proj.id || '',
      title: proj.title || '',
      type: proj.type || 'sharepoint',
      badge: proj.badge || '',
      desc: proj.desc || '',
      metricIcon: proj.metricIcon || 'speed',
      metricLabel: proj.metricLabel || '',
      coverUrl: proj.coverUrl || '',
      mediaUrl: proj.mediaUrl || '',
      isStatic: !!proj.isStatic
    });
    setShowProjectModal(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectForm.id || !projectForm.title) {
      alert("ID e Título são obrigatórios.");
      return;
    }
    setSavingProject(true);
    try {
      const data = {
        id: projectForm.id.trim(),
        title: projectForm.title,
        type: projectForm.type,
        badge: projectForm.badge,
        desc: projectForm.desc,
        metricIcon: projectForm.metricIcon,
        metricLabel: projectForm.metricLabel,
        coverUrl: projectForm.coverUrl,
        mediaUrl: projectForm.mediaUrl,
        isStatic: projectForm.isStatic,
        order: editingProject ? (editingProject.order ?? 0) : dbProjects.length
      };

      if (editingProject) {
        // Update
        const projectRef = doc(db, 'projects', editingProject.dbId);
        await setDoc(projectRef, data, { merge: true });
        alert("Projeto atualizado com sucesso!");
      } else {
        // Insert
        await addDoc(collection(db, 'projects'), data);
        alert("Projeto cadastrado com sucesso!");
      }
      setShowProjectModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar projeto: " + err.message);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (projDbId) => {
    if (!window.confirm("Deseja realmente excluir este projeto de forma permanente?")) return;
    try {
      await deleteDoc(doc(db, 'projects', projDbId));
      alert("Projeto excluído com sucesso!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir projeto: " + err.message);
    }
  };

  return (
    <div className="admin-body-override" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'white' }}>
      
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar" style={{ zIndex: 100 }}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <span className="brand-icon">⚡</span>
            <div>
              <div className="brand-name">NSNexus</div>
              <div className="brand-label">Painel Admin</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📊</span>
            <span>Visão Geral</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'users' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('users'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">👥</span>
            <span>Usuários ({dbUsers.length})</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'purchases' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('purchases'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">🛒</span>
            <span>Compras ({dbPurchases.length})</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'products' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('products'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📦</span>
            <span>Produtos ({courses.length})</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'portfolio' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('portfolio'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📁</span>
            <span>Portfólio ({dbProjects.length})</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleAdminLogout} style={{ width: '100%', cursor: 'pointer' }}>
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main" style={{ flexGrow: 1, padding: '30px', minWidth: 0 }}>
        
        {/* Topbar */}
        <header className="admin-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} id="menu-toggle">☰</button>
            <div className="topbar-search" style={{ display: 'flex', alignItems: 'center', background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 15px' }}>
              <span className="search-icon" style={{ marginRight: '8px' }}>🔍</span>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuário, produto, e-mail..." 
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '250px' }}
              />
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="btn-refresh" onClick={loadData} title="Recarregar dados" style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}>
              <span>🔄</span>
            </button>
            <div className="admin-badge" style={{ background: 'rgba(0, 245, 212, 0.1)', color: 'var(--accent-cyan)', padding: '5px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-xs)' }}>
              <span className="admin-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
              Admin
            </div>
          </div>
        </header>

        {loadingData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '15px' }}>
            <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', borderLeftColor: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Carregando dados reais do Firebase...</p>
          </div>
        ) : (
          <>
            {/* ========== SECTION: OVERVIEW ========== */}
            {activeSection === 'overview' && (
              <section className="admin-section active">
                <div className="section-header" style={{ marginBottom: '25px' }}>
                  <h1 className="section-title" style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Visão Geral</h1>
                  <p className="section-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Resumo real da plataforma</p>
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '35px' }}>
                  <div className="kpi-card kpi-blue">
                    <div className="kpi-icon">👥</div>
                    <div className="kpi-content">
                      <div className="kpi-value">{kpis.totalUsers}</div>
                      <div className="kpi-label">Usuários Cadastrados</div>
                    </div>
                    <div className="kpi-glow"></div>
                  </div>
                  <div className="kpi-card kpi-cyan">
                    <div className="kpi-icon">🛒</div>
                    <div className="kpi-content">
                      <div className="kpi-value">{kpis.totalPurchases}</div>
                      <div className="kpi-label">Total de Compras</div>
                    </div>
                    <div className="kpi-glow"></div>
                  </div>
                  <div className="kpi-card kpi-purple">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-content">
                      <div className="kpi-value">R$ {kpis.totalRevenue.toFixed(2)}</div>
                      <div className="kpi-label">Receita Acumulada</div>
                    </div>
                    <div className="kpi-glow"></div>
                  </div>
                  <div className="kpi-card kpi-green">
                    <div className="kpi-icon">🎯</div>
                    <div className="kpi-content">
                      <div className="kpi-value">{kpis.conversionRate}%</div>
                      <div className="kpi-label">Taxa de Conversão</div>
                    </div>
                    <div className="kpi-glow"></div>
                  </div>
                </div>

                {/* Recent Purchases & Users columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
                  
                  {/* Recent Purchases */}
                  <div style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', marginBottom: '15px' }}>Últimas Vendas</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dbPurchases.slice(0, 5).map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <div style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold' }}>{p.user_name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{getCourseTitle(p.course_id)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>R$ {Number(p.price_paid).toFixed(2)}</div>
                            <div style={{ fontSize: '10px', color: p.status === 'approved' ? 'var(--accent-cyan)' : '#ef4444' }}>{p.status.toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                      {dbPurchases.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Nenhuma compra registrada.</p>}
                    </div>
                  </div>

                  {/* Recent Signups */}
                  <div style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', marginBottom: '15px' }}>Novos Estudantes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {dbUsers.slice(0, 5).map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          {u.avatar_url && !u.avatar_url.includes('unsplash.com') ? (
                            <img src={u.avatar_url} alt={u.name} style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: '35px',
                              height: '35px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: 'white',
                              flexShrink: 0
                            }}>
                              {(() => {
                                const name = u.name || 'Estudante';
                                const parts = name.split(' ');
                                if (parts.length >= 2) {
                                  return (parts[0][0] + parts[1][0]).toUpperCase();
                                }
                                return name.slice(0, 2).toUpperCase();
                              })()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold' }}>{u.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </div>
                      ))}
                      {dbUsers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Nenhum usuário registrado.</p>}
                    </div>
                  </div>

                </div>
              </section>
            )}

            {/* ========== SECTION: USERS ========== */}
            {activeSection === 'users' && (
              <section className="admin-section active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <div>
                    <h1 className="section-title" style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Usuários Cadastrados</h1>
                    <p className="section-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Lista de estudantes com perfil ativo no banco</p>
                  </div>
                </div>

                <div className="table-responsive" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '15px' }}>Estudante</th>
                        <th style={{ padding: '15px' }}>E-mail</th>
                        <th style={{ padding: '15px' }}>Nível / Regras</th>
                        <th style={{ padding: '15px' }}>Progresso Salvo</th>
                        <th style={{ padding: '15px' }}>Data Cadastro</th>
                        <th style={{ padding: '15px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {u.avatar_url && !u.avatar_url.includes('unsplash.com') ? (
                              <img src={u.avatar_url} alt={u.name} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: 'white',
                                flexShrink: 0
                              }}>
                                {(() => {
                                  const name = u.name || 'Estudante';
                                  const parts = name.split(' ');
                                  if (parts.length >= 2) {
                                    return (parts[0][0] + parts[1][0]).toUpperCase();
                                  }
                                  return name.slice(0, 2).toUpperCase();
                                })()}
                              </div>
                            )}
                            <span>{u.name}</span>
                          </td>
                          <td style={{ padding: '15px', color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td style={{ padding: '15px' }}>
                            <span className={`badge ${u.role === 'admin' ? 'badge-ia' : 'badge-closed'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '11px' }}>
                            {u.progress ? Object.keys(u.progress).map(courseId => {
                              const lessonsCount = Array.isArray(u.progress[courseId])
                                ? u.progress[courseId].length
                                : u.progress[courseId]?.completedLessons?.length || 0;
                              return (
                                <div key={courseId}>{courseId}: {lessonsCount} aulas</div>
                              );
                            }) : '—'}
                          </td>
                          <td style={{ padding: '15px', color: 'var(--text-muted)' }}>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td style={{ padding: '15px' }}>
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setShowCertificatesModal(true);
                              }}
                              className="btn btn-sm"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '5px', 
                                borderColor: '#d97706', 
                                color: '#f59e0b',
                                background: 'transparent',
                                border: '1px solid #d97706',
                                padding: '5px 10px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '11px'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>workspace_premium</span>
                              Certificados
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ========== SECTION: PURCHASES ========== */}
            {activeSection === 'purchases' && (
              <section className="admin-section active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h1 className="section-title" style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Registro de Compras</h1>
                    <p className="section-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Histórico real de transações e acessos</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <select 
                      value={purchaseFilter}
                      onChange={(e) => setPurchaseFilter(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                    >
                      <option value="all">Todas as Compras</option>
                      <option value="approved">Aprovadas</option>
                      <option value="pending">Pendentes</option>
                      <option value="cancelled">Canceladas</option>
                    </select>

                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddPurchaseModal(true)}>
                      + Registrar Venda
                    </button>
                  </div>
                </div>

                <div className="table-responsive" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '15px' }}>Estudante</th>
                        <th style={{ padding: '15px' }}>Produto</th>
                        <th style={{ padding: '15px' }}>ID Transação</th>
                        <th style={{ padding: '15px' }}>Valor</th>
                        <th style={{ padding: '15px' }}>Status</th>
                        <th style={{ padding: '15px' }}>Data</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '15px' }}>
                            <span style={{ fontWeight: 'bold', display: 'block' }}>{p.user_name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.user_email}</span>
                          </td>
                          <td style={{ padding: '15px' }}>{getCourseTitle(p.course_id)}</td>
                          <td style={{ padding: '15px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.payment_id || p.id.substr(0,8)}</td>
                          <td style={{ padding: '15px', fontWeight: 'bold' }}>R$ {Number(p.price_paid).toFixed(2)}</td>
                          <td style={{ padding: '15px' }}>
                            <span className={`badge ${p.status === 'approved' ? 'badge-ia' : p.status === 'pending' ? 'badge-systems' : 'badge-closed'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '15px', color: 'var(--text-muted)' }}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>
                            <button 
                              onClick={() => togglePurchaseStatus(p.id, p.status)} 
                              className={`btn btn-sm ${p.status === 'approved' ? 'btn-outline' : 'btn-primary'}`}
                              style={{ padding: '4px 10px', fontSize: '10px' }}
                            >
                              {p.status === 'approved' ? 'Cancelar' : 'Aprovar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredPurchases.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma transação encontrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ========== SECTION: PRODUCTS (COURSES CRUD) ========== */}
            {activeSection === 'products' && (
              <section className="admin-section active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h1 className="section-title" style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Produtos Cadastrados</h1>
                    <p className="section-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Gerenciamento dinâmico do catálogo de cursos da plataforma</p>
                  </div>
                  
                  <button className="btn btn-primary btn-sm" onClick={handleOpenAddCourse}>
                    + Novo Produto
                  </button>
                </div>

                <div className="table-responsive" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '15px' }}>Capa</th>
                        <th style={{ padding: '15px' }}>ID Curso</th>
                        <th style={{ padding: '15px' }}>Título</th>
                        <th style={{ padding: '15px' }}>Categoria</th>
                        <th style={{ padding: '15px' }}>Preço</th>
                        <th style={{ padding: '15px' }}>Vendas</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(course => {
                        const purchasesCount = dbPurchases.filter(p => p.course_id === course.id && p.status === 'approved').length;
                        return (
                          <tr key={course.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '15px' }}>
                              <img src={`/${course.banner}`} alt={course.title} style={{ width: '50px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'; }} />
                            </td>
                            <td style={{ padding: '15px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{course.id}</td>
                            <td style={{ padding: '15px', fontWeight: 'bold' }}>{course.title}</td>
                            <td style={{ padding: '15px' }}>
                              <span className={`badge ${course.badgeClass}`} style={{ fontSize: '10px' }}>
                                {course.badgeLabel}
                              </span>
                            </td>
                            <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                              {course.isClosed ? 'Sob Encomenda' : `R$ ${course.price.toFixed(2)}`}
                            </td>
                            <td style={{ padding: '15px', fontWeight: 'bold' }}>{purchasesCount} vendas</td>
                            <td style={{ padding: '15px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => handleOpenEditCourse(course)} 
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '10px' }}
                                >
                                  Editar
                                </button>
                                <button 
                                  onClick={() => handleDeleteCourse(course.id)} 
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {courses.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum produto cadastrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ========== SECTION: PORTFOLIO (PROJECTS CRUD) ========== */}
            {activeSection === 'portfolio' && (
              <section className="admin-section active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h1 className="section-title" style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Projetos do Portfólio</h1>
                    <p className="section-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Gerenciamento dinâmico dos cases de sucesso na página inicial</p>
                  </div>
                  
                  <button className="btn btn-primary btn-sm" onClick={handleOpenAddProject}>
                    + Novo Projeto
                  </button>
                </div>

                <div className="table-responsive" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '15px' }}>Capa</th>
                        <th style={{ padding: '15px' }}>ID</th>
                        <th style={{ padding: '15px' }}>Título</th>
                        <th style={{ padding: '15px' }}>Badge/Tech</th>
                        <th style={{ padding: '15px' }}>Tipo Mídia</th>
                        <th style={{ padding: '15px' }}>Métrica</th>
                        <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbProjects.map(proj => (
                        <tr key={proj.id || proj.dbId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '15px' }}>
                            <img src={getProjectCover(proj)} alt={proj.title} style={{ width: '50px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'; }} />
                          </td>
                          <td style={{ padding: '15px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{proj.id}</td>
                          <td style={{ padding: '15px', fontWeight: 'bold' }}>{proj.title}</td>
                          <td style={{ padding: '15px' }}>
                            <span className="badge" style={{ fontSize: '10px', background: 'rgba(0,245,212,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,245,212,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                              {proj.badge}
                            </span>
                          </td>
                          <td style={{ padding: '15px' }}>
                            {proj.isStatic ? '📷 Imagem' : '🎥 Vídeo'}
                          </td>
                          <td style={{ padding: '15px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span style={{ marginRight: '5px' }}>{proj.metricIcon}</span> {proj.metricLabel}
                          </td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleOpenEditProject(proj)} 
                                className="btn btn-sm btn-outline"
                                style={{ padding: '4px 10px', fontSize: '10px' }}
                              >
                                Editar
                              </button>
                              <button 
                                onClick={() => handleDeleteProject(proj.dbId)} 
                                className="btn btn-sm btn-outline"
                                style={{ padding: '4px 10px', fontSize: '10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {dbProjects.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum projeto cadastrado no portfólio.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

      </main>

      {/* MANUAL PURCHASE MODAL */}
      {showAddPurchaseModal && (
        <div className="video-modal video-modal--active" onClick={() => setShowAddPurchaseModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)' }}>
          <div className="video-modal__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%', background: '#0f172a', border: '1px solid var(--border-color)', padding: '25px', borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Registrar Nova Venda Manual</h3>
              <button onClick={() => setShowAddPurchaseModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleAddManualPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Select User */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Selecionar Estudante</label>
                <select 
                  required 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                >
                  <option value="">-- Selecione o Estudante --</option>
                  {dbUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Select Course */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Selecionar Curso / Produto</label>
                <select 
                  required 
                  value={selectedCourseId} 
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    const courseObj = courses.find(c => c.id === e.target.value);
                    setManualPrice(courseObj?.price || 0);
                  }}
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                >
                  <option value="">-- Selecione o Curso --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Manual Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Preço Pago (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={manualPrice}
                  onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddPurchaseModal(false)}>Cancelar</button>
                <button type="submit" disabled={addingPurchase} className="btn btn-primary">
                  {addingPurchase ? 'Registrando...' : 'Registrar Venda'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* COURSE ADD/EDIT MODAL */}
      {showCourseModal && (
        <div className="video-modal video-modal--active" onClick={() => setShowCourseModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)' }}>
          <div className="video-modal__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', background: '#0f172a', border: '1px solid var(--border-color)', padding: '25px', borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                {editingCourse ? 'Editar Produto / Curso' : 'Cadastrar Novo Produto'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID Único do Curso (ex: meu-novo-curso)</label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingCourse}
                    value={courseForm.id}
                    onChange={(e) => setCourseForm({ ...courseForm, id: e.target.value })}
                    placeholder="novo-curso-id"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Título do Curso</label>
                  <input 
                    type="text" 
                    required
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="Título do Treinamento"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Descrição Completa</label>
                <textarea 
                  rows="3"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Descreva o curso, ementa geral e objetivos..."
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Preço Promocional (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Preço Original (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={courseForm.original_price}
                    onChange={(e) => setCourseForm({ ...courseForm, original_price: parseFloat(e.target.value) || 0 })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Link de Pagamento (Mercado Pago ou WhatsApp para Consulta)</label>
                <input 
                  type="text" 
                  value={courseForm.payment_link}
                  onChange={(e) => setCourseForm({ ...courseForm, payment_link: e.target.value })}
                  placeholder="https://mpago.la/... ou https://wa.me/..."
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Categoria</label>
                  <select 
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="sistemas">Sistemas & SharePoint</option>
                    <option value="ia">IA & Prompts</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Imagem de Capa (Caminho ou URL)</label>
                  <input 
                    type="text" 
                    value={courseForm.banner}
                    onChange={(e) => setCourseForm({ ...courseForm, banner: e.target.value })}
                    placeholder="images/course.jpeg ou URL externa"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Duração / Ementa (ex: 23 Categorias)</label>
                  <input 
                    type="text" 
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    placeholder="23 Categorias / 12 horas"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Aulas / Volume (ex: +2.500 Prompts)</label>
                  <input 
                    type="text" 
                    value={courseForm.lessons_count}
                    onChange={(e) => setCourseForm({ ...courseForm, lessons_count: e.target.value })}
                    placeholder="30 aulas / +2.500 prompts"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Classe do Badge CSS</label>
                  <select 
                    value={courseForm.badge_class}
                    onChange={(e) => setCourseForm({ ...courseForm, badge_class: e.target.value })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="badge-systems">Sistemas & SharePoint (badge-systems)</option>
                    <option value="badge-ia">IA & Prompts (badge-ia)</option>
                    <option value="badge-closed">Matrículas Encerradas (badge-closed)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Texto do Badge</label>
                  <input 
                    type="text" 
                    value={courseForm.badge_label}
                    onChange={(e) => setCourseForm({ ...courseForm, badge_label: e.target.value })}
                    placeholder="Sistemas / IA & Prompts"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nível</label>
                  <input 
                    type="text" 
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                    placeholder="Sem Programação / Avançado"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                  <input 
                    type="checkbox" 
                    id="is_closed"
                    checked={courseForm.is_closed}
                    onChange={(e) => setCourseForm({ ...courseForm, is_closed: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_closed" style={{ fontSize: '13px', color: 'white', cursor: 'pointer' }}>
                    Sob Consulta / Matrículas Fechadas
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCourseModal(false)}>Cancelar</button>
                <button type="submit" disabled={savingCourse} className="btn btn-primary">
                  {savingCourse ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========== MODAL: PORTFOLIO PROJECT CRUD ========== */}
      {showProjectModal && (
        <div className="video-modal video-modal--active" onClick={() => setShowProjectModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)' }}>
          <div className="video-modal__content animate-fade-in-up" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '650px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '25px', borderRadius: '8px', overflowY: 'auto', maxHeight: '90vh' }}>
            <button className="video-modal__close" onClick={() => setShowProjectModal(false)} style={{ cursor: 'pointer' }}>&times;</button>
            <h2 style={{ fontSize: 'var(--font-xl)', color: 'white', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              {editingProject ? 'Editar Case de Portfólio' : 'Adicionar Novo Case de Portfólio'}
            </h2>
            <form onSubmit={handleSaveProject} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID Único do Projeto</label>
                  <input 
                    type="text" 
                    value={projectForm.id}
                    onChange={(e) => setProjectForm({ ...projectForm, id: e.target.value })}
                    placeholder="proj-novo"
                    disabled={!!editingProject}
                    required
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Título do Projeto</label>
                  <input 
                    type="text" 
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    placeholder="ex: Portal de Gestão Operacional"
                    required
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Categoria (Tipo)</label>
                  <select 
                    value={projectForm.type}
                    onChange={(e) => setProjectForm({ ...projectForm, type: e.target.value })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="sharepoint">SharePoint</option>
                    <option value="web">Sistemas Web</option>
                    <option value="powerapps">Power Apps</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Badge / Tecnologias (Texto)</label>
                  <input 
                    type="text" 
                    value={projectForm.badge}
                    onChange={(e) => setProjectForm({ ...projectForm, badge: e.target.value })}
                    placeholder="ex: SharePoint & HTML/JS"
                    required
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Descrição Completa</label>
                <textarea 
                  value={projectForm.desc}
                  onChange={(e) => setProjectForm({ ...projectForm, desc: e.target.value })}
                  placeholder="Descreva brevemente o projeto e os problemas resolvidos..."
                  required
                  rows="3"
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ícone da Métrica (Material Symbol)</label>
                  <select 
                    value={projectForm.metricIcon}
                    onChange={(e) => setProjectForm({ ...projectForm, metricIcon: e.target.value })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="speed">⚡ Velocidade (speed)</option>
                    <option value="trending_up">📈 Crescimento (trending_up)</option>
                    <option value="quiz">📝 Avaliação (quiz)</option>
                    <option value="home">🏠 Imobiliária (home)</option>
                    <option value="restaurant">🍕 Alimentação (restaurant)</option>
                    <option value="volunteer_activism">❤️ Saúde (volunteer_activism)</option>
                    <option value="directions_car">🚗 Carro (directions_car)</option>
                    <option value="mood">😊 Clima (mood)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Texto da Métrica (Resultado)</label>
                  <input 
                    type="text" 
                    value={projectForm.metricLabel}
                    onChange={(e) => setProjectForm({ ...projectForm, metricLabel: e.target.value })}
                    placeholder="ex: Redução de 80% do tempo"
                    required
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tipo de Mídia Principal</label>
                  <select 
                    value={projectForm.isStatic ? 'image' : 'video'}
                    onChange={(e) => setProjectForm({ ...projectForm, isStatic: e.target.value === 'image' })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="image">📷 Apenas Imagem Estática (Sem Vídeo)</option>
                    <option value="video">🎥 Vídeo Demonstrativo (YouTube, Vimeo, Panda)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Imagem de Capa (Caminho ou URL)</label>
                  <input 
                    type="text" 
                    value={projectForm.coverUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, coverUrl: e.target.value })}
                    placeholder="ex: /images/sharepoint.jpeg"
                    required={projectForm.isStatic}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {!projectForm.isStatic && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>URL do Vídeo (YouTube, Vimeo, Panda)</label>
                  <input 
                    type="text" 
                    value={projectForm.mediaUrl}
                    onChange={(e) => setProjectForm({ ...projectForm, mediaUrl: e.target.value })}
                    placeholder="ex: https://www.youtube.com/watch?v=..."
                    required={!projectForm.isStatic}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowProjectModal(false)}>Cancelar</button>
                <button type="submit" disabled={savingProject} className="btn btn-primary">
                  {savingProject ? 'Salvando...' : 'Salvar Case'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Certificados */}
      {showCertificatesModal && selectedUser && (
        <div 
          className="video-modal video-modal--active" 
          onClick={() => setShowCertificatesModal(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000, 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '650px', 
              width: '90%', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)',
              color: 'white',
              padding: '30px', 
              borderRadius: '12px', 
              position: 'relative'
            }}
          >
            <button 
              onClick={() => setShowCertificatesModal(false)} 
              style={{ 
                position: 'absolute',
                top: '15px',
                right: '20px',
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                fontSize: '28px', 
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              &times;
            </button>

            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', marginBottom: '8px' }}>
              Gerenciar Certificados
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '20px' }}>
              Estudante: <strong>{selectedUser.name}</strong> ({selectedUser.email})
            </p>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
              {courses.map(course => {
                const isPurchased = dbPurchases.some(p => p.user_id === selectedUser.id && p.course_id === course.id && p.status === 'approved');
                const isCompleted = selectedUser.completedCourses?.includes(course.id);
                
                // Calculate lessons progress
                const userProgressData = selectedUser.progress?.[course.id];
                const completedLessonsCount = Array.isArray(userProgressData) 
                  ? userProgressData.length 
                  : userProgressData?.completedLessons?.length || 0;
                
                const totalLessons = course.syllabus?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;
                const progressPercent = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

                return (
                  <div 
                    key={course.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '12px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      gap: '15px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold' }}>{course.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`badge ${isPurchased ? 'badge-ia' : 'badge-closed'}`} style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                          {isPurchased ? 'Matriculado' : 'Sem Inscrição'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Progresso: {progressPercent}% ({completedLessonsCount}/{totalLessons} aulas)
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={savingCertificates}
                      onClick={() => handleToggleCourseCompletion(selectedUser, course.id, !isCompleted)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        background: isCompleted ? '#ef4444' : '#10b981',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        flexShrink: 0,
                        fontWeight: 'bold'
                      }}
                    >
                      {isCompleted ? 'Remover Conclusão' : 'Liberar Certificado'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '25px' }}>
              <button 
                onClick={() => setShowCertificatesModal(false)} 
                className="btn btn-outline"
                style={{ fontSize: 'var(--font-sm)' }}
              >
                Concluir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminRoute>
      <AdminContent />
    </AdminRoute>
  );
}
