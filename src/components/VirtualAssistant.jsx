"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const SYSTEM_INSTRUCTION = `
Você é a "Fabi", a Assistente Virtual inteligente da NSNexus (plataforma de cursos e consultoria corporativa de impacto).
Seu objetivo principal é ajudar os visitantes do site, tirar dúvidas sobre os cursos e guiar leads interessados a fechar negócios ou solicitar orçamentos.

Aqui está o seu catálogo de produtos e serviços para consulta:
1. Sistemas no SharePoint Moderno (Criação de Sistemas Web): Nosso curso carro-chefe! Ensina a configurar portais corporativos e cadastros no SharePoint sem precisar de programação. Custa R$ 250,00 (Preço promocional, de R$ 599,00 por R$ 250,00). O link para adquirir na plataforma é: /curso/sistemas-sharepoint-moderno
2. Landing Page para WhatsApp (Serviço Expresso): Custa R$ 149,00 (site de alta conversão entregue em até 3 dias). O link para adquirir na plataforma é: /curso/landing-page-whatsapp
3. Treinamentos Particulares / Consultorias VIP sob encomenda (Power BI, Power Apps, Power Automate, IA Corporativa): São oferecidos sob consulta.
   - Se o cliente perguntar sobre como aprender Power BI, Power Apps, criar aplicativos corporativos ou pedir orçamentos para a sua empresa, explique que oferecemos treinamento individual (VIP) e corporativos customizados.
   - Oriente-o a solicitar uma cotação/orçamento diretamente com o instrutor via WhatsApp.
   - Forneça o link direto para o WhatsApp do instrutor: https://wa.me/5594991081351?text=Ola!%20Gostaria%20de%20solicitar%20um%20orcamento%20para%20treinamento%20particular.

Regras importantes de comunicação:
- Seja extremamente educada, prestativa, carismática e focada em converter a conversa em venda ou lead.
- Dê respostas curtas, estruturadas e fáceis de ler (máximo de 3 parágrafos). Use bullet points se for listar algo.
- Responda sempre em português brasileiro de forma muito natural.
- Nunca invente preços ou links que não estão nesta lista.
`;

const QUICK_ACTIONS = [
  { 
    id: 'power_bi', 
    label: '📊 Aprender Power BI (VIP)', 
    reply: `Oferecemos treinamentos particulares (VIP) e corporativos de **Power BI Avançado & UX** focados no seu projeto real.

Para solicitar uma cotação ou agendar um escopo sob medida, clique no link abaixo para conversar diretamente com o instrutor no WhatsApp:
[👉 Solicitar Cotação de Power BI](https://wa.me/5594991081351?text=Ola!%20Gostaria%20de%20solicitar%20um%20orcamento%20para%20treinamento%20particular%20de%20Power%20BI.)`
  },
  { 
    id: 'sharepoint_sys', 
    label: '📂 Sistemas & SharePoint (R$ 250)', 
    reply: `Aprenda a criar portais corporativos e cadastros robustos no SharePoint Moderno economizando com licenças extras de Power Apps. O curso é nosso carro-chefe!

Por apenas **R$ 250,00** (Promoção: de R$ 599,00 por R$ 250,00), você aprende passo a passo com o auxílio de um Agente de IA exclusivo.
[👉 Conhecer o Curso de SharePoint](/curso/sistemas-sharepoint-moderno)`
  },
  { 
    id: 'whatsapp_direct', 
    label: '💬 Falar no WhatsApp (Suporte)', 
    reply: `Precisa tirar dúvidas comerciais, solicitar consultoria sob demanda ou resolver problemas na plataforma? 

Converse diretamente conosco agora mesmo:
[👉 Falar no WhatsApp da NSNexus](https://wa.me/5594991081351?text=Ola!%20Preciso%20de%20ajuda%20com%20a%20plataforma.)`
  }
];

export const VirtualAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Sou a **Fabi**, a inteligência artificial da **NSNexus**. 🤖\nComo posso te ajudar hoje? Selecione uma das opções rápidas abaixo ou digite sua pergunta livremente!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Build chat history for Gemini context
      const chatHistoryText = messages
        .map(m => `${m.sender === 'user' ? 'Usuário' : 'Fabi (Assistente)'}: ${m.text}`)
        .join('\n');

      const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nHistórico da Conversa:\n${chatHistoryText}\n\nUsuário: ${textToSend}\nFabi:`;

      // Call our secure server-side API endpoint
      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullPrompt })
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || response.statusText;
        } catch (_) {
          errorDetails = response.statusText;
        }
        throw new Error(`Erro na API do Gemini (${response.status}): ${errorDetails}`);
      }

      const data = await response.json();
      const aiReplyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, tive um problema ao processar a resposta.';

      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: aiReplyText.trim(),
        timestamp: new Date()
      }]);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-assistant`,
        sender: 'assistant',
        text: 'Desculpe, estou com dificuldades para me conectar à inteligência artificial agora. Você pode tentar utilizar os botões de resposta rápida ou falar direto no WhatsApp!',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    const userMsg = {
      id: `msg-${Date.now()}-user-action`,
      sender: 'user',
      text: action.label,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-assistant-action`,
        sender: 'assistant',
        text: action.reply,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 800);
  };

  // Helper to format markdown links in message bubbles
  const renderMessageText = (text) => {
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    
    let formattedText = text;
    
    // Convert bold **text** to HTML <strong>
    formattedText = formattedText.replace(boldRegex, '<strong>$1</strong>');
    
    // Split text by markdown links to render actual React anchors
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex index
    markdownLinkRegex.lastIndex = 0;
    
    while ((match = markdownLinkRegex.exec(formattedText)) !== null) {
      const matchIndex = match.index;
      const linkText = match[1];
      const linkUrl = match[2];
      
      // Push text before link
      if (matchIndex > lastIndex) {
        parts.push(<span key={lastIndex} dangerouslySetInnerHTML={{ __html: formattedText.substring(lastIndex, matchIndex) }} />);
      }
      
      // Render link
      if (linkUrl.startsWith('/')) {
        // Internal Router Link
        parts.push(<Link key={linkIndex(linkUrl)} href={linkUrl} onClick={() => setIsOpen(false)} style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: 'bold' }}>{linkText}</Link>);
      } else {
        // External Link (WhatsApp, etc.)
        parts.push(<a key={linkIndex(linkUrl)} href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline', fontWeight: 'bold' }}>{linkText}</a>);
      }
      
      lastIndex = markdownLinkRegex.lastIndex;
    }
    
    if (lastIndex < formattedText.length) {
      parts.push(<span key={lastIndex} dangerouslySetInnerHTML={{ __html: formattedText.substring(lastIndex) }} />);
    }
    
    return parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
  };

  const linkIndex = (url) => `link-${url}-${Math.random()}`;

  return (
    <>
      {/* FLOATING ACTION BUBBLE */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="assistant-bubble"
        title="Falar com a assistente Fabi"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%)',
          border: '1px solid rgba(0, 245, 212, 0.4)',
          color: 'white',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 999,
          boxShadow: '0 4px 15px rgba(0, 245, 212, 0.3)',
          transition: 'transform 0.2s ease',
          outline: 'none'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
          {isOpen ? 'close' : 'forum'}
        </span>
        {/* Glow badge */}
        {!isOpen && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ff007f',
            border: '2px solid #06070d',
            display: 'block'
          }}></span>
        )}
      </button>

      {/* CHAT DRAWER PANEL */}
      <div 
        className={`assistant-window ${isOpen ? 'active' : ''}`}
        style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          width: '380px',
          maxWidth: 'calc(100vw - 48px)',
          height: '500px',
          maxHeight: 'calc(100vh - 120px)',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          boxShadow: 'var(--shadow-cyan-glow)',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/images/fabi_avatar.png" 
              alt="Fabi Avatar" 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--accent-cyan)',
                objectFit: 'cover'
              }} 
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Fabi
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }}></span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Assistente Virtual NSNexus</div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}
          >
            &times;
          </button>
        </div>

        {/* Chat Messages Area */}
        <div style={{
          flexGrow: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: 'var(--font-xs)',
          lineHeight: '1.5'
        }}>
          {messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.sender === 'user' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                padding: '10px 14px',
                borderRadius: '12px',
                borderTopRightRadius: msg.sender === 'user' ? '2px' : '12px',
                borderTopLeftRadius: msg.sender === 'assistant' ? '2px' : '12px',
                color: 'white',
                whiteSpace: 'pre-wrap'
              }}
            >
              {renderMessageText(msg.text)}
            </div>
          ))}

          {/* AI typing state indicator */}
          {isTyping && (
            <div style={{
              alignSelf: 'flex-start',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              padding: '10px 14px',
              borderRadius: '12px',
              borderTopLeftRadius: '2px',
              display: 'flex',
              gap: '4px',
              alignItems: 'center'
            }}>
              <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite 0.1s' }}></span>
              <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }}></span>
              <span className="dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'pulse 1s infinite 0.3s' }}></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions Panel */}
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          borderTop: '1px solid rgba(255,255,255,0.03)',
          background: 'rgba(0,0,0,0.1)'
        }}>
          {QUICK_ACTIONS.map(action => (
            <button 
              key={action.id}
              onClick={() => handleQuickAction(action)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-color)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '9px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(0, 245, 212, 0.08)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.04)'}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Message Input Footer */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          style={{
            padding: '12px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '8px',
            background: 'rgba(0,0,0,0.3)',
            borderBottomLeftRadius: 'var(--radius-lg)',
            borderBottomRightRadius: 'var(--radius-lg)'
          }}
        >
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua dúvida aqui..."
            style={{
              flexGrow: 1,
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              fontSize: 'var(--font-xs)',
              outline: 'none'
            }}
          />
          <button 
            type="submit"
            style={{
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-cyan) 100%)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              width: '36px',
              height: '36px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              send
            </span>
          </button>
        </form>
      </div>
    </>
  );
};
export default VirtualAssistant;
