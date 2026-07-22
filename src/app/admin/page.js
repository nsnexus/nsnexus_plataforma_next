"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '../../utils/firebase/client';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore/lite';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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

function getUserCreationDate(u, purchases = []) {
  if (!u) return null;
  let rawDate = u.created_at || u.createdAt;
  if (!rawDate && purchases && purchases.length > 0) {
    const userPurchases = purchases.filter(p => p.user_id === u.id || (p.user_email && u.email && p.user_email.toLowerCase() === u.email.toLowerCase()));
    if (userPurchases.length > 0) {
      userPurchases.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      rawDate = userPurchases[0].created_at;
    }
  }
  if (!rawDate) return null;
  if (typeof rawDate === 'object' && rawDate.seconds) {
    return new Date(rawDate.seconds * 1000);
  }
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? null : d;
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
  const [qaQuestions, setQaQuestions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Q&A reply state
  const [adminReplyTextMap, setAdminReplyTextMap] = useState({});
  const [submittingAdminReplyId, setSubmittingAdminReplyId] = useState('');

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
    sequentialUnlock: false,
    syllabus: []
  });

  // ========== CONTENT MANAGEMENT STATE ==========
  const [contentCourseId, setContentCourseId] = useState('');
  const [contentSyllabus, setContentSyllabus] = useState([]);
  const [savingContent, setSavingContent] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLessonPath, setEditingLessonPath] = useState(null); // { modIndex, lesIndex } or null for new
  const [lessonForm, setLessonForm] = useState({
    id: '',
    title: '',
    duration: '',
    type: 'video',
    url: '',
    fileUrl: '',
    downloadUrl: '',
    downloadName: '',
    content: [],
    codeBlocks: [{ language: 'javascript', filename: '', code: '' }],
    articleBlocks: [],
    quizQuestions: [],
    description: ''
  });
  const [addToModuleIndex, setAddToModuleIndex] = useState(0);

  // Storage Upload state & handler
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');

  const handleFileUpload = (e, targetField) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);
    setUploadFileName(file.name);

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `lessons/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Erro no upload para o Storage:', error);
        alert(`Erro ao fazer upload do arquivo para o Firebase Storage: ${error.message || error.code || error}`);
        setUploadingFile(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('[DEBUG] Upload do arquivo concluído com sucesso!');
          console.log('[DEBUG] URL obtida do Firebase Storage:', downloadURL);

          if (targetField === 'downloadUrl') {
            setLessonForm(prev => {
              const updated = {
                ...prev,
                downloadUrl: downloadURL,
                downloadName: prev.downloadName || file.name
              };
              console.log('[DEBUG] Estado lessonForm atualizado com downloadUrl:', updated.downloadUrl);
              return updated;
            });
          } else if (targetField === 'fileUrl') {
            setLessonForm(prev => {
              const updated = { ...prev, fileUrl: downloadURL };
              console.log('[DEBUG] Estado lessonForm atualizado com fileUrl:', updated.fileUrl);
              return updated;
            });
          } else if (targetField === 'url') {
            setLessonForm(prev => {
              const updated = { ...prev, url: downloadURL };
              console.log('[DEBUG] Estado lessonForm atualizado com url:', updated.url);
              return updated;
            });
          }
        } catch (err) {
          console.error('[DEBUG] Erro ao buscar URL do arquivo:', err);
          alert('Erro ao obter a URL pública do arquivo enviado.');
        } finally {
          setUploadingFile(false);
        }
      }
    );
  };


  // Fetch all profiles and purchases from Firestore
  const loadData = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch purchases
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

      // 2. Fetch profiles (ordenados pelos mais recentes)
      const profilesRef = collection(db, 'profiles');
      const profilesSnap = await getDocs(profilesRef);
      const profiles = [];
      profilesSnap.forEach((doc) => {
        profiles.push(doc.data());
      });
      profiles.sort((a, b) => {
        const dateA = getUserCreationDate(a, purchases);
        const dateB = getUserCreationDate(b, purchases);
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
        if (dateA) return -1;
        if (dateB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setDbUsers(profiles);

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

      // 4. Fetch Q&A questions
      const qRef = collection(db, 'questions');
      const qSnap = await getDocs(qRef);
      const qList = [];
      qSnap.forEach(docSnap => {
        qList.push({ id: docSnap.id, ...docSnap.data() });
      });
      qList.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setQaQuestions(qList);

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

  const handleDeleteUser = async (targetUser) => {
    const identifier = targetUser.name || targetUser.email || targetUser.id;
    if (!window.confirm(`Deseja realmente EXCLUIR o usuário "${identifier}"?\nEsta ação é irreversível e removerá o perfil do banco de dados.`)) {
      return;
    }

    try {
      const userRef = doc(db, 'profiles', targetUser.id);
      await deleteDoc(userRef);

      setDbUsers(prev => prev.filter(u => u.id !== targetUser.id));
      alert(`Usuário "${identifier}" excluído com sucesso!`);
    } catch (err) {
      console.error('[Admin] Erro ao excluir usuário:', err);
      alert('Erro ao excluir usuário no Firestore: ' + (err.message || err));
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

  // Course popularity calculations
  const coursePopularity = useMemo(() => {
    const counts = {};
    courses.forEach(c => { counts[c.id] = { title: c.title, sales: 0, completions: 0 }; });
    
    dbPurchases.forEach(p => {
      if (p.status === 'approved' && counts[p.course_id]) {
        counts[p.course_id].sales += 1;
      }
    });

    dbUsers.forEach(u => {
      courses.forEach(c => {
        const total = c.syllabus?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
        const completed = u.progress?.[c.id]?.completedLessons?.length || 0;
        if (total > 0 && completed === total && counts[c.id]) {
          counts[c.id].completions += 1;
        }
      });
    });

    return Object.keys(counts).map(key => ({ id: key, ...counts[key] })).sort((a,b) => b.sales - a.sales);
  }, [courses, dbPurchases, dbUsers]);

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

  const handleDeletePurchase = async (purchaseId, userName, courseTitle) => {
    if (!window.confirm(`Deseja realmente EXCLUIR permanentemente o registro de compra do curso "${courseTitle}" para o usuário "${userName}"?`)) return;

    try {
      const purchaseRef = doc(db, 'purchases', purchaseId);
      await deleteDoc(purchaseRef);

      setDbPurchases(prev => prev.filter(p => p.id !== purchaseId));
      alert("Registro de compra excluído com sucesso!");
    } catch (err) {
      console.error('[Admin] Erro ao excluir compra:', err);
      alert("Erro ao excluir registro de compra: " + (err.message || err));
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
      sequentialUnlock: false,
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
      sequentialUnlock: course.sequentialUnlock || false,
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
          sequentialUnlock: courseForm.sequentialUnlock || false,
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
          sequentialUnlock: courseForm.sequentialUnlock || false,
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

  const handleAdminPostReply = async (questionId) => {
    const text = adminReplyTextMap[questionId];
    if (!text || !text.trim() || !user || submittingAdminReplyId) return;
    setSubmittingAdminReplyId(questionId);
    try {
      const parentQuestion = qaQuestions.find(q => q.id === questionId);
      if (!parentQuestion) return;

      const newReply = {
        replyId: Date.now().toString(),
        userId: user.id,
        userName: user.name || 'Admin',
        userAvatar: user.avatar_url || '',
        role: 'admin',
        content: text.trim(),
        createdAt: new Date().toISOString()
      };

      const updatedReplies = [...(parentQuestion.replies || []), newReply];

      const qDocRef = doc(db, 'questions', questionId);
      await updateDoc(qDocRef, { replies: updatedReplies });

      setQaQuestions(prev => prev.map(q => q.id === questionId ? { ...q, replies: updatedReplies } : q));
      setAdminReplyTextMap(prev => ({ ...prev, [questionId]: '' }));
      alert("Resposta enviada com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar resposta do admin:", err);
      alert("Erro ao enviar resposta.");
    } finally {
      setSubmittingAdminReplyId('');
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

  // ========== CONTENT MANAGEMENT HANDLERS ==========
  const handleSelectContentCourse = (cId) => {
    setContentCourseId(cId);
    if (cId) {
      const found = courses.find(c => c.id === cId);
      setContentSyllabus(found?.syllabus ? JSON.parse(JSON.stringify(found.syllabus)) : []);
    } else {
      setContentSyllabus([]);
    }
  };

  const handleAddModule = () => {
    const title = prompt('Título do novo módulo:');
    if (!title) return;
    setContentSyllabus(prev => [...prev, { moduleTitle: title, lessons: [] }]);
  };

  const handleEditModuleTitle = (modIndex) => {
    const current = contentSyllabus[modIndex].moduleTitle;
    const newTitle = prompt('Novo título do módulo:', current);
    if (!newTitle) return;
    setContentSyllabus(prev => {
      const updated = [...prev];
      updated[modIndex] = { ...updated[modIndex], moduleTitle: newTitle };
      return updated;
    });
  };

  const handleDeleteModule = (modIndex) => {
    if (!window.confirm('Excluir este módulo e todas as aulas dentro dele?')) return;
    setContentSyllabus(prev => prev.filter((_, i) => i !== modIndex));
  };

  const handleMoveModule = (modIndex, direction) => {
    const newIndex = modIndex + direction;
    if (newIndex < 0 || newIndex >= contentSyllabus.length) return;
    setContentSyllabus(prev => {
      const updated = [...prev];
      [updated[modIndex], updated[newIndex]] = [updated[newIndex], updated[modIndex]];
      return updated;
    });
  };

  const handleOpenAddLesson = (modIndex) => {
    setEditingLessonPath(null);
    setAddToModuleIndex(modIndex);
    const autoId = 'les-' + Date.now().toString(36);
    setLessonForm({
      id: autoId,
      title: '',
      duration: '',
      type: 'video',
      url: '',
      fileUrl: '',
      downloadUrl: '',
      downloadName: '',
      content: [],
      codeBlocks: [{ language: 'javascript', filename: '', code: '' }],
      articleBlocks: [],
      quizQuestions: [],
      description: ''
    });
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (modIndex, lesIndex) => {
    const les = contentSyllabus[modIndex].lessons[lesIndex];
    setEditingLessonPath({ modIndex, lesIndex });
    setAddToModuleIndex(modIndex);
    setLessonForm({
      id: les.id || '',
      title: les.title || '',
      duration: les.duration || '',
      type: les.type || 'video',
      url: les.url || '',
      fileUrl: les.fileUrl || '',
      downloadUrl: les.downloadUrl || '',
      downloadName: les.downloadName || '',
      content: les.content || [],
      codeBlocks: les.codeBlocks || [{ language: 'javascript', filename: '', code: '' }],
      articleBlocks: les.articleBlocks || [],
      quizQuestions: les.quizQuestions || [],
      description: les.description || ''
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = () => {
    if (!lessonForm.id || !lessonForm.title) {
      alert('ID e Título são obrigatórios.');
      return;
    }
    const lessonData = { ...lessonForm };
    
    console.log('[DEBUG] Dados originais no formulário antes de salvar a aula:', lessonForm);

    // Clean unused fields based on type
    if (lessonData.type !== 'video') { lessonData.url = lessonData.url || ''; }
    if (lessonData.type !== 'code') { delete lessonData.codeBlocks; }
    if (!lessonData.downloadUrl) { delete lessonData.downloadUrl; delete lessonData.downloadName; }
    if (lessonData.type !== 'pdf') { delete lessonData.fileUrl; }
    if (lessonData.type !== 'text' && !lessonData.content?.length) { delete lessonData.content; }
    if (lessonData.type !== 'article') { delete lessonData.articleBlocks; }
    if (lessonData.type !== 'quiz') { delete lessonData.quizQuestions; }
    if (!lessonData.description) { delete lessonData.description; }

    console.log('[DEBUG] Dados da aula limpos prontos para salvar no syllabus:', lessonData);

    setContentSyllabus(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (editingLessonPath) {
        updated[editingLessonPath.modIndex].lessons[editingLessonPath.lesIndex] = lessonData;
      } else {
        if (!updated[addToModuleIndex].lessons) updated[addToModuleIndex].lessons = [];
        updated[addToModuleIndex].lessons.push(lessonData);
      }
      console.log('[DEBUG] Lista contentSyllabus atualizada na memória:', updated);
      return updated;
    });
    setShowLessonModal(false);
  };

  const handleDeleteLesson = (modIndex, lesIndex) => {
    if (!window.confirm('Excluir esta aula?')) return;
    setContentSyllabus(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated[modIndex].lessons.splice(lesIndex, 1);
      return updated;
    });
  };

  const handleMoveLesson = (modIndex, lesIndex, direction) => {
    const newIndex = lesIndex + direction;
    const lessons = contentSyllabus[modIndex].lessons;
    if (newIndex < 0 || newIndex >= lessons.length) return;
    setContentSyllabus(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const arr = updated[modIndex].lessons;
      [arr[lesIndex], arr[newIndex]] = [arr[newIndex], arr[lesIndex]];
      return updated;
    });
  };

  const handleSaveContentToFirestore = async () => {
    if (!contentCourseId) {
      alert('Selecione um curso primeiro.');
      return;
    }
    setSavingContent(true);
    try {
      const courseRef = doc(db, 'courses', contentCourseId);
      await updateDoc(courseRef, { syllabus: contentSyllabus });
      alert('Conteúdo do curso salvo com sucesso no Firestore!');
      await reloadCourses();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar conteúdo: ' + err.message);
    } finally {
      setSavingContent(false);
    }
  };

  const getLessonTypeIcon = (type) => {
    switch (type) {
      case 'video': return '🎬';
      case 'code': return '💻';
      case 'download': return '📥';
      case 'text': return '📝';
      case 'pdf': return '📄';
      case 'audio': return '🎧';
      case 'quiz': return '📝';
      default: return '📎';
    }
  };

  const getLessonTypeBadge = (type) => {
    const colors = {
      video: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
      code: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
      download: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
      text: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
      pdf: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
      audio: { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
      quiz: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' }
    };
    return colors[type] || colors.video;
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
          <button 
            className={`nav-item ${activeSection === 'content' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('content'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📚</span>
            <span>Conteúdo</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('analytics'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">📈</span>
            <span>Analytics</span>
          </button>
          <button 
            className={`nav-item ${activeSection === 'qa' ? 'active' : ''}`} 
            onClick={() => { setActiveSection('qa'); setSidebarOpen(false); }}
          >
            <span className="nav-icon">💬</span>
            <span>Dúvidas Q&A</span>
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
                            {(() => {
                              const d = getUserCreationDate(u, dbPurchases);
                              return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                            })()}
                          </td>
                          <td style={{ padding: '15px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="btn btn-sm btn-outline"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  color: '#ef4444',
                                  borderColor: 'rgba(239,68,68,0.3)',
                                  background: 'rgba(239,68,68,0.08)',
                                  cursor: 'pointer',
                                  borderRadius: '4px'
                                }}
                                title="Excluir usuário permanente"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                                Excluir
                              </button>
                            </div>
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
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              <button 
                                onClick={() => togglePurchaseStatus(p.id, p.status)} 
                                className={`btn btn-sm ${p.status === 'approved' ? 'btn-outline' : 'btn-primary'}`}
                                style={{ padding: '4px 10px', fontSize: '10px' }}
                              >
                                {p.status === 'approved' ? 'Cancelar' : 'Aprovar'}
                              </button>
                              <button
                                onClick={() => handleDeletePurchase(p.id, p.user_name || p.user_email, getCourseTitle(p.course_id))}
                                className="btn btn-sm btn-outline"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  color: '#ef4444',
                                  borderColor: 'rgba(239,68,68,0.3)',
                                  background: 'rgba(239,68,68,0.08)',
                                  cursor: 'pointer'
                                }}
                                title="Excluir compra permanentemente"
                              >
                                Excluir
                              </button>
                            </div>
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

            {/* ========== SECTION: CONTENT MANAGEMENT ========== */}
            {activeSection === 'content' && (
              <section className="admin-section active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h1 className="section-title" style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Conteúdo dos Cursos</h1>
                    <p className="section-subtitle" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>Gerencie módulos, aulas, vídeos, códigos e downloads de cada curso</p>
                  </div>
                </div>

                {/* Course Selector */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginBottom: '25px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 300px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Selecionar Curso para Editar Conteúdo</label>
                    <select
                      value={contentCourseId}
                      onChange={(e) => handleSelectContentCourse(e.target.value)}
                      style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                    >
                      <option value="">-- Selecione um curso --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  {contentCourseId && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleAddModule}>
                        + Novo Módulo
                      </button>
                      <button
                        className="btn btn-sm"
                        disabled={savingContent}
                        onClick={handleSaveContentToFirestore}
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          border: 'none',
                          color: 'white',
                          padding: '8px 20px',
                          cursor: savingContent ? 'not-allowed' : 'pointer',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {savingContent ? '⏳ Salvando...' : '💾 Salvar no Firestore'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Modules & Lessons List */}
                {contentCourseId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {contentSyllabus.length === 0 && (
                      <div style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '40px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Nenhum módulo cadastrado. Clique em "+ Novo Módulo" para começar.</p>
                      </div>
                    )}

                    {contentSyllabus.map((mod, modIndex) => (
                      <div key={modIndex} style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        {/* Module Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px 20px',
                          background: 'rgba(0,0,0,0.3)',
                          borderBottom: '1px solid var(--border-color)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '12px', background: 'rgba(0,245,212,0.1)', padding: '2px 8px', borderRadius: '4px' }}>M{modIndex + 1}</span>
                            <span style={{ fontWeight: 'bold', fontSize: 'var(--font-md)' }}>{mod.moduleTitle}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({mod.lessons?.length || 0} aulas)</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleMoveModule(modIndex, -1)} title="Mover para cima" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} disabled={modIndex === 0}>↑</button>
                            <button onClick={() => handleMoveModule(modIndex, 1)} title="Mover para baixo" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }} disabled={modIndex === contentSyllabus.length - 1}>↓</button>
                            <button onClick={() => handleEditModuleTitle(modIndex)} style={{ background: 'transparent', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✏️ Renomear</button>
                            <button onClick={() => handleDeleteModule(modIndex)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🗑️ Excluir</button>
                          </div>
                        </div>

                        {/* Lessons List */}
                        <div style={{ padding: '10px 20px' }}>
                          {(!mod.lessons || mod.lessons.length === 0) && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '15px 0' }}>Nenhuma aula neste módulo.</p>
                          )}

                          {mod.lessons?.map((les, lesIndex) => {
                            const typeBadge = getLessonTypeBadge(les.type);
                            return (
                              <div key={les.id || lesIndex} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 0',
                                borderBottom: lesIndex < mod.lessons.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                gap: '10px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{getLessonTypeIcon(les.type)}</span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }} title={les.title}>{les.title}</span>
                                      <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '3px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px', background: typeBadge.bg, color: typeBadge.color, border: `1px solid ${typeBadge.border}` }}>{les.type}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '3px' }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {les.id}</span>
                                      {les.duration && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>⏱️ {les.duration}</span>}
                                      {les.url && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>🔗 URL configurada</span>}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                                  <button onClick={() => handleMoveLesson(modIndex, lesIndex, -1)} disabled={lesIndex === 0} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>↑</button>
                                  <button onClick={() => handleMoveLesson(modIndex, lesIndex, 1)} disabled={lesIndex === mod.lessons.length - 1} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'white', padding: '3px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}>↓</button>
                                  <button onClick={() => handleOpenEditLesson(modIndex, lesIndex)} style={{ background: 'transparent', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>Editar</button>
                                  <button onClick={() => handleDeleteLesson(modIndex, lesIndex)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>Excluir</button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Add Lesson Button */}
                          <div style={{ paddingTop: '10px' }}>
                            <button
                              onClick={() => handleOpenAddLesson(modIndex)}
                              style={{
                                background: 'transparent',
                                border: '1px dashed rgba(0,245,212,0.3)',
                                color: 'var(--accent-cyan)',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                width: '100%',
                                transition: 'all 0.2s'
                              }}
                            >
                              + Adicionar Aula neste Módulo
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ========== SECTION: ANALYTICS ========== */}
            {activeSection === 'analytics' && (
              <section className="admin-section active">
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: 'var(--font-xl)', marginBottom: '15px' }}>📈 Análise de Métricas (Analytics)</h2>
                
                {/* KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Receita Total Aprovada</span>
                    <h3 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold', margin: '5px 0 0 0', color: 'var(--accent-cyan)' }}>
                      R$ {kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Conversão de Leads</span>
                    <h3 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold', margin: '5px 0 0 0', color: '#10b981' }}>
                      {kpis.conversionRate}%
                    </h3>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Total de Alunos</span>
                    <h3 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold', margin: '5px 0 0 0', color: 'white' }}>
                      {dbUsers.length}
                    </h3>
                  </div>
                </div>

                {/* Popularity and completion table */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', overflowX: 'auto' }}>
                  <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', color: 'white', marginBottom: '15px' }}>Desempenho por Curso</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '10px' }}>Título do Curso</th>
                        <th style={{ padding: '10px' }}>Vendas Aprovadas</th>
                        <th style={{ padding: '10px' }}>Alunos que Concluíram</th>
                        <th style={{ padding: '10px' }}>Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursePopularity.map(cp => {
                        const totalUsers = dbUsers.length;
                        const courseConversion = totalUsers > 0 ? Math.round((cp.sales / totalUsers) * 100) : 0;
                        return (
                          <tr key={cp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: 'white' }}>
                            <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{cp.title}</td>
                            <td style={{ padding: '12px 10px' }}>{cp.sales}</td>
                            <td style={{ padding: '12px 10px', color: '#f59e0b' }}>{cp.completions}</td>
                            <td style={{ padding: '12px 10px', color: '#10b981' }}>{courseConversion}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ========== SECTION: QA MODERATION ========== */}
            {activeSection === 'qa' && (
              <section className="admin-section active">
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: 'var(--font-xl)', marginBottom: '15px' }}>💬 Moderação de Dúvidas (Q&A)</h2>
                
                {qaQuestions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma dúvida registrada pelos alunos até o momento.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {qaQuestions.map(q => {
                      const courseObj = courses.find(c => c.id === q.courseId);
                      let lessonTitle = q.lessonId;
                      if (courseObj?.syllabus) {
                        courseObj.syllabus.forEach(mod => {
                          const les = mod.lessons?.find(l => l.id === q.lessonId);
                          if (les) lessonTitle = les.title;
                        });
                      }
                      
                      return (
                        <div key={q.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <span style={{ fontSize: '11px', background: 'rgba(56,189,248,0.1)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '3px' }}>
                                Curso: {courseObj?.title || q.courseId}
                              </span>
                              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'white', padding: '2px 6px', borderRadius: '3px', marginLeft: '8px' }}>
                                Aula: {lessonTitle}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(q.createdAt).toLocaleString('pt-BR')}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            {q.userAvatar ? (
                              <img src={q.userAvatar} alt={q.userName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                {q.userName?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <strong style={{ fontSize: '13px', color: 'white' }}>{q.userName}</strong>
                          </div>

                          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', margin: '0 0 15px 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {q.content}
                          </p>

                          {/* Replies list */}
                          {q.replies && q.replies.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '15px', borderLeft: '2px solid rgba(255,255,255,0.05)', paddingLeft: '12px', marginBottom: '15px' }}>
                              {q.replies.map(reply => (
                                <div key={reply.replyId} style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <strong style={{ fontSize: '12px', color: 'white' }}>
                                      {reply.userName} 
                                      {reply.role === 'admin' && <span style={{ marginLeft: '5px', fontSize: '9px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)', padding: '1px 3px', borderRadius: '3px' }}>ADMIN</span>}
                                    </strong>
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '5px' }}>{new Date(reply.createdAt).toLocaleString('pt-BR')}</span>
                                  </div>
                                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply Box */}
                          <div style={{ display: 'flex', gap: '10px', marginLeft: '15px' }}>
                            <input
                              type="text"
                              placeholder="Escrever resposta oficial..."
                              value={adminReplyTextMap[q.id] || ''}
                              onChange={(e) => setAdminReplyTextMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                              style={{ flexGrow: 1, padding: '8px 12px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', fontSize: '13px' }}
                            />
                            <button
                              onClick={() => handleAdminPostReply(q.id)}
                              disabled={submittingAdminReplyId === q.id || !(adminReplyTextMap[q.id] || '').trim()}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              {submittingAdminReplyId === q.id ? '...' : 'Responder'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                  <input 
                    type="checkbox" 
                    id="sequentialUnlock"
                    checked={courseForm.sequentialUnlock}
                    onChange={(e) => setCourseForm({ ...courseForm, sequentialUnlock: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="sequentialUnlock" style={{ fontSize: '13px', color: 'white', cursor: 'pointer' }}>
                    Desbloqueio Sequencial (Linear)
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

      {/* ========== MODAL: LESSON ADD/EDIT ========== */}
      {showLessonModal && (
        <div className="video-modal video-modal--active" onClick={() => setShowLessonModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)' }}>
          <div className="video-modal__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%', background: '#0f172a', border: '1px solid var(--border-color)', padding: '25px', borderRadius: '10px', maxHeight: '95vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                {editingLessonPath ? '✏️ Editar Aula' : '➕ Nova Aula'}
              </h3>
              <button onClick={() => setShowLessonModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Row: ID + Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ID Único</label>
                  <input
                    type="text"
                    value={lessonForm.id}
                    onChange={(e) => setLessonForm({ ...lessonForm, id: e.target.value })}
                    disabled={!!editingLessonPath}
                    placeholder="les-abc123"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Título da Aula</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="Introdução ao React.js"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {/* Row: Type + Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tipo de Conteúdo</label>
                  <select
                    value={lessonForm.type}
                    onChange={(e) => setLessonForm({ ...lessonForm, type: e.target.value })}
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  >
                    <option value="video">🎬 Vídeo (YouTube / Vimeo / Panda)</option>
                    <option value="article">📑 Artigo / Tutorial (Blocos mistos)</option>
                    <option value="quiz">📝 Quiz / Avaliação de Módulo</option>
                    <option value="code">💻 Código (Blocos de código)</option>
                    <option value="download">📥 Arquivo para Download</option>
                    <option value="text">📝 Texto / Leitura</option>
                    <option value="pdf">📄 PDF Embutido</option>
                    <option value="audio">🎧 Áudio / Audiobook</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Duração / Info</label>
                  <input
                    type="text"
                    value={lessonForm.duration}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                    placeholder="25 min / 3 arquivos / etc."
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                </div>
              </div>

              {/* Conditional Fields by Type */}
              {/* VIDEO */}
              {lessonForm.type === 'video' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 'bold' }}>🎬 URL do Vídeo (YouTube não-listado, Vimeo, Panda)</label>
                  <input
                    type="text"
                    value={lessonForm.url}
                    onChange={(e) => setLessonForm({ ...lessonForm, url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '5px 0 0' }}>⚠️ O link real nunca será exibido ao aluno. O player usa um proxy server-side para proteger a URL.</p>
                </div>
              )}

              {/* AUDIO */}
              {lessonForm.type === 'audio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#f472b6', fontWeight: 'bold' }}>🎧 URL do Áudio (MP3, WAV, etc.)</label>
                  <input
                    type="text"
                    value={lessonForm.url}
                    onChange={(e) => setLessonForm({ ...lessonForm, url: e.target.value })}
                    placeholder="https://storage.googleapis.com/.../audio.mp3"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(236,72,153,0.3)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {uploadingFile ? `Enviando ${uploadFileName}... (${uploadProgress}%)` : '☁️ Fazer upload direto para o Firebase Storage'}
                      </span>
                      <label className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 10px', cursor: uploadingFile ? 'not-allowed' : 'pointer', margin: 0 }}>
                        {uploadingFile ? `${uploadProgress}%` : 'Selecionar Áudio'}
                        <input
                          type="file"
                          accept="audio/*"
                          disabled={uploadingFile}
                          onChange={(e) => handleFileUpload(e, 'url')}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    {uploadingFile && (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, background: '#f472b6', height: '100%', transition: 'width 0.2s' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PDF */}
              {lessonForm.type === 'pdf' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#f87171', fontWeight: 'bold' }}>📄 URL do PDF para Visualização Embutida</label>
                  <input
                    type="text"
                    value={lessonForm.fileUrl}
                    onChange={(e) => setLessonForm({ ...lessonForm, fileUrl: e.target.value })}
                    placeholder="https://firebasestorage.googleapis.com/.../file.pdf"
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                  />
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(239,68,68,0.3)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {uploadingFile ? `Enviando ${uploadFileName}... (${uploadProgress}%)` : '☁️ Fazer upload direto para o Firebase Storage'}
                      </span>
                      <label className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 10px', cursor: uploadingFile ? 'not-allowed' : 'pointer', margin: 0 }}>
                        {uploadingFile ? `${uploadProgress}%` : 'Selecionar PDF'}
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          disabled={uploadingFile}
                          onChange={(e) => handleFileUpload(e, 'fileUrl')}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    {uploadingFile && (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, background: '#f87171', height: '100%', transition: 'width 0.2s' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DOWNLOAD */}
              {lessonForm.type === 'download' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' }}>📥 Arquivo para Download</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <input
                      type="text"
                      value={lessonForm.downloadUrl}
                      onChange={(e) => setLessonForm({ ...lessonForm, downloadUrl: e.target.value })}
                      placeholder="URL do arquivo (Firebase Storage, etc.)"
                      style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={lessonForm.downloadName}
                      onChange={(e) => setLessonForm({ ...lessonForm, downloadName: e.target.value })}
                      placeholder="projeto-starter.zip"
                      style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {uploadingFile ? `Enviando ${uploadFileName}... (${uploadProgress}%)` : '☁️ Fazer upload direto para o Firebase Storage'}
                      </span>
                      <label className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 10px', cursor: uploadingFile ? 'not-allowed' : 'pointer', margin: 0 }}>
                        {uploadingFile ? `${uploadProgress}%` : 'Selecionar Arquivo'}
                        <input
                          type="file"
                          disabled={uploadingFile}
                          onChange={(e) => handleFileUpload(e, 'downloadUrl')}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    {uploadingFile && (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, background: '#fbbf24', height: '100%', transition: 'width 0.2s' }} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>Nome do arquivo é o que o aluno verá no botão de download.</p>
                </div>
              )}

              {/* TEXT */}
              {lessonForm.type === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 'bold' }}>📝 Conteúdo de Texto (um parágrafo por linha)</label>
                  <textarea
                    rows="6"
                    value={(lessonForm.content || []).join('\n')}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value.split('\n').filter(l => l.trim()) })}
                    placeholder="Cada linha será exibida como um parágrafo separado no leitor...\nLinha 2 aqui...\nLinha 3..."
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
              )}

              {/* CODE */}
              {lessonForm.type === 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', color: '#34d399', fontWeight: 'bold' }}>💻 Blocos de Código</label>
                    <button
                      type="button"
                      onClick={() => setLessonForm({ ...lessonForm, codeBlocks: [...(lessonForm.codeBlocks || []), { language: 'javascript', filename: '', code: '' }] })}
                      style={{ background: 'transparent', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      + Bloco
                    </button>
                  </div>

                  {(lessonForm.codeBlocks || []).map((block, bIdx) => (
                    <div key={bIdx} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                        <select
                          value={block.language}
                          onChange={(e) => {
                            const updated = [...lessonForm.codeBlocks];
                            updated[bIdx] = { ...updated[bIdx], language: e.target.value };
                            setLessonForm({ ...lessonForm, codeBlocks: updated });
                          }}
                          style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '11px' }}
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="python">Python</option>
                          <option value="json">JSON</option>
                          <option value="sql">SQL</option>
                          <option value="bash">Bash / Shell</option>
                          <option value="typescript">TypeScript</option>
                          <option value="jsx">JSX / React</option>
                          <option value="csharp">C#</option>
                          <option value="xml">XML</option>
                          <option value="powershell">PowerShell</option>
                        </select>
                        <input
                          type="text"
                          value={block.filename}
                          onChange={(e) => {
                            const updated = [...lessonForm.codeBlocks];
                            updated[bIdx] = { ...updated[bIdx], filename: e.target.value };
                            setLessonForm({ ...lessonForm, codeBlocks: updated });
                          }}
                          placeholder="Nome do arquivo (ex: app.js)"
                          style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', flex: 1, fontSize: '11px' }}
                        />
                        {lessonForm.codeBlocks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = lessonForm.codeBlocks.filter((_, i) => i !== bIdx);
                              setLessonForm({ ...lessonForm, codeBlocks: updated });
                            }}
                            style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <textarea
                        rows="8"
                        value={block.code}
                        onChange={(e) => {
                          const updated = [...lessonForm.codeBlocks];
                          updated[bIdx] = { ...updated[bIdx], code: e.target.value };
                          setLessonForm({ ...lessonForm, codeBlocks: updated });
                        }}
                        placeholder="// Cole ou escreva o código aqui..."
                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', color: '#a5f3fc', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* ARTICLE */}
              {lessonForm.type === 'article' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}>📑 Construtor de Artigo / Tutorial</label>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setLessonForm({ ...lessonForm, articleBlocks: [...(lessonForm.articleBlocks || []), { type: 'heading', content: '' }] })} style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Título</button>
                      <button type="button" onClick={() => setLessonForm({ ...lessonForm, articleBlocks: [...(lessonForm.articleBlocks || []), { type: 'text', content: '' }] })} style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Texto</button>
                      <button type="button" onClick={() => setLessonForm({ ...lessonForm, articleBlocks: [...(lessonForm.articleBlocks || []), { type: 'code', language: 'javascript', content: '' }] })} style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Código</button>
                      <button type="button" onClick={() => setLessonForm({ ...lessonForm, articleBlocks: [...(lessonForm.articleBlocks || []), { type: 'image', url: '', caption: '' }] })} style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Imagem</button>
                      <button type="button" onClick={() => setLessonForm({ ...lessonForm, articleBlocks: [...(lessonForm.articleBlocks || []), { type: 'callout', content: '', variant: 'info' }] })} style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Alerta</button>
                      <button type="button" onClick={() => setLessonForm({ ...lessonForm, articleBlocks: [...(lessonForm.articleBlocks || []), { type: 'divider' }] })} style={{ background: 'transparent', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>+ Separador</button>
                    </div>
                  </div>

                  {(!lessonForm.articleBlocks || lessonForm.articleBlocks.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed rgba(56,189,248,0.2)', borderRadius: '6px' }}>
                      Nenhum bloco adicionado. Comece adicionando um título ou texto.
                    </div>
                  )}

                  {(lessonForm.articleBlocks || []).map((block, bIdx) => (
                    <div key={bIdx} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Bloco {bIdx + 1}: {block.type}
                        </span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {bIdx > 0 && (
                            <button type="button" onClick={() => {
                              const updated = [...lessonForm.articleBlocks];
                              [updated[bIdx], updated[bIdx - 1]] = [updated[bIdx - 1], updated[bIdx]];
                              setLessonForm({ ...lessonForm, articleBlocks: updated });
                            }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>↑</button>
                          )}
                          {bIdx < lessonForm.articleBlocks.length - 1 && (
                            <button type="button" onClick={() => {
                              const updated = [...lessonForm.articleBlocks];
                              [updated[bIdx], updated[bIdx + 1]] = [updated[bIdx + 1], updated[bIdx]];
                              setLessonForm({ ...lessonForm, articleBlocks: updated });
                            }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>↓</button>
                          )}
                          <button type="button" onClick={() => {
                            const updated = lessonForm.articleBlocks.filter((_, i) => i !== bIdx);
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                        </div>
                      </div>

                      {/* Render block fields based on type */}
                      {block.type === 'heading' && (
                        <input type="text" value={block.content || ''} onChange={(e) => {
                          const updated = [...lessonForm.articleBlocks];
                          updated[bIdx] = { ...updated[bIdx], content: e.target.value };
                          setLessonForm({ ...lessonForm, articleBlocks: updated });
                        }} placeholder="Subtítulo..." style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }} />
                      )}

                      {block.type === 'text' && (
                        <textarea rows="4" value={block.content || ''} onChange={(e) => {
                          const updated = [...lessonForm.articleBlocks];
                          updated[bIdx] = { ...updated[bIdx], content: e.target.value };
                          setLessonForm({ ...lessonForm, articleBlocks: updated });
                        }} placeholder="Texto livre..." style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '12px', resize: 'vertical' }} />
                      )}

                      {block.type === 'code' && (
                        <>
                          <select value={block.language || 'javascript'} onChange={(e) => {
                            const updated = [...lessonForm.articleBlocks];
                            updated[bIdx] = { ...updated[bIdx], language: e.target.value };
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} style={{ padding: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '11px', width: 'fit-content' }}>
                            <option value="javascript">JavaScript</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="python">Python</option>
                            <option value="bash">Bash / Shell</option>
                            <option value="json">JSON</option>
                          </select>
                          <textarea rows="5" value={block.content || ''} onChange={(e) => {
                            const updated = [...lessonForm.articleBlocks];
                            updated[bIdx] = { ...updated[bIdx], content: e.target.value };
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} placeholder="// Código..." style={{ padding: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-color)', color: '#a5f3fc', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }} />
                        </>
                      )}

                      {block.type === 'image' && (
                        <>
                          <input type="text" value={block.url || ''} onChange={(e) => {
                            const updated = [...lessonForm.articleBlocks];
                            updated[bIdx] = { ...updated[bIdx], url: e.target.value };
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} placeholder="URL da imagem (ex: https://.../img.jpg)" style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '12px' }} />
                          <input type="text" value={block.caption || ''} onChange={(e) => {
                            const updated = [...lessonForm.articleBlocks];
                            updated[bIdx] = { ...updated[bIdx], caption: e.target.value };
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} placeholder="Legenda da imagem (opcional)" style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '11px' }} />
                        </>
                      )}

                      {block.type === 'callout' && (
                        <>
                          <select value={block.variant || 'info'} onChange={(e) => {
                            const updated = [...lessonForm.articleBlocks];
                            updated[bIdx] = { ...updated[bIdx], variant: e.target.value };
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} style={{ padding: '6px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '11px', width: 'fit-content' }}>
                            <option value="info">💡 Informação</option>
                            <option value="warning">⚠️ Aviso</option>
                            <option value="success">✅ Sucesso</option>
                            <option value="danger">🚨 Perigo</option>
                          </select>
                          <textarea rows="3" value={block.content || ''} onChange={(e) => {
                            const updated = [...lessonForm.articleBlocks];
                            updated[bIdx] = { ...updated[bIdx], content: e.target.value };
                            setLessonForm({ ...lessonForm, articleBlocks: updated });
                          }} placeholder="Texto do alerta..." style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '12px', resize: 'vertical' }} />
                        </>
                      )}

                      {block.type === 'divider' && (
                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '5px 0' }} />
                      )}

                    </div>
                  ))}
                </div>
              )}

              {/* QUIZ */}
              {lessonForm.type === 'quiz' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '8px', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 'bold' }}>📝 Editor de Perguntas do Quiz</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = {
                          id: Date.now().toString(),
                          question: '',
                          options: ['', '', '', ''],
                          correctAnswerIndex: 0
                        };
                        setLessonForm({ ...lessonForm, quizQuestions: [...(lessonForm.quizQuestions || []), newQ] });
                      }}
                      className="btn btn-sm btn-outline"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', cursor: 'pointer' }}
                    >
                      + Pergunta
                    </button>
                  </div>

                  {(!lessonForm.quizQuestions || lessonForm.quizQuestions.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed rgba(167,139,250,0.2)', borderRadius: '6px' }}>
                      Nenhuma pergunta cadastrada. Adicione pelo menos uma pergunta para salvar o quiz.
                    </div>
                  )}

                  {(lessonForm.quizQuestions || []).map((q, qIdx) => (
                    <div key={q.id || qIdx} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Questão {qIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = lessonForm.quizQuestions.filter((_, i) => i !== qIdx);
                            setLessonForm({ ...lessonForm, quizQuestions: updated });
                          }}
                          style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }}
                        >
                          ✕
                        </button>
                      </div>

                      <input
                        type="text"
                        value={q.question || ''}
                        onChange={(e) => {
                          const updated = [...lessonForm.quizQuestions];
                          updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                          setLessonForm({ ...lessonForm, quizQuestions: updated });
                        }}
                        placeholder="Escreva a pergunta aqui..."
                        style={{ padding: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '13px' }}
                      />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alternativas (marque a estrela na resposta correta):</span>
                        {q.options?.map((opt, oIdx) => (
                          <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...lessonForm.quizQuestions];
                                updated[qIdx] = { ...updated[qIdx], correctAnswerIndex: oIdx };
                                setLessonForm({ ...lessonForm, quizQuestions: updated });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: q.correctAnswerIndex === oIdx ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Marcar como correta"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: q.correctAnswerIndex === oIdx ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                            </button>
                            <input
                              type="text"
                              value={opt || ''}
                              onChange={(e) => {
                                const updatedOpts = [...q.options];
                                updatedOpts[oIdx] = e.target.value;
                                const updated = [...lessonForm.quizQuestions];
                                updated[qIdx] = { ...updated[qIdx], options: updatedOpts };
                                setLessonForm({ ...lessonForm, quizQuestions: updated });
                              }}
                              placeholder={`Alternativa ${oIdx + 1}...`}
                              style={{ flexGrow: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontSize: '12px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DOWNLOAD OPCIONAL PARA OUTROS TIPOS DE AULA */}
              {lessonForm.type !== 'download' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(245,158,11,0.02)', border: '1px dashed rgba(245,158,11,0.2)', borderRadius: '8px', padding: '15px' }}>
                  <label style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' }}>📥 Arquivo de Download Opcional (Recursos da Aula)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <input
                      type="text"
                      value={lessonForm.downloadUrl || ''}
                      onChange={(e) => setLessonForm({ ...lessonForm, downloadUrl: e.target.value })}
                      placeholder="URL do arquivo (Firebase Storage, etc.)"
                      style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={lessonForm.downloadName || ''}
                      onChange={(e) => setLessonForm({ ...lessonForm, downloadName: e.target.value })}
                      placeholder="projeto-starter.zip"
                      style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px' }}
                    />
                  </div>
                  {lessonForm.downloadUrl && (
                    <p style={{ fontSize: '11px', color: '#10b981', margin: '2px 0 0 0', fontWeight: 'bold' }}>
                      ✓ Link de download detectado! Pronto para salvar.
                    </p>
                  )}
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(245,158,11,0.2)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {uploadingFile ? `Enviando ${uploadFileName}... (${uploadProgress}%)` : '☁️ Fazer upload direto para o Firebase Storage'}
                      </span>
                      <label className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 10px', cursor: uploadingFile ? 'not-allowed' : 'pointer', margin: 0 }}>
                        {uploadingFile ? `${uploadProgress}%` : 'Selecionar Arquivo'}
                        <input
                          type="file"
                          disabled={uploadingFile}
                          onChange={(e) => handleFileUpload(e, 'downloadUrl')}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    {uploadingFile && (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, background: '#fbbf24', height: '100%', transition: 'width 0.2s' }} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>Deixe em branco se esta aula não contiver nenhum arquivo para download.</p>
                </div>
              )}

              {/* Description (optional, for all types) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📋 Descrição / Notas da Aula (opcional, exibida abaixo do player)</label>
                <textarea
                  rows="3"
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  placeholder="Notas, links de referência, explicações extras..."
                  style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '4px', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowLessonModal(false)}>Cancelar</button>
                <button
                  type="button"
                  onClick={handleSaveLesson}
                  className="btn btn-primary"
                  style={{ fontWeight: 'bold' }}
                >
                  {editingLessonPath ? 'Atualizar Aula' : 'Adicionar Aula'}
                </button>
              </div>
            </div>
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
