"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { COURSES_DATA } from '../data/platformData';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState(COURSES_DATA);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  const supabase = createClient();

  // Load courses from Supabase with fallback to static platform data
  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map PG snake_case column names to camelCase frontend properties
        const mapped = data.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          price: Number(c.price) || 0,
          originalPrice: Number(c.original_price) || 0,
          paymentLink: c.payment_link || '',
          duration: c.duration || '',
          lessonsCount: c.lessons_count || '',
          instructor: c.instructor || '',
          type: c.type || 'video',
          category: c.category || 'sistemas',
          badgeClass: c.badge_class || 'badge-systems',
          badgeLabel: c.badge_label || 'Sistemas',
          level: c.level || 'Todos os Níveis',
          rating: Number(c.rating) || 5.0,
          reviewsCount: Number(c.reviews_count) || 0,
          banner: c.banner || '',
          isClosed: !!c.is_closed,
          syllabus: c.syllabus || []
        }));
        setCourses(mapped);
      } else {
        setCourses(COURSES_DATA);
      }
    } catch (err) {
      console.warn("Error loading courses from Supabase (using static fallback):", err.message || err);
      setCourses(COURSES_DATA);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Load profile and purchases for a given user ID
  const fetchUserProfile = async (userId, userEmail) => {
    try {
      // 1. Fetch profile from profiles table
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        console.log("Profile not found in database. Creating default profile...");
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

        try {
          // Attempt client-side insertion (safe fallback)
          await supabase.from('profiles').insert(newProfile);
        } catch (insertErr) {
          console.error("Client-side profile insert skipped or failed:", insertErr);
        }

        return {
          ...newProfile,
          enrolledCourses: []
        };
      }

      // 2. Fetch approved purchases for enrolledCourses
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('course_id')
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (purchasesError) throw purchasesError;

      const enrolledCourses = (purchases || []).map(p => p.course_id);

      // If user has purchased the Prompt Library, automatically unlock the E-book for free
      if (enrolledCourses.includes('biblioteca-prompts-ia') && !enrolledCourses.includes('ebook-ia-negocios')) {
        enrolledCourses.push('ebook-ia-negocios');
      }

      // Auto-unlock E-book and Audiobook for local testing
      if (!enrolledCourses.includes('ebook-ia-negocios')) enrolledCourses.push('ebook-ia-negocios');
      if (!enrolledCourses.includes('audiobook-ia-negocios')) enrolledCourses.push('audiobook-ia-negocios');

      // Default avatar if none
      const defaultAvatar = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=100&auto=format&fit=crop";

      return {
        id: userId,
        email: userEmail,
        name: profile?.name || 'Sem nome',
        avatar_url: profile?.avatar_url || defaultAvatar,
        role: profile?.role || 'student',
        progress: profile?.progress || {},
        enrolledCourses: enrolledCourses
      };
    } catch (error) {
      console.error("Error loading user profile:", error);
      return null;
    }
  };

  // Sync session on mount
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && active) {
        let profileData = await fetchUserProfile(session.user.id, session.user.email);
        
        // Retry logic in case profile trigger is slightly delayed
        if (!profileData && active) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          profileData = await fetchUserProfile(session.user.id, session.user.email);
        }

        setUser(profileData);
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
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      
      if (session?.user) {
        setLoading(true);
        const profileData = await fetchUserProfile(session.user.id, session.user.email);
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
      subscription?.unsubscribe();
    };
  }, []);

  // Sign In function
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  // Sign In with Google OAuth
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) throw error;
    return data;
  };

  // Sign Up function
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    return data.user;
  };

  // Sign Out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Update progress helper
  const updateProgress = async (courseId, lessonId, isCompleted = true) => {
    if (!user) return;

    const currentProgress = { ...user.progress };
    if (!currentProgress[courseId]) {
      currentProgress[courseId] = { completedLessons: [], percentage: 0 };
    }

    let completedLessons = [...(currentProgress[courseId].completedLessons || [])];
    
    if (isCompleted) {
      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);
      }
    } else {
      completedLessons = completedLessons.filter(id => id !== lessonId);
    }

    currentProgress[courseId].completedLessons = completedLessons;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ progress: currentProgress })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser(prev => ({
        ...prev,
        progress: currentProgress
      }));
    } catch (err) {
      console.error("Error updating progress in Supabase:", err);
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
