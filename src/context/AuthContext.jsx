"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../utils/firebase/client';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore/lite';
import { COURSES_DATA } from '../data/platformData';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState(COURSES_DATA);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Load courses from Firestore with fallback to static platform data
  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, orderBy('id'));
      const querySnapshot = await getDocs(q);
      
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      });

      if (data && data.length > 0) {
        // Run database sync for course changes in background
        try {
          const hasOldPromptLib = data.some(c => c.id === 'biblioteca-prompts-ia');
          if (hasOldPromptLib) {
            deleteDoc(doc(db, 'courses', 'biblioteca-prompts-ia')).catch(err => 
              console.error("Error deleting old prompts course doc:", err)
            );
          }
          const systemsCourse = data.find(c => c.id === 'sistemas-sharepoint-moderno');
          if (systemsCourse && (systemsCourse.price !== 250 || systemsCourse.originalPrice !== 599 || systemsCourse.badgeClass !== 'badge-featured')) {
            updateDoc(doc(db, 'courses', 'sistemas-sharepoint-moderno'), {
              price: 250.00,
              originalPrice: 599.00,
              badgeClass: 'badge-featured',
              badgeLabel: '⭐ CARRO CHEFE - MAIS VENDIDO'
            }).catch(err => 
              console.error("Error updating systems course price doc:", err)
            );
          }
        } catch (syncErr) {
          console.error("Error syncing Firestore course data:", syncErr);
        }

        // Filter out prompts course and update pricing locally
        const cleanedData = data
          .filter(c => c.id !== 'biblioteca-prompts-ia')
          .map(c => {
            if (c.id === 'sistemas-sharepoint-moderno') {
              return {
                ...c,
                price: 250.00,
                originalPrice: 599.00,
                badgeClass: 'badge-featured',
                badgeLabel: '⭐ CARRO CHEFE - MAIS VENDIDO'
              };
            }
            return c;
          });

        // Firebase documents use our standard camelCase format
        const mapped = cleanedData.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          banner: c.banner,
          level: c.level,
          duration: c.duration,
          lessonsCount: c.lessonsCount,
          rating: c.rating,
          reviewsCount: c.reviewsCount,
          badgeLabel: c.badgeLabel,
          badgeClass: c.badgeClass,
          paymentLink: c.paymentLink,
          originalPrice: c.originalPrice,
          price: c.price,
          isClosed: c.isClosed,
          syllabus: c.syllabus || []
        }));
        setCourses(mapped);
      } else {
        // If Firestore courses collection is empty, auto-populate it
        console.log("Firestore courses collection is empty. Populating with initial platform data...");
        for (const course of COURSES_DATA) {
          await setDoc(doc(db, 'courses', course.id), course);
        }
        setCourses(COURSES_DATA);
      }
    } catch (err) {
      console.warn("Error loading courses from Firestore (using static fallback):", err.message || err);
      setCourses(COURSES_DATA);
    } finally {
      setLoadingCourses(false);
    }
  };

  // Load profile and purchases for a given user ID
  const fetchUserProfile = async (userId, userEmail) => {
    try {
      // 1. Fetch profile from Firestore profiles collection
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);
      const profile = profileSnap.exists() ? profileSnap.data() : null;

      if (!profile) {
        console.log("Profile not found in database. Creating default profile in Firestore...");
        const fallbackName = userEmail ? userEmail.split('@')[0] : 'Estudante';
        const defaultAvatar = "";
        
        const newProfile = {
          id: userId,
          email: userEmail,
          name: fallbackName,
          avatar_url: defaultAvatar,
          role: userEmail === 'narcisofelizardo@gmail.com' ? 'admin' : 'student',
          progress: {},
          bookmarks: {},
          achievements: []
        };

        await setDoc(profileRef, newProfile);
        return {
          ...newProfile,
          enrolledCourses: []
        };
      }

      // 2. Fetch approved purchases for enrolledCourses from Firestore
      const purchasesRef = collection(db, 'purchases');
      const pq = query(purchasesRef, where('user_id', '==', userId), where('status', '==', 'approved'));
      const purchasesSnapshot = await getDocs(pq);
      
      const enrolledCourses = [];
      purchasesSnapshot.forEach((doc) => {
        enrolledCourses.push(doc.data().course_id);
      });

      // Bonus logic for prompt library removed as it was deprecated

      // Auto-unlock E-book and Audiobook homologation code removed to prevent unauthorized access in production.

      const defaultAvatar = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=100&auto=format&fit=crop";

      return {
        id: userId,
        email: userEmail,
        name: profile.name || 'Sem nome',
        avatar_url: profile.avatar_url || defaultAvatar,
        role: profile.role || 'student',
        progress: profile.progress || {},
        enrolledCourses: enrolledCourses,
        completedCourses: profile.completedCourses || [],
        bookmarks: profile.bookmarks || {},
        achievements: profile.achievements || []
      };
    } catch (error) {
      console.error("Error loading user profile:", error);
      return null;
    }
  };

  // Sync auth state on mount
  useEffect(() => {
    loadCourses();

    let active = true;

    // Handle redirect result when returning from Google sign-in on mobile
    getRedirectResult(auth).then((result) => {
      if (result && result.user) {
        alert("DEBUG: Login Google OK! Email: " + result.user.email);
      } else {
        // result is null — no redirect happened on this page load
      }
    }).catch((error) => {
      alert("DEBUG: Erro no redirect result: " + error.code + " - " + error.message);
      console.error("Redirect result error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      
      if (firebaseUser) {
        setLoading(true);
        const profileData = await fetchUserProfile(firebaseUser.uid, firebaseUser.email);
        setUser(profileData);
        setLoading(false);
      } else {
        const isLocalhost = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        if (isLocalhost) {
          const mockUser = {
            id: "mock-dev-id",
            email: "dev@nsnexus.com.br",
            name: "Desenvolvedor Teste",
            avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
            role: "admin",
            progress: {},
            enrolledCourses: ["ebook-ia-negocios", "audiobook-ia-negocios", "sistemas-sharepoint-moderno", "landing-page-whatsapp"],
            completedCourses: [],
            bookmarks: {},
            achievements: []
          };
          setUser(mockUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Sign In function
  const signIn = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  // Sign In with Google OAuth
  // Desktop: popup (fast, seamless)
  // Mobile: redirect (avoids popup-blocking issues on mobile browsers)
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    } else {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    }
  };

  // Sign Up function
  const signUp = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    const defaultAvatar = "";
    const newProfile = {
      id: userId,
      email: email,
      name: name,
      avatar_url: defaultAvatar,
      role: email === 'narcisofelizardo@gmail.com' ? 'admin' : 'student',
      progress: {},
      bookmarks: {},
      achievements: []
    };

    await setDoc(doc(db, 'profiles', userId), newProfile);
    return userCredential.user;
  };

  // Sign Out function
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  // Reset Password function
  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + '/reset-password'
    });
  };

  // Update progress helper
  const updateProgress = async (courseId, lessonId, isCompleted = true) => {
    if (!user) return;

    try {
      const currentProgress = { ...user.progress };
      
      // Initialize or migrate if it was a plain array
      if (!currentProgress[courseId]) {
        currentProgress[courseId] = { completedLessons: [] };
      } else if (Array.isArray(currentProgress[courseId])) {
        currentProgress[courseId] = { completedLessons: currentProgress[courseId] };
      } else if (!currentProgress[courseId].completedLessons) {
        currentProgress[courseId].completedLessons = [];
      }

      let lessons = [...currentProgress[courseId].completedLessons];

      if (isCompleted) {
        if (!lessons.includes(lessonId)) {
          lessons.push(lessonId);
        }
      } else {
        lessons = lessons.filter(id => id !== lessonId);
      }

      currentProgress[courseId] = { 
        ...currentProgress[courseId],
        completedLessons: lessons,
        lastWatchedLessonId: lessonId,
        lastWatchedAt: new Date().toISOString()
      };

      // Check achievements triggers:
      // 1. "first_lesson" (Primeiro Passo)
      let totalCompleted = 0;
      Object.keys(currentProgress).forEach(cId => {
        totalCompleted += (currentProgress[cId]?.completedLessons?.length || 0);
      });

      const updatedAchievements = [...(user.achievements || [])];
      
      if (totalCompleted >= 1 && !updatedAchievements.includes('first_lesson')) {
        updatedAchievements.push('first_lesson');
      }
      // 2. "focus_total" (Foco Total)
      if (totalCompleted >= 5 && !updatedAchievements.includes('focus_total')) {
        updatedAchievements.push('focus_total');
      }
      // 3. "course_completed" (Mestre da Plataforma)
      const course = courses.find(c => c.id === courseId);
      if (course && course.syllabus) {
        const totalLessons = course.syllabus.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;
        if (totalLessons > 0 && lessons.length === totalLessons && !updatedAchievements.includes('course_completed')) {
          updatedAchievements.push('course_completed');
        }
      }

      // Sync with Firestore profiles collection
      const profileRef = doc(db, 'profiles', user.id);
      await updateDoc(profileRef, { 
        progress: currentProgress,
        achievements: updatedAchievements
      });

      setUser(prev => ({
        ...prev,
        progress: currentProgress,
        achievements: updatedAchievements
      }));
    } catch (err) {
      console.error("Error updating progress in Firestore:", err);
    }
  };

  // Toggle Bookmark helper
  const toggleBookmark = async (courseId, lessonId) => {
    if (!user) return;
    try {
      const currentBookmarks = { ...(user.bookmarks || {}) };
      if (!currentBookmarks[courseId]) {
        currentBookmarks[courseId] = [];
      }
      let list = [...currentBookmarks[courseId]];
      if (list.includes(lessonId)) {
        list = list.filter(id => id !== lessonId);
      } else {
        list.push(lessonId);
      }
      currentBookmarks[courseId] = list;

      const profileRef = doc(db, 'profiles', user.id);
      await updateDoc(profileRef, { bookmarks: currentBookmarks });

      setUser(prev => ({
        ...prev,
        bookmarks: currentBookmarks
      }));
    } catch (err) {
      console.error("Error updating bookmarks in Firestore:", err);
    }
  };

  // Unlock Achievement helper
  const unlockAchievement = async (achievementId) => {
    if (!user) return;
    const currentAchievements = user.achievements || [];
    if (currentAchievements.includes(achievementId)) return;

    try {
      const updatedAchievements = [...currentAchievements, achievementId];
      const profileRef = doc(db, 'profiles', user.id);
      await updateDoc(profileRef, { achievements: updatedAchievements });

      setUser(prev => ({
        ...prev,
        achievements: updatedAchievements
      }));
    } catch (err) {
      console.error("Error unlocking achievement in Firestore:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signInWithGoogle, 
      signUp, 
      signOut, 
      resetPassword,
      updateProgress, 
      toggleBookmark,
      unlockAchievement,
      courses,
      loadingCourses,
      reloadCourses: loadCourses,
      reloadUser: async () => {
        if (user) {
          const profileData = await fetchUserProfile(user.id, user.email);
          setUser(profileData);
        }
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
