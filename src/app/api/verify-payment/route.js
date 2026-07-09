import { NextResponse } from 'next/server';
import { db } from '../../../utils/firebase/client';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { userId, courseId } = await request.json();

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'userId e courseId são obrigatórios.' }, { status: 400 });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'Token do Mercado Pago não configurado.' }, { status: 500 });
    }

    // 1. Fetch current purchase from Firestore to see if we have a payment ID
    const purchasesRef = collection(db, 'purchases');
    const q = query(purchasesRef, where('user_id', '==', userId), where('course_id', '==', courseId));
    const querySnapshot = await getDocs(q);

    let approvedPayment = null;
    let purchaseDoc = null;

    if (!querySnapshot.empty) {
      purchaseDoc = querySnapshot.docs[0];
      const purchaseData = purchaseDoc.data();
      const paymentIdStr = purchaseData.payment_id || '';

      // If we have a transaction ID from the Mercado Pago API (ends in digits)
      const numericMatch = paymentIdStr.match(/\d+$/);
      if (numericMatch) {
        const mpPaymentId = numericMatch[0];
        console.log(`Direct lookup on Mercado Pago for payment ID: ${mpPaymentId}`);
        
        try {
          const directMpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (directMpResponse.ok) {
            const directMpData = await directMpResponse.json();
            if (directMpData.status === 'approved') {
              approvedPayment = directMpData;
            }
          }
        } catch (directErr) {
          console.warn("Direct lookup failed, falling back to search:", directErr);
        }
      }
    }

    // 2. Fallback to Search API if direct lookup didn't find approved payment
    if (!approvedPayment) {
      console.log(`Falling back to search query for external_reference: ${userId}:${courseId}`);
      const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${userId}:${courseId}&sort=date_created&criteria=desc&limit=5`;

      const mpResponse = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (mpResponse.ok) {
        const mpData = await mpResponse.json();
        const results = mpData.results || [];
        approvedPayment = results.find(p => p.status === 'approved');
      }
    }

    if (!approvedPayment) {
      return NextResponse.json({ status: 'pending', message: 'Nenhum pagamento aprovado encontrado.' });
    }

    // Payment is approved! Update the purchase record in Firestore (using the query snapshot fetched at the beginning)

    if (!querySnapshot.empty) {
      // Update existing purchase to approved
      const matchedDoc = querySnapshot.docs[0];
      const currentStatus = matchedDoc.data().status;

      if (currentStatus !== 'approved') {
        await updateDoc(doc(db, 'purchases', matchedDoc.id), {
          status: 'approved',
          payment_id: `MP-VERIFY-${approvedPayment.id}`,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      // No purchase record exists — create one as approved
      await addDoc(collection(db, 'purchases'), {
        user_id: userId,
        user_email: approvedPayment.payer?.email || '',
        user_name: 'Estudante',
        course_id: courseId,
        price_paid: approvedPayment.transaction_amount || 0,
        status: 'approved',
        payment_id: `MP-VERIFY-${approvedPayment.id}`,
        created_at: new Date().toISOString()
      });
    }

    // Also ensure enrolledCourses is updated on the user profile
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      const currentEnrolled = profileData.enrolledCourses || [];

      if (!currentEnrolled.includes(courseId)) {
        await updateDoc(profileRef, {
          enrolledCourses: arrayUnion(courseId)
        });
      }
    }

    return NextResponse.json({ 
      status: 'approved', 
      message: 'Pagamento confirmado e acesso liberado!',
      paymentId: approvedPayment.id 
    });

  } catch (error) {
    console.error('Erro na verificação de pagamento:', error);
    return NextResponse.json({ error: 'Erro interno ao verificar pagamento.' }, { status: 500 });
  }
}
