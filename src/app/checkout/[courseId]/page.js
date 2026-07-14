"use client";
export const runtime = 'edge';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../utils/firebase/client';
import { collection, addDoc } from 'firebase/firestore/lite';
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
                  const refUserId = typeof window !== 'undefined' ? localStorage.getItem('referral_user_id') : null;
                  const response = await fetch('/api/process-payment', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      userId: user.id,
                      courseId: course.id,
                      courseTitle: course.title,
                      refUserId,
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
                    }, 20000);
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
      const refUserId = typeof window !== 'undefined' ? localStorage.getItem('referral_user_id') : null;
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
          refUserId,
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
    <div style={{ background: 'var(--bg-primary)', color: 'white', minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px' }}>
      <Script 
        src="https://sdk.mercadopago.com/js/v2" 
        strategy="afterInteractive" 
        onLoad={() => setSdkLoaded(true)}
      />

      <div className="container" style={{ maxWidth: '1000px' }}>
        
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>Finalizar Inscrição</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-sm)' }}>
          Você está a um passo de acelerar sua carreira com a melhor plataforma de IA & SharePoint.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(280px, 0.8fr)', gap: 'var(--space-8)', alignItems: 'start' }} className="checkout-layout">
          
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
                    Parabéns! Seu pagamento foi processado com sucesso e o seu acesso foi liberado.
                  </p>
                  
                  {/* WhatsApp Group Button */}
                  <a 
                    href="https://chat.whatsapp.com/KXwpTXV7a7A3UJRVmD1BZ3?s=cl&p=a&ilr=4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: '#25d366',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      marginTop: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style={{ display: 'block' }}>
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437.002 9.861-4.416 9.864-9.852.002-2.633-1.02-5.107-2.88-6.97C16.376 1.91 13.91 1.88 11.278 1.88c-5.43.001-9.853 4.419-9.856 9.856-.001 1.716.473 3.393 1.378 4.887L1.69 22.097l5.76-1.511zM16.92 14.887c-.267-.134-1.583-.78-1.827-.868-.243-.088-.42-.133-.596.134-.176.265-.678.868-.831 1.045-.153.177-.306.199-.573.066-.267-.133-1.127-.415-2.148-1.325-.793-.708-1.329-1.582-1.485-1.848-.156-.266-.017-.409.117-.542.12-.12.267-.31.4-.464.133-.155.177-.266.266-.443.088-.177.044-.332-.022-.465-.066-.133-.596-1.436-.816-1.968-.215-.518-.432-.448-.597-.456-.153-.008-.33-.009-.508-.009-.177 0-.465.066-.708.332-.243.266-.93.908-.93 2.214 0 1.306.949 2.568 1.082 2.746.133.177 1.867 2.851 4.524 3.998.632.273 1.126.436 1.512.559.635.202 1.212.174 1.669.106.51-.076 1.583-.647 1.804-1.271.22-.624.22-1.161.154-1.271-.066-.109-.243-.2-.51-.334z"/>
                    </svg>
                    Entrar no Grupo de Alunos (WhatsApp)
                  </a>

                  <button
                    onClick={() => {
                      reloadUser().then(() => {
                        router.push('/dashboard');
                      });
                    }}
                    className="btn btn-outline"
                    style={{
                      marginTop: '10px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Ir para o Painel do Aluno
                  </button>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Redirecionamento automático em 20 segundos...</p>
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

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
