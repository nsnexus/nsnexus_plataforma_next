"use client";
export const runtime = 'edge';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../utils/firebase/client';
import { collection, addDoc } from 'firebase/firestore';

export default function CheckoutPage() {
  const params = useParams();
  const { courseId } = params;
  const router = useRouter();
  const { user, reloadUser, courses } = useAuth();
  
  
  const [course, setCourse] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (courseId && courses) {
      const found = courses.find(c => c.id === courseId);
      if (!found) {
        alert("Curso não encontrado.");
        router.push('/cursos');
        return;
      }
      setCourse(found);
    }
  }, [courseId, router, courses]);

  if (!course) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'white' }}>
        <p>Carregando carrinho...</p>
      </div>
    );
  }

  const handleSimulatePayment = async () => {
    if (!user) {
      alert("Por favor, faça login para continuar a compra.");
      if (typeof window !== 'undefined') {
        localStorage.setItem("post_login_redirect", `/checkout/${course.id}`);
      }
      router.push('/login');
      return;
    }

    if (course.isClosed || course.price === 0) {
      alert("Este curso é sob consulta e não pode ser adquirido por checkout direto.");
      router.push(`/curso/${course.id}`);
      return;
    }

    setProcessing(true);
    try {
      const generatedPaymentId = 'MP-' + Math.floor(10000000 + Math.random() * 90000000);
      
      // Insert purchase row into Firestore database (real integration)
      await addDoc(collection(db, 'purchases'), {
        user_id: user.id,
        user_email: user.email,
        user_name: user.name,
        course_id: course.id,
        price_paid: course.price,
        status: 'approved', // Simulates successful approved payment
        payment_id: generatedPaymentId,
        created_at: new Date().toISOString()
      });

      // Reload user profile to fetch new enrolledCourses list
      await reloadUser();

      alert(`Pagamento simulado com sucesso via ${paymentMethod.toUpperCase()}! Código de Transação: ${generatedPaymentId}. Acesso liberado!`);
      router.push('/dashboard');
    } catch (err) {
      console.error("Erro ao registrar compra no banco de dados:", err);
      alert("Erro ao confirmar compra: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main style={{ paddingTop: '100px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white' }}>
      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold' }}>Checkout Seguro</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Finalize sua inscrição para liberar acesso imediato</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-8)' }} className="checkout-layout">
          
          {/* Payment Method Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            
            <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>Escolha a Forma de Pagamento</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', marginBottom: 'var(--space-6)' }}>
                <button 
                  className={`payment-option ${paymentMethod === 'pix' ? 'payment-option--active' : ''}`}
                  onClick={() => setPaymentMethod('pix')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '15px', background: 'rgba(9, 10, 15, 0.8)', border: paymentMethod === 'pix' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'white' }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)' }}>qr_code_2</span>
                  <span>Pix</span>
                </button>

                <button 
                  className={`payment-option ${paymentMethod === 'card' ? 'payment-option--active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '15px', background: 'rgba(9, 10, 15, 0.8)', border: paymentMethod === 'card' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'white' }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)' }}>credit_card</span>
                  <span>Cartão</span>
                </button>
              </div>

              {/* PIX Details */}
              {paymentMethod === 'pix' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(9, 10, 15, 0.6)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Escaneie o QR Code ou copie a chave Pix abaixo:</p>
                    <div style={{ width: '150px', height: '150px', background: 'white', margin: '15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '100px', color: 'black' }}>qr_code_2</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value="00020126360014br.gov.bcb.pix0114nsnexuscorp992152" 
                      style={{ flexGrow: 1, padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px' }}
                    />
                    <button className="btn btn-outline" onClick={() => alert("Chave copiada!")}>Copiar</button>
                  </div>
                </div>
              )}

              {/* Card Details */}
              {paymentMethod === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(9, 10, 15, 0.6)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Nome impresso no cartão</label>
                    <input type="text" placeholder="Nome Completo" style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Número do cartão</label>
                    <input type="text" placeholder="0000 0000 0000 0000" style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Validade</label>
                      <input type="text" placeholder="MM/AA" style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>CVV</label>
                      <input type="text" placeholder="123" style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Parcelas</label>
                    <select style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}>
                      <option>1x de R$ {course.price.toFixed(2)} (Sem juros)</option>
                      <option>2x de R$ {(course.price / 2).toFixed(2)} (Sem juros)</option>
                      <option>6x de R$ {(course.price / 6).toFixed(2)} (Sem juros)</option>
                      <option>12x de R$ {(course.price / 12).toFixed(2)} (Sem juros)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                onClick={handleSimulatePayment} 
                disabled={processing}
                className="btn btn-primary btn-full" 
                style={{ marginTop: 'var(--space-6)', justifyContent: 'center' }}
              >
                {processing ? 'Confirmando...' : `Confirmar Pagamento Simulado — R$ ${course.price.toFixed(2)}`}
              </button>

            </div>

          </div>

          {/* Cart Info Column */}
          <div style={{ alignSelf: 'start' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', marginBottom: 'var(--space-6)' }}>Resumo do Pedido</h3>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: 'var(--space-6)' }}>
                <img 
                  src={`/${course.banner}`} 
                  alt={course.title} 
                  style={{ width: '80px', height: '60px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }} 
                />
                <div>
                  <span className="badge badge-ia" style={{ fontSize: '10px', padding: '2px 6px' }}>{course.badgeLabel}</span>
                  <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 'bold', marginTop: '4px' }}>{course.title}</h4>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span>R$ {course.price.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  <span>Garantia de 7 dias</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>Grátis</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 'var(--font-md)', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>R$ {course.price.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </section>
    </main>
  );
}
