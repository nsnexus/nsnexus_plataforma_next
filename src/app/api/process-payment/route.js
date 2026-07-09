import { NextResponse } from 'next/server';
import { db } from '../../../utils/firebase/client';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, courseId, courseTitle, ...paymentData } = body;

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("MERCADO_PAGO_ACCESS_TOKEN não está configurada no servidor.");
      return NextResponse.json({ error: 'Token do Mercado Pago não configurado no servidor.' }, { status: 500 });
    }

    if (!userId || !courseId) {
      return NextResponse.json({ error: 'userId e courseId são obrigatórios.' }, { status: 400 });
    }

    // Generate a unique idempotency key
    const idempotencyKey = `mp-process-${userId}-${courseId}-${Date.now()}`;

    // Structure request body for Mercado Pago v1/payments API
    const mpRequestBody = {
      transaction_amount: Number(paymentData.transaction_amount),
      description: `Curso: ${courseTitle || courseId}`,
      payment_method_id: paymentData.payment_method_id,
      payer: {
        email: paymentData.payer?.email,
        identification: paymentData.payer?.identification
      },
      external_reference: `${userId}:${courseId}`
    };

    // If card payment, token and installments are provided
    if (paymentData.token) {
      mpRequestBody.token = paymentData.token;
    }
    if (paymentData.installments) {
      mpRequestBody.installments = Number(paymentData.installments);
    }
    if (paymentData.issuer_id) {
      mpRequestBody.issuer_id = paymentData.issuer_id;
    }

    console.log("Enviando requisição de pagamento para o Mercado Pago:", {
      payment_method_id: mpRequestBody.payment_method_id,
      transaction_amount: mpRequestBody.transaction_amount,
      external_reference: mpRequestBody.external_reference
    });

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(mpRequestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro na API do Mercado Pago ao processar pagamento:", data);
      return NextResponse.json({ 
        error: data.message || 'Erro ao processar o pagamento no gateway.',
        details: data.cause || []
      }, { status: response.status });
    }

    console.log("Resposta de pagamento do Mercado Pago recebida com sucesso. ID:", data.id, "Status:", data.status);

    const paymentStatus = data.status; // 'approved', 'pending', 'in_process', 'rejected'
    const transactionId = `MP-API-${data.id}`;

    // 1. Manage Firestore purchase record
    const purchasesRef = collection(db, 'purchases');
    const q = query(purchasesRef, where('user_id', '==', userId), where('course_id', '==', courseId));
    const querySnapshot = await getDocs(q);

    const isApproved = paymentStatus === 'approved';

    if (!querySnapshot.empty) {
      // Update existing purchase
      const matchedDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'purchases', matchedDoc.id), {
        status: isApproved ? 'approved' : 'pending',
        payment_id: transactionId,
        updated_at: new Date().toISOString()
      });
    } else {
      // Create new purchase record
      await addDoc(purchasesRef, {
        user_id: userId,
        user_email: paymentData.payer?.email || '',
        user_name: 'Estudante',
        course_id: courseId,
        price_paid: Number(paymentData.transaction_amount),
        status: isApproved ? 'approved' : 'pending',
        payment_id: transactionId,
        created_at: new Date().toISOString()
      });
    }

    // 2. If approved, unlock the course in user's profile immediately
    if (isApproved) {
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        const currentEnrolled = profileData.enrolledCourses || [];

        if (!currentEnrolled.includes(courseId)) {
          await updateDoc(profileRef, {
            enrolledCourses: arrayUnion(courseId)
          });
          console.log(`Curso ${courseId} liberado imediatamente para o usuário ${userId}`);
        }
      }
    }

    // Return the response data so the frontend can retrieve PIX details or status
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erro na rota de processamento de pagamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao processar o pagamento.' }, { status: 500 });
  }
}
