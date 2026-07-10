import { NextResponse } from 'next/server';
import { db } from '../../../utils/firebase/client';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc } from 'firebase/firestore/lite';

export const runtime = 'edge';

async function processPayment(paymentId) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("MERCADO_PAGO_ACCESS_TOKEN not set on server env.");
    throw new Error("Access token missing");
  }

  // Fetch payment details from Mercado Pago API
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!mpResponse.ok) {
    console.error("Failed to query payment details from Mercado Pago:", await mpResponse.text());
    throw new Error("Failed to query MP payment details");
  }

  const paymentData = await mpResponse.json();
  console.log("Mercado Pago payment webhook details:", paymentData);

  const status = paymentData.status;
  const externalReference = paymentData.external_reference; // format: "userId:courseId"

  if (status === 'approved' && externalReference && externalReference.includes(':')) {
    const [userId, courseId] = externalReference.split(':');

    console.log(`Approved payment webhook confirmed! User: ${userId}, Course: ${courseId}`);

    // 1. Update or create the purchase record in Firestore
    const purchasesRef = collection(db, 'purchases');
    const q = query(purchasesRef, where('user_id', '==', userId), where('course_id', '==', courseId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const matchedDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'purchases', matchedDoc.id), {
        status: 'approved',
        payment_id: `MP-WEB-${paymentId}`,
        updated_at: new Date().toISOString()
      });
    } else {
      await addDoc(collection(db, 'purchases'), {
        user_id: userId,
        user_email: paymentData.payer?.email || '',
        user_name: 'Estudante',
        course_id: courseId,
        price_paid: paymentData.transaction_amount || 0,
        status: 'approved',
        payment_id: `MP-WEB-${paymentId}`,
        created_at: new Date().toISOString()
      });
    }

    // 2. Unlock the course for the student profile (add to enrolledCourses)
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      const currentEnrolled = profileData.enrolledCourses || [];

      if (!currentEnrolled.includes(courseId)) {
        await updateDoc(profileRef, {
          enrolledCourses: arrayUnion(courseId)
        });
        console.log(`Course ${courseId} auto-unlocked for User ${userId}`);
      }
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("Mercado Pago POST Webhook received:", body);

    const paymentId = body.data?.id || body.id;
    const type = body.type || body.topic;

    if (type === 'payment' && paymentId) {
      await processPayment(paymentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook POST processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic');
    const paymentId = url.searchParams.get('id');

    console.log("Mercado Pago GET Webhook received:", { topic, paymentId });

    if (topic === 'payment' && paymentId) {
      await processPayment(paymentId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook GET processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
