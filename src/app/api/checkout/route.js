import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { courseId, courseTitle, coursePrice, userId, userEmail } = await request.json();

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn("Mercado Pago Access Token não configurado no servidor (.env.local). Usando modo simulação.");
      return NextResponse.json(
        { error: 'Mercado Pago Access Token não configurado no servidor.' },
        { status: 500 }
      );
    }

    // Estrutura a preferência conforme documentação da API do Mercado Pago
    const preferenceData = {
      items: [
        {
          id: courseId,
          title: courseTitle,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(coursePrice)
        }
      ],
      payer: {
        email: userEmail
      },
      external_reference: `${userId}:${courseId}`,
      notification_url: `${request.nextUrl.origin}/api/webhook`,
      back_urls: {
        success: `${request.nextUrl.origin}/dashboard?payment=success`,
        failure: `${request.nextUrl.origin}/dashboard?payment=failure`,
        pending: `${request.nextUrl.origin}/dashboard?payment=pending`
      },
      auto_return: 'approved'
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na API do Mercado Pago:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Erro ao criar preferência no Mercado Pago.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Retorna a URL de checkout do Mercado Pago (init_point)
    return NextResponse.json({ init_point: data.init_point });
  } catch (error) {
    console.error('Erro interno na rota de checkout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao processar checkout.' },
      { status: 500 }
    );
  }
}
