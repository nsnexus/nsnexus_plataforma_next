"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../utils/firebase/client';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
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
        // Firebase documents use our standard camelCase format
        const mapped = data.map(c => ({
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
        const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop";
        
        const newProfile = {
          id: userId,
          email: userEmail,
          name: fallbackName,
          avatar_url: defaultAvatar,
          role: userEmail === 'narcisofelizardo@gmail.com' ? 'admin' : 'student',
          progress: {}
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

      // Bônus logic: Auto-unlock eBook if user bought Prompt Library
      if (enrolledCourses.includes('biblioteca-prompts-ia') && !enrolledCourses.includes('ebook-ia-negocios')) {
        enrolledCourses.push('ebook-ia-negocios');
      }

      // Auto-unlock E-book and Audiobook for local testing/homologation
      if (!enrolledCourses.includes('ebook-ia-negocios')) enrolledCourses.push('ebook-ia-negocios');
      if (!enrolledCourses.includes('audiobook-ia-negocios')) enrolledCourses.push('audiobook-ia-negocios');

      const defaultAvatar = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=100&auto=format&fit=crop";

      return {
        id: userId,
        email: userEmail,
        name: profile.name || 'Sem nome',
        avatar_url: profile.avatar_url || defaultAvatar,
        role: profile.role || 'student',
        progress: profile.progress || {},
        enrolledCourses: enrolledCourses
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
            role: "student",
            progress: {},
            enrolledCourses: ["ebook-ia-negocios", "audiobook-ia-negocios", "biblioteca-prompts-ia", "sistemas-sharepoint-moderno", "landing-page-whatsapp"]
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

  // Sign In with Google OAuth (using popup - no tricky redirects)
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  };

  // Sign Up function
  const signUp = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop";
    const newProfile = {
      id: userId,
      email: email,
      name: name,
      avatar_url: defaultAvatar,
      role: email === 'narcisofelizardo@gmail.com' ? 'admin' : 'student',
      progress: {}
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
      if (!currentProgress[courseId]) {
        currentProgress[courseId] = [];
      }

      if (isCompleted) {
        if (!currentProgress[courseId].includes(lessonId)) {
          currentProgress[courseId].push(lessonId);
        }
      } else {
        currentProgress[courseId] = currentProgress[courseId].filter(id => id !== lessonId);
      }

      // Sync with Firestore profiles collection
      const profileRef = doc(db, 'profiles', user.id);
      await updateDoc(profileRef, { progress: currentProgress });

      setUser(prev => ({
        ...prev,
        progress: currentProgress
      }));
    } catch (err) {
      console.error("Error updating progress in Firestore:", err);
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
