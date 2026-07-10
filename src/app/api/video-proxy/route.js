import { NextResponse } from 'next/server';
export const runtime = 'edge';
import { db } from '../../../utils/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

function getVideoEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=0&fs=1&iv_load_policy=3`;
    }
    return url;
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { error: 'courseId e lessonId são obrigatórios.' },
        { status: 400 }
      );
    }

    // Fetch course from Firestore
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      return NextResponse.json(
        { error: 'Curso não encontrado.' },
        { status: 404 }
      );
    }

    const courseData = courseSnap.data();
    const syllabus = courseData.syllabus || [];

    // Find the lesson in the syllabus
    let lessonUrl = null;
    for (const mod of syllabus) {
      if (mod.lessons) {
        for (const les of mod.lessons) {
          if (les.id === lessonId) {
            lessonUrl = les.url;
            break;
          }
        }
      }
      if (lessonUrl) break;
    }

    if (!lessonUrl) {
      return NextResponse.json(
        { error: 'Aula não encontrada ou sem vídeo configurado.' },
        { status: 404 }
      );
    }

    // Convert to embed URL and return
    const embedUrl = getVideoEmbedUrl(lessonUrl);

    return NextResponse.json({ embedUrl });
  } catch (err) {
    console.error('[video-proxy] Erro:', err);
    return NextResponse.json(
      { error: 'Erro interno ao buscar vídeo.' },
      { status: 500 }
    );
  }
}
