"use client";
export const runtime = 'edge';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../utils/firebase/client';
import { collection, addDoc } from 'firebase/firestore';
import ProtectedRoute from '../../../components/ProtectedRoute';

function CheckoutContent() {
  const params = useParams();
  const { courseId } = params;
  const router = useRouter();
  const { user, reloadUser, courses } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix'); // 'pix' or 'card'
  const [pixData, setPixData] = useState(null);
  const [isPaymentApproved, setIsPaymentApproved] = useState(false);
  const [isPaymentInProcess, setIsPaymentInProcess] = useState(false);
  const [brickCreated, setBrickCreated] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Check if SDK was already loaded by root layout
  useEffect(() => {
    if (typeof window !== 'undefined' && window.MercadoPago) {
      setSdkLoaded(true);
    }
  }, []);

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

  // Handle Brick initialization when method changes to 'card'
  useEffect(() => {
    if (paymentMethod === 'pix') {
      // Clear container and reset brick status when PIX is selected
      const container = document.getElementById('paymentBrick_container');
      if (container) container.innerHTML = '';
      setBrickCreated(false);
      return;
    }

    if (!sdkLoaded || !course || !user || brickCreated || pixData || isPaymentApproved || isPaymentInProcess) return;

    const initBrick = async () => {
      try {
        const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
        if (!publicKey) {
          console.error("Chave pública do Mercado Pago não configurada.");
          return;
        }

        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });
        const bricksBuilder = mp.bricks();

        const settings = {
          initialization: {
            amount: Number(course.price),
            payer: {
              email: user.email,
            },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
            },
            visual: {
              style: {
                theme: 'dark'
              }
            }
          },
          callbacks: {
            onReady: () => {
              console.log("Card Payment Brick pronto.");
            },
            onSubmit: ({ selectedPaymentMethod, formData }) => {
              return new Promise(async (resolve, reject) => {
                try {
                  const response = await fetch('/api/process-payment', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      userId: user.id,
                      courseId: course.id,
                      courseTitle: course.title,
                      ...formData
                    })
                  });

                  if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Erro no processamento do pagamento.');
                  }

                  const result = await response.json();

                  if (result.status === 'approved') {
                    setIsPaymentApproved(true);
                    resolve();
                    setTimeout(() => {
                      reloadUser().then(() => {
                        router.push('/dashboard');
                      });
                    }, 3500);
                  } else if (result.status === 'in_process') {
                    setIsPaymentInProcess(true);
                    resolve();
                    setTimeout(() => {
                      router.push('/dashboard');
                    }, 3500);
                  } else if (result.status === 'rejected') {
                    alert("Pagamento recusado pelo Mercado Pago. Por favor, utilize outro cartão.");
                    reject();
                  } else {
                    resolve();
                  }
                } catch (err) {
                  console.error("Erro no processamento do cartão:", err);
                  alert("Erro ao processar cartão: " + err.message);
                  reject();
                }
              });
            },
            onError: (error) => {
              console.error("Erro no Card Brick:", error);
            }
          }
        };

        const container = document.getElementById('paymentBrick_container');
        if (container) {
          container.innerHTML = '';
          await bricksBuilder.create('payment', 'paymentBrick_container', settings);
          setBrickCreated(true);
        }
      } catch (err) {
        console.error("Erro ao inicializar Card Brick:", err);
      }
    };

    initBrick();
  }, [sdkLoaded, course, user, brickCreated, paymentMethod, pixData, isPaymentApproved, isPaymentInProcess]);

  const handlePixSubmit = async () => {
    if (!user) {
      alert("Por favor, faça login para continuar.");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          courseId: course.id,
          courseTitle: course.title,
          transaction_amount: Number(course.price),
          payment_method_id: 'pix',
          payer: {
            email: user.email
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao gerar cobrança Pix.');
      }

      const result = await response.json();

      if (result.payment_method_id === 'pix' && result.point_of_interaction?.transaction_data) {
        setPixData({
          qrCode: result.point_of_interaction.transaction_data.qr_code,
          qrCodeBase64: result.point_of_interaction.transaction_data.qr_code_base64,
          id: result.id
        });
      } else {
        throw new Error("Resposta inválida do Mercado Pago ao gerar Pix.");
      }
    } catch (err) {
      console.error("Erro ao processar Pix:", err);
      alert("Erro ao processar Pix: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!course) {
    return (
      <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'white' }}>
        <p>Carregando carrinho...</p>
      </div>
    );
  }

  return (
    <main style={{ paddingTop: '100px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white' }}>
      <Script 
        src="https://sdk.mercadopago.com/js/v2" 
        strategy="afterInteractive" 
        onLoad={() => setSdkLoaded(true)}
      />

      <section className="container" style={{ paddingBottom: 'var(--space-20)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 'bold' }}>Checkout Seguro</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Escolha a forma de pagamento para liberação imediata</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-8)' }} className="checkout-layout">
          
          {/* Payment Method Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            
            <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
              
              {isPaymentApproved && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 20px', textAlign: 'center', alignItems: 'center' }}>
                  <div style={{
                    width: '75px',
                    height: '75px',
                    borderRadius: '50%',
                    background: 'rgba(0, 245, 212, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--accent-cyan)',
                    marginBottom: '10px'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '42px', color: 'var(--accent-cyan)' }}>check_circle</span>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold', margin: '0' }}>Matrícula Confirmada!</h3>
                  <p style={{ fontSize: 'var(--font-md)', color: 'var(--text-secondary)', maxWidth: '450px', lineHeight: 1.6 }}>
                    Parabéns! Seu pagamento foi processado com sucesso. O seu acesso foi liberado e você está sendo redirecionado para a plataforma...
                  </p>
                  <div className="loader" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--accent-cyan)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', marginTop: '15px' }}></div>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}

              {isPaymentInProcess && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 20px', textAlign: 'center', alignItems: 'center' }}>
                  <div style={{
                    width: '75px',
                    height: '75px',
                    borderRadius: '50%',
                    background: 'rgba(234, 179, 8, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #eab308',
                    marginBottom: '10px'
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#eab308' }}>hourglass_empty</span>
                  </div>
                  <h3 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold', margin: '0' }}>Pagamento em Processamento</h3>
                  <p style={{ fontSize: 'var(--font-md)', color: 'var(--text-secondary)', maxWidth: '450px', lineHeight: 1.6 }}>
                    Seu pagamento está sendo analisado pelo Mercado Pago. Assim que a aprovação for confirmada, o acesso será liberado. Redirecionando...
                  </p>
                  <div className="loader" style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #eab308', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', marginTop: '15px' }}></div>
                </div>
              )}

              {pixData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '15px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--accent-cyan)' }}>qr_code_2</span>
                  <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', margin: '0' }}>Pix Gerado com Sucesso!</h3>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                    Escaneie o QR Code abaixo com o app do seu banco ou copie o código Pix Copia e Cola.
                  </p>
                  
                  <div style={{ width: '200px', height: '200px', background: 'white', margin: '15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', borderRadius: 'var(--radius-lg)' }}>
                    <img src={`data:image/jpeg;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                    <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textAlign: 'left' }}>Código Copia e Cola:</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={pixData.qrCode} 
                        style={{ flexGrow: 1, padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', fontSize: '11px', outline: 'none' }}
                        onClick={(e) => e.target.select()}
                      />
                      <button className="btn btn-outline" onClick={() => {
                        navigator.clipboard.writeText(pixData.qrCode);
                        alert("Código Pix copiado!");
                      }}>
                        Copiar
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <Link href="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
                      Ir para o Meu Dashboard
                    </Link>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                      Seu curso será liberado em segundos após a confirmação do pagamento.
                    </p>
                  </div>
                </div>
              )}

              {!isPaymentApproved && !isPaymentInProcess && !pixData && (
                <>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>Escolha a Forma de Pagamento</h3>
                  
                  {/* Payment Tabs Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: 'var(--space-6)' }}>
                    <button 
                      onClick={() => setPaymentMethod('pix')}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '15px', 
                        background: 'rgba(9, 10, 15, 0.8)', 
                        border: paymentMethod === 'pix' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        cursor: 'pointer', 
                        color: 'white' 
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)' }}>qr_code_2</span>
                      <span style={{ fontWeight: paymentMethod === 'pix' ? 'bold' : 'normal' }}>Pix (Imediato)</span>
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('card')}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '15px', 
                        background: 'rgba(9, 10, 15, 0.8)', 
                        border: paymentMethod === 'card' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        cursor: 'pointer', 
                        color: 'white' 
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: 'var(--accent-cyan)' }}>credit_card</span>
                      <span style={{ fontWeight: paymentMethod === 'card' ? 'bold' : 'normal' }}>Cartão de Crédito</span>
                    </button>
                  </div>

                  {paymentMethod === 'pix' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(9, 10, 15, 0.4)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--accent-cyan)' }}>payments</span>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>Pagamento via Pix</h4>
                        <p style={{ margin: 0, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          O código Pix e o QR Code serão mostrados na tela imediatamente após clicar no botão abaixo. Não pediremos nenhuma informação extra!
                        </p>
                      </div>
                      
                      <button 
                        onClick={handlePixSubmit}
                        disabled={processing}
                        className="btn btn-primary"
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', padding: '14px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bolt</span>
                        {processing ? 'Gerando Pix...' : `Gerar Código Pix — R$ ${course.price.toFixed(2)}`}
                      </button>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Container for Mercado Pago Brick */}
                      <div id="paymentBrick_container" style={{ minHeight: '300px' }}>
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '100px' }}>
                          Carregando formulário de cartão seguro...
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

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

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
