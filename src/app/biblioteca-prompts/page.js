"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { PROMPT_CATEGORIES, PROMPTS_DATABASE } from '../../data/promptsData';

const PAGE_SIZE = 30;

export default function BibliotecaPromptsPage() {
  const { user } = useAuth();
  
  // Access check
  const hasAccess = useMemo(() => {
    return user && user.enrolledCourses && user.enrolledCourses.includes("biblioteca-prompts-ia");
  }, [user]);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [aiModel, setAiModel] = useState('all');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [activePrompt, setActivePrompt] = useState(null);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: PROMPTS_DATABASE.length };
    Object.keys(PROMPT_CATEGORIES).forEach(cat => {
      counts[cat] = PROMPTS_DATABASE.filter(p => p.category === cat).length;
    });
    return counts;
  }, []);

  // Filter prompts array
  const filteredPrompts = useMemo(() => {
    return PROMPTS_DATABASE.filter(p => {
      // 1. Category Filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      
      // 2. Difficulty Filter
      if (difficulty !== 'all' && p.difficulty.toLowerCase() !== difficulty) return false;
      
      // 3. AI Model Filter
      if (aiModel !== 'all') {
        const modelLower = p.aiModel.toLowerCase();
        if (aiModel === 'chatgpt' && !modelLower.includes('chatgpt')) return false;
        if (aiModel === 'gemini' && !modelLower.includes('gemini')) return false;
        if (aiModel === 'midjourney' && !modelLower.includes('midjourney')) return false;
        if (aiModel === 'dalle' && !modelLower.includes('dall')) return false;
        if (aiModel === 'runway' && !modelLower.includes('runway') && !modelLower.includes('sora')) return false;
        if (aiModel === 'suno' && !modelLower.includes('suno')) return false;
      }

      // 4. Search Query Filter
      if (searchQuery.trim() !== '') {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchText = (p.title + " " + p.prompt + " " + p.tags.join(" ")).toLowerCase();
        if (!matchText.includes(queryLower)) return false;
      }

      return true;
    });
  }, [selectedCategory, difficulty, aiModel, searchQuery]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [selectedCategory, difficulty, aiModel, searchQuery]);

  // Load more prompts
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + PAGE_SIZE);
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = (text, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!hasAccess) {
      alert("Acesso Restrito: Adquira a Biblioteca de Prompts para liberar as cópias.");
      return;
    }
    navigator.clipboard.writeText(text);
    alert("Prompt copiado para a área de transferência!");
  };

  const visiblePrompts = filteredPrompts.slice(0, displayCount);

  return (
    <main style={{ paddingTop: '100px', minHeight: '90vh', background: 'var(--bg-primary)', color: 'white' }}>
      
      {/* Premium CTA banner if no access */}
      {!hasAccess && (
        <div className="container" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.1) 0%, rgba(112, 0, 255, 0.1) 100%)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6) var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>🔥 Desbloqueie +2.500 Prompts Premium</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
                Você está em modo de visualização. Adquira o acervo completo para negócios por apenas R$ 49,90 e leve o E-book Grátis!
              </p>
            </div>
            <Link href="/curso/biblioteca-prompts-ia" className="btn btn-primary">Adquirir Biblioteca</Link>
          </div>
        </div>
      )}

      <div className="container biblioteca-layout">
        
        {/* Sidebar categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }} className="biblioteca-sidebar">
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 'bold' }}>Categorias</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} id="category-filter-list">
            <button 
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: selectedCategory === 'all' ? 'rgba(0, 245, 212, 0.1)' : 'transparent', border: '1px solid transparent', color: selectedCategory === 'all' ? 'var(--accent-cyan)' : 'white', padding: '10px 15px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left' }}
            >
              <span>📂 Todas as Categorias</span>
              <span className="category-count">{categoryCounts.all}</span>
            </button>

            {Object.keys(PROMPT_CATEGORIES).map(catKey => {
              const cat = PROMPT_CATEGORIES[catKey];
              const count = categoryCounts[catKey] || 0;
              const isActive = selectedCategory === catKey;

              return (
                <button 
                  key={catKey}
                  className={`category-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(catKey)}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: isActive ? 'rgba(0, 245, 212, 0.1)' : 'transparent', border: '1px solid transparent', color: isActive ? 'var(--accent-cyan)' : 'white', padding: '10px 15px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{cat.icon}</span>
                    {cat.label}
                  </span>
                  <span className="category-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} className="biblioteca-content">
          
          {/* Filters Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }} className="biblioteca-filters-bar">
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Buscar prompt..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 15px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              {/* Difficulty */}
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
                style={{ flexGrow: 1, padding: '10px 15px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', color: 'white' }}
              >
                <option value="all">Todas as Dificuldades</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediário">Intermediário</option>
                <option value="avançado">Avançado</option>
              </select>

              {/* AI Model */}
              <select 
                value={aiModel} 
                onChange={(e) => setAiModel(e.target.value)}
                style={{ flexGrow: 1, padding: '10px 15px', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', color: 'white' }}
              >
                <option value="all">Todos Modelos de IA</option>
                <option value="chatgpt">ChatGPT</option>
                <option value="gemini">Gemini</option>
                <option value="midjourney">Midjourney</option>
                <option value="dalle">DALL-E</option>
                <option value="runway">Runway / Sora</option>
                <option value="suno">Suno</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
            <span>
              Mostrando <strong>{Math.min(visiblePrompts.length, filteredPrompts.length)}</strong> de <strong>{filteredPrompts.length}</strong> prompts
            </span>
          </div>

          {/* Prompts Grid */}
          <div className="card-grid" id="prompts-list-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {visiblePrompts.length > 0 ? (
              visiblePrompts.map(p => {
                const categoryInfo = PROMPT_CATEGORIES[p.category] || { label: p.category, icon: "lightbulb" };
                
                // Truncate and blur if no access
                let previewText = p.prompt;
                let isBlurred = false;
                let lockedBadge = null;

                if (!hasAccess) {
                  previewText = "PROMPT PREMIUM BLOQUEADO. ADQUIRA A BIBLIOTECA COMPLETA POR APENAS R$ 49,90 E LEVE O E-BOOK GRÁTIS!";
                  isBlurred = true;
                  lockedBadge = (
                    <span className="prompt-card__badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>lock</span> Bloqueado
                    </span>
                  );
                } else {
                  lockedBadge = <span className="prompt-card__badge prompt-card__badge--ia">{p.aiModel}</span>;
                }

                return (
                  <div key={p.id} className="prompt-card animate-fade-in-up">
                    <div className="prompt-card__header">
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{categoryInfo.icon}</span>
                        {categoryInfo.label}
                      </span>
                      {lockedBadge}
                    </div>
                    <h3 className="prompt-card__title" style={{ minHeight: '48px' }}>{p.title}</h3>
                    <div 
                      className="prompt-card__preview" 
                      style={isBlurred ? { filter: 'blur(4px)', userSelect: 'none' } : {}}
                    >
                      {previewText}
                    </div>
                    <div className="prompt-card__footer" style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => setActivePrompt(p)} 
                        className="btn btn-sm btn-secondary" 
                        style={{ flex: 1 }}
                      >
                        Ver Detalhes
                      </button>
                      <button 
                        onClick={(e) => handleCopyPrompt(p.prompt, e)} 
                        className="btn btn-sm btn-primary" 
                        style={{ gap: '4px', display: 'flex', alignItems: 'center' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span> Copiar
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-muted)' }}>search_off</span>
                <h3>Nenhum prompt encontrado</h3>
                <p>Tente ajustar os filtros ou digitar termos de busca mais gerais.</p>
              </div>
            )}
          </div>

          {/* Load More Button */}
          {filteredPrompts.length > visiblePrompts.length && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
              <button className="btn btn-outline" onClick={handleLoadMore}>Carregar Mais Prompts</button>
            </div>
          )}

        </div>

      </div>

      {/* Prompt details Modal */}
      {activePrompt && (
        <div className="video-modal video-modal--active" onClick={() => setActivePrompt(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="video-modal__content animate-fade-in-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{activePrompt.title}</h3>
              <button onClick={() => setActivePrompt(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <span className="badge badge-ia" style={{ fontSize: '10px' }}>{activePrompt.aiModel}</span>
              <span className="badge badge-closed" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>{activePrompt.difficulty}</span>
              <span className="badge" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                📂 {PROMPT_CATEGORIES[activePrompt.category]?.label}
              </span>
            </div>

            <div style={{ background: 'rgba(9, 10, 15, 0.8)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', maxHeight: '300px', overflowY: 'auto', marginBottom: 'var(--space-6)', whiteSpace: 'pre-wrap', fontSize: 'var(--font-sm)', lineHeight: 1.6, position: 'relative' }}>
              {hasAccess ? (
                activePrompt.prompt
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#ef4444', marginBottom: '10px' }}>lock</span>
                  <p style={{ fontWeight: 'bold' }}>PROMPT PREMIUM BLOQUEADO</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-xs)', marginTop: '5px' }}>Adquira o acervo completo para desbloquear.</p>
                  <Link href="/curso/biblioteca-prompts-ia" className="btn btn-sm btn-primary" style={{ marginTop: '15px' }} onClick={() => setActivePrompt(null)}>
                    Comprar Biblioteca
                  </Link>
                </div>
              )}
            </div>

            {hasAccess && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setActivePrompt(null)}>Fechar</button>
                <button className="btn btn-primary" onClick={() => handleCopyPrompt(activePrompt.prompt)}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '5px' }}>content_copy</span> Copiar Prompt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </main>
  );
}
