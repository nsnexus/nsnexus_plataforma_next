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

    // Search for payments with the external_reference matching userId:courseId
    const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${userId}:${courseId}&sort=date_created&criteria=desc&limit=5`;

    const mpResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!mpResponse.ok) {
      console.error("Erro ao buscar pagamentos no Mercado Pago:", await mpResponse.text());
      return NextResponse.json({ error: 'Falha ao consultar Mercado Pago.' }, { status: 502 });
    }

    const mpData = await mpResponse.json();
    const results = mpData.results || [];

    // Find the first approved payment
    const approvedPayment = results.find(p => p.status === 'approved');

    if (!approvedPayment) {
      return NextResponse.json({ status: 'pending', message: 'Nenhum pagamento aprovado encontrado.' });
    }

    // Payment is approved! Update the purchase record in Firestore
    const purchasesRef = collection(db, 'purchases');
    const q = query(purchasesRef, where('user_id', '==', userId), where('course_id', '==', courseId));
    const querySnapshot = await getDocs(q);

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
