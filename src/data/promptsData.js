/* Database of 2700+ AI Prompts for NSNexus Platform */

export const PROMPT_CATEGORIES = {
  "imagens": { label: "Criação de Imagens", icon: "image" },
  "videos": { label: "Criação de Vídeos", icon: "videocam" },
  "audios": { label: "Criação de Áudios", icon: "mic" },
  "tiktok": { label: "TikTok & Reels", icon: "phone_iphone" },
  "youtube": { label: "YouTube Content", icon: "smart_display" },
  "instagram": { label: "Instagram", icon: "photo_camera" },
  "linkedin": { label: "LinkedIn", icon: "work" },
  "copywriting": { label: "Copywriting", icon: "edit_note" },
  "email": { label: "E-mail Marketing", icon: "mail" },
  "seo": { label: "SEO & Blog", icon: "search" },
  "negocios": { label: "Negócios & Estratégia", icon: "trending_up" },
  "codigo": { label: "Programação & SQL", icon: "code" },
  "pbi": { label: "Power BI & DAX", icon: "bar_chart" },
  "sharepoint": { label: "SharePoint & M365", icon: "hub" },
  "automacao": { label: "Automação & Make/Zapier", icon: "auto_awesome" },
  "educacao": { label: "Educação & e-Learning", icon: "school" },
  "marketing": { label: "Marketing Digital", icon: "campaign" },
  "rh": { label: "Recrutamento & RH", icon: "groups" },
  "suporte": { label: "Atendimento & Suporte", icon: "support_agent" },
  "avancado": { label: "Engenharia de Prompt", icon: "psychology" }
};

// Niches to generate realistic variations
export const PROMPT_NICHES = [
  { name: "SaaS B2B", value: "software como serviço (SaaS B2B) voltado para produtividade" },
  { name: "E-commerce de Moda", value: "e-commerce de moda sustentável e roupas ecológicas" },
  { name: "Consultoria Financeira", value: "consultoria de finanças pessoais e investimentos de longo prazo" },
  { name: "Clínica de Estética", value: "clínica estética especializada em tratamentos faciais premium" },
  { name: "Infoprodutos de Carreira", value: "cursos e infoprodutos focados em transição de carreira para tech" },
  { name: "Mercado Imobiliário", value: "venda de apartamentos de luxo em áreas metropolitanas" },
  { name: "Alimentação Saudável", value: "delivery de marmitas fitness e alimentação saudável ultra-congelada" },
  { name: "Educação Infantil", value: "plataforma de atividades lúdicas e e-learning infantil" },
  { name: "Pet Shop Online", value: "clube de assinatura de rações e brinquedos biodegradáveis para pets" },
  { name: "Arquitetura & Design", value: "projetos de interiores sustentáveis e residenciais modernos" },
  { name: "Desenvolvimento de Software", value: "fábrica de softwares e integrações personalizadas de sistemas" },
  { name: "Energia Solar", value: "instalação e assinatura de projetos de energia solar residencial" },
  { name: "Criador no Kwai (Dicas & Humor)", value: "criador de vídeos curtos no Kwai focado em humor do cotidiano e dicas rápidas" },
  { name: "Tiktoker de Finanças (FinTok)", value: "tiktoker de finanças simplificadas e dicas de investimento para jovens" },
  { name: "Youtuber de Tecnologia", value: "canal de tecnologia no YouTube com reviews e tutoriais passo-a-passo" },
  { name: "Instagram de Estilo de Vida", value: "perfil do Instagram voltado para lifestyle, rotina produtiva e bem-estar" },
  { name: "Criador Kwai (Receitas Rápidas)", value: "criador de conteúdo no Kwai focado em receitas práticas de 1 minuto" },
  { name: "Tiktoker de Curiosidades", value: "canal de curiosidades científicas e fatos interessantes no TikTok" },
  { name: "Youtuber de Desenvolvimento Pessoal", value: "canal do YouTube focado em resumos de livros e desenvolvimento pessoal" },
  { name: "Instagram de Nutrição", value: "perfil profissional no Instagram de nutrição clínica e receitas saudáveis" },
  { name: "Tiktoker de Maquiagem & Beleza", value: "criadora de conteúdo no TikTok focada em tutoriais de automaquiagem e beleza" },
  { name: "Youtuber de Games & Streamer", value: "canal de games no YouTube focado em análises de jogos e cortes de lives" },
  { name: "Instagram de Viagens", value: "perfil no Instagram com roteiros de viagens baratas e turismo de aventura" },
  { name: "Criador Kwai (Cortes de Podcasts)", value: "canal no Kwai de cortes de podcasts lendários e momentos inspiradores" },
  { name: "Tiktoker de Danças & Trends", value: "tiktoker focado em coreografias virais e trends musicais do momento" },
  { name: "Youtuber de Marketing Digital", value: "canal do YouTube voltado para estratégias de vendas online e tráfego pago" },
  { name: "Instagram de Organização & Home Office", value: "perfil no Instagram de organização pessoal, rotina de home office e decoração" }
];


export const BASE_TEMPLATES = {
  "imagens": [
    {
      title: "Foto Publicitária Estilo Estúdio para [Niche]",
      aiModel: "Midjourney v6",
      difficulty: "Avançado",
      prompt: "A high-end professional commercial studio photography of products for [Value]. Clean background with dramatic soft lighting, cinematic shadows, shot on 85mm lens, f/2.8, hyperrealistic texture, 8k resolution, minimalist setup, premium color palette --ar 16:9 --style raw --stylize 250"
    },
    {
      title: "Ilustração 3D Isometrica para [Niche]",
      aiModel: "DALL-E 3",
      difficulty: "Intermediário",
      prompt: "Isometric 3D illustration representing the concept of [Value]. Vibrant gradient colors, clean vector lines, soft clay render style, luminous glow details, white isolated background, modern tech aesthetic, playful design."
    },
    {
      title: "Retrato Corporativo em Estilo Editorial para [Niche]",
      aiModel: "Midjourney v6",
      difficulty: "Avançado",
      prompt: "Candid medium-shot editorial portrait of a professional leader representing [Value], shot inside a modern office with glass windows, warm ambient sunset light entering, Kodak Portra 400 film look, soft background bokeh, natural expressions, authentic texture --ar 4:5 --stylize 180"
    },
    {
      title: "Mockup de Interface Mobile Minimalista para [Niche]",
      aiModel: "Midjourney v6",
      difficulty: "Intermediário",
      prompt: "Minimalist mobile app user interface showcasing landing page for [Value]. Glassmorphism cards, neon blue and deep violet color scheme, glowing interactive buttons, professional layout, displayed on a clean matte display mockup --ar 16:9 --v 6.0"
    },
    {
      title: "Ilustração em Vetor Flat Art para [Niche]",
      aiModel: "DALL-E 3",
      difficulty: "Iniciante",
      prompt: "A flat vector illustration representing [Value]. Graphic design style, bold color palette, clean geometric lines, minimalist character designs, high contrast, clean shapes, vector asset --no shadows"
    }
  ],
  "videos": [
    {
      title: "Roteiro com Gancho Forte (Hook) para Promover [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um roteiro de vídeo curto (30 segundos) promovendo [Value]. O objetivo é reter a atenção do usuário nos primeiros 3 segundos. Use a seguinte estrutura:\n1. O Gancho (0-3s): Comece com uma pergunta provocativa ou estatística chocante.\n2. A Dor (3-15s): Descreva o maior erro que o público comete ao lidar com isso.\n3. A Solução (15-25s): Apresente nosso diferencial.\n4. Call to Action (25-30s): Direcione para o link na bio com uma oferta exclusiva."
    },
    {
      title: "Prompt Cinematográfico para IA de Vídeo (Runway Gen-3) - [Niche]",
      aiModel: "Runway / Sora",
      difficulty: "Avançado",
      prompt: "Cinematic drone shot soaring over a modern workspace showcasing active professionals working with [Value]. Golden hour volumetric sunlight slicing through large glass panes, dust particles floating in light rays, smooth camera motion, hyperrealistic, high-fidelity details, slow motion."
    },
    {
      title: "Ideias de Vídeos de Bastidores de Alta Conversão para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Gere um plano com 3 ideias de roteiros baseados em 'bastidores' para [Value]. As ideias devem gerar credibilidade imediata e focar em como resolvemos os problemas críticos dos clientes na prática. Inclua diretrizes de gravação e sugestão de trilha sonora."
    },
    {
      title: "Estrutura de Roteiro VSL (Video Sales Letter) para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Avançado",
      prompt: "Crie um roteiro completo de VSL de 5 minutos utilizando a fórmula de copywriting 'AIDA' para vender uma solução de [Value]. Divida o roteiro em marcações de tempo e detalhe a narração e o que deve aparecer nos slides em cada slide."
    },
    {
      title: "Roteiro Panorâmico Explicativo B2B para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Escreva um roteiro técnico-explicativo voltado para tomadores de decisão em empresas tradicionais sobre a importância de implementar [Value]. O tom deve ser corporativo, seguro e pragmático, destacando o Retorno sobre o Investimento (ROI)."
    }
  ],
  "audios": [
    {
      title: "Script para Narração Natural por IA (ElevenLabs) de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um script de 150 palavras otimizado para síntese de voz (ElevenLabs) focado em atrair leads para [Value]. Insira marcadores de respiração e tom de voz (ex: [pausa dramática], [entonação calorosa]) para que o áudio final soe 100% humano."
    },
    {
      title: "Diretrizes de Prompt de Trilha Sonora no Suno/Udio para [Niche]",
      aiModel: "Suno AI",
      difficulty: "Intermediário",
      prompt: "Crie um prompt detalhado de música instrumental de fundo corporativa para vídeos promocionais de [Value]. Gênero: lo-fi corporativo misturado com sintetizadores modernos ambientais, batida suave de 95 BPM, inspiradora, focada, sem vocais, mixagem limpa."
    },
    {
      title: "Estrutura de Podcast Educativo de 1 Episódio para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Desenvolva a pauta completa e roteiro de introdução para um episódio de podcast corporativo focado em debater as tendências de mercado para [Value]. Inclua perguntas abertas para os entrevistados e ganchos comerciais integrados no meio."
    },
    {
      title: "Script para Rádio Interna/Muzak Comercial para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um spot comercial de rádio de 30 segundos para divulgar promoções e novidades de [Value]. O roteiro deve ser enérgico, focado nos benefícios rápidos e finalizar com um cupom de desconto marcante."
    },
    {
      title: "Roteiro de Efeitos Sonoros & Foley Promocional de [Niche]",
      aiModel: "ElevenLabs SFX",
      difficulty: "Avançado",
      prompt: "Gere uma lista de prompts para efeitos sonoros a serem usados na edição de vídeo sobre [Value]. Exemplos: cliques suaves de alta tecnologia, transições rápidas de vento (whoosh) com textura digital, e som de notificações limpas de sucesso."
    }
  ],
  "tiktok": [
    {
      title: "Roteiro Viral de TikTok estilo POV para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um roteiro no formato POV (Ponto de Vista) para o TikTok adaptado para [Value]. O roteiro deve ironizar ou retratar uma situação engraçada que o cliente ideal passa diariamente antes de conhecer nossa solução. Termine com uma transição satisfatória."
    },
    {
      title: "Estratégia de 5 Shorts/Reels Rápidos para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Desenvolva uma grade de 5 ideias de conteúdos de 15 segundos para Reels/TikTok sobre [Value]. Cada vídeo deve cobrir uma dica rápida e visual que o usuário consiga testar imediatamente. Inclua hashtags e sugestões de áudios em alta."
    },
    {
      title: "Script de Vídeo de Resposta a Comentário Crítico sobre [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Crie um roteiro de vídeo curto onde eu respondo de forma elegante, profissional e empática a uma dúvida comum ou objeção sobre [Value]. Mostre o problema por outro ângulo, convertendo a dúvida em uma demonstração de autoridade."
    },
    {
      title: "Roteiro Estilo Unboxing / Demonstração Prática para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva o roteiro e instruções de câmera para um vídeo dinâmico mostrando a experiência real de usar o produto ou serviço de [Value]. O foco deve ser na sensação visual de facilidade e no alívio de usar a nossa solução."
    },
    {
      title: "Gancho de Alto Engajamento e Script de Retenção para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie 10 variações de ganchos virais específicos para o nicho de [Value] baseados em gatilhos psicológicos como curiosidade, medo de perder a oportunidade (FOMO) e contraste ('Antes vs Depois'). Acompanhe cada gancho com a estrutura da primeira frase."
    }
  ],
  "youtube": [
    {
      title: "Títulos e Ideias de Miniaturas Altamente Clicáveis para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Gere 10 títulos otimizados para cliques (Click-through Rate - CTR) e ideias visuais de miniaturas (thumbnails) para um vídeo do YouTube focado em [Value]. Use gatilhos mentais fortes e evite títulos genéricos."
    },
    {
      title: "Roteiro Completo para Vídeo Tutorial de 10 Minutos sobre [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva a estrutura detalhada de roteiro de 10 minutos para um vídeo explicativo passo-a-passo sobre [Value]. Inclua introdução, quebra de conteúdo em 4 partes lógicas, momentos para piadas ou quebras de padrão e Call to Action para inscrição na newsletter."
    },
    {
      title: "Descrição Otimizada para SEO de Vídeo do YouTube de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Crie uma descrição detalhada de vídeo para o YouTube focada em ranquear na primeira página para buscas relacionadas a [Value]. Insira timestamps (marcações de tempo), termos-chave naturais, links úteis e tags recomendadas."
    },
    {
      title: "Roteiro de Vídeo estilo 'Análise/Review' Técnico de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Escreva um roteiro neutro e detalhado analisando os pontos positivos, negativos e o custo-benefício de se investir em soluções de [Value]. Use linguagem técnica mas acessível, posicionando-se como especialista imparcial."
    },
    {
      title: "Pauta de Conteúdo Semanal (YouTube) para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Gere uma pauta completa contendo 4 temas de vídeos estratégicos para o YouTube para atrair novos clientes corporativos interessados em [Value]. Cada tema deve ter: Título, Objetivo do Vídeo, Resumo do Conteúdo e CTA."
    }
  ],
  "instagram": [
    {
      title: "Roteiro de Carrossel de 7 Slides Altamente Compartilhável de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Crie o conteúdo textual slide-a-slide para um carrossel do Instagram com 7 slides sobre [Value]. Slide 1 deve ser uma headline impossível de ignorar. Slides 2 a 6 devem passar 1 dica objetiva cada. Slide 7 deve ser a chamada para ação comentando abaixo."
    },
    {
      title: "Legendas Engajadoras para Post de Venda Direta de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva 3 variações de legendas para o Instagram focadas em vender os serviços/produtos de [Value]. Variação 1: Foco em storytelling. Variação 2: Foco em dor e benefício direto. Variação 3: Curta e objetiva. Inclua emojis e hashtags relevantes."
    },
    {
      title: "Script para Sequência de 5 Stories Interativos de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Iniciante",
      prompt: "Planeje uma sequência lógica de 5 Stories para o Instagram focado em engajar o público sobre [Value]. Use enquetes, caixas de perguntas e barras de reação estratégica para qualificar leads no processo de compra."
    },
    {
      title: "Planejamento Mensal de Linha Editorial para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie uma matriz de conteúdo completa para 30 dias de Instagram para posicionamento de autoridade em [Value]. Divida os posts em 3 pilares principais: Educação, Conexão Humana e Prova Social de Resultados."
    },
    {
      title: "Prompt de Bio e Links Otimizados para Perfil de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva 3 opções de textos de biografia (Bio) para o Instagram focadas em converter visitantes casuais em clientes de [Value]. Mostre claramente quem ajudamos, como ajudamos e qual o próximo passo (link na bio)."
    }
  ],
  "linkedin": [
    {
      title: "Artigo de Opinião Profissional (Thought Leadership) sobre [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva um post no LinkedIn focado em posicionamento executivo de autoridade discutindo os desafios antigos e novos enfrentados no mercado de [Value]. Use tom analítico, elegante, corporativo, e apresente dados fictícios realistas de mercado."
    },
    {
      title: "Post de Storytelling com Lição Prática sobre [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Crie um post para o LinkedIn utilizando a técnica de storytelling corporativo. Narre uma história fictícia mas realista sobre como um gestor superou o caos operacional ao adotar práticas inovadoras de [Value]. Evite clichês exagerados."
    },
    {
      title: "Post de Celebração de Resultados e Case de Sucesso em [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Escreva um texto para o LinkedIn celebrando o encerramento bem-sucedido de um projeto focado em implantar [Value]. O tom deve ser de gratidão ao time, focando nas métricas alcançadas e lições aprendidas durante o processo."
    },
    {
      title: "Comentários Estratégicos para Fazer em Posts Influentes de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Gere 5 modelos de comentários inteligentes para eu utilizar em postagens de grandes executivos do LinkedIn que estejam falando indiretamente sobre [Value]. O objetivo é chamar atenção e demonstrar autoridade sem parecer panfletário."
    },
    {
      title: "Mensagem Fria de Prospecção Comercial no LinkedIn (InMail) para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva um modelo de mensagem direta (InMail) curto e extremamente profissional para abordar Diretores ou Gerentes de Operações e propor soluções de [Value]. O foco deve ser em gerar um call de 15 minutos para diagnóstico."
    }
  ],
  "copywriting": [
    {
      title: "Landing Page com Estrutura de Copy Completa para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva a estrutura de texto completa para uma landing page de vendas de alta conversão de [Value]. Inclua: Headline (título principal), Sub-headline, Apresentação da Dor, Nossa Solução, Seção de Benefícios detalhados, FAQ e Botões de CTA."
    },
    {
      title: "Sequência de Anúncios no Meta Ads (Facebook/Instagram) para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Desenvolva 3 criativos de anúncios (texto da imagem, legenda de chamada, e título do botão) para campanhas de tráfego pago promovendo [Value]. Variação 1: Apelo emocional. Variação 2: Apelo racional/financeiro. Variação 3: Direto ao ponto."
    },
    {
      title: "Estrutura de Anúncio no Google Ads de Alta Conversão para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Gere 5 títulos (limite de 30 caracteres) e 3 descrições (limite de 90 caracteres) otimizados para campanhas de pesquisa no Google Ads focando na busca ativa por soluções corporativas de [Value]."
    },
    {
      title: "Script para Remarketing Digital Segmentado para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Escreva uma copy para remarketing focada em quebrar as objeções de preço e tempo de potenciais clientes que visitaram a página de [Value] mas não compraram. Use depoimentos de sucesso como sustentação lógica."
    },
    {
      title: "Headlines Matadoras usando Fórmulas Clássicas para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Gere 15 chamadas impactantes (headlines) para [Value] usando fórmulas clássicas como 'Como obter X sem Y', 'Descubra o segredo de X', e 'Se você quer X, pare de fazer Y imediatamente'."
    }
  ],
  "email": [
    {
      title: "Sequência de Integração e Onboarding (Email) para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie uma sequência automatizada de 3 emails pós-cadastro para leads interessados em entender mais sobre [Value]. Email 1: Boas-vindas e entrega de material gratuito. Email 2: Estudo de caso real. Email 3: Chamada para demonstração."
    },
    {
      title: "Assuntos de Email de Alta Taxa de Abertura para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva 15 ideias de linhas de assunto (Subject Lines) para e-mails institucionais sobre [Value]. Crie opções curiosas, urgentes, focadas em benefício direto e utilizando personalização com a tag [Primeiro Nome]."
    },
    {
      title: "Newsletter Informativa e Curadoria do Setor para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva um rascunho de newsletter semanal com tom amigável e informativo que agregue novidades do mercado sobre [Value]. O objetivo é educar o público e sutilmente direcioná-los para um serviço pago no final do email."
    },
    {
      title: "E-mail de Recuperação de Carrinho Abandonado para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um e-mail persuasivo focado em recuperar vendas perdidas de potenciais clientes que abandonaram o checkout de [Value]. Ofereça uma garantia incondicional e sane as dúvidas comuns sobre o processo."
    },
    {
      title: "E-mail Frio de Prospecção Industrial (Cold Mail) para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva um cold mail de alta conversão estruturado para CEOs ou CFOs de médias empresas tradicionais, demonstrando como nossa expertise em [Value] pode reduzir os custos de produção em pelo menos 15%. Seja curto e direto."
    }
  ],
  "seo": [
    {
      title: "Briefing de Conteúdo Completo para Blogpost de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Crie um briefing completo de escrita para redatores focando em produzir um post de blog de 1500 palavras sobre as melhores práticas de [Value]. Defina a palavra-chave principal, secundárias, estrutura de H2/H3 e a intenção de busca (search intent)."
    },
    {
      title: "Meta Títulos e Meta Descrições Otimizadas para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Crie 5 variações de títulos de SEO (Meta Title) e meta descrições (Meta Description) para a página inicial de uma empresa focada em [Value]. Siga rigorosamente as recomendações de limites de caracteres do Google."
    },
    {
      title: "Análise de Intenção de Busca e Cluster de Conteúdo para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Desenvolva uma tabela de clusters de conteúdo para mapear todas as palavras-chave que um cliente em potencial de [Value] busca no Google. Divida as colunas em: Palavra-chave, Volume de Busca (Intenção), Estágio do Funil (TOFU/MOFU/BOFU) e Ideia de Título."
    },
    {
      title: "Otimização de Artigo Existente com Link Building Interno para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Revise e otimize um texto antigo sobre [Value] para torná-lo mais rico aos olhos do algoritmo do Google Core Update. Sugira inserção de entidades semânticas relacionadas, parágrafos curtos, infográficos teóricos e links de âncora."
    },
    {
      title: "Análise Semântica de Concorrentes Organicos de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Explique como mapear as falhas de conteúdo (content gaps) de concorrentes diretos que escrevem artigos sobre [Value]. Crie uma lista de perguntas frequentes do público (People Also Ask) que os concorrentes deixaram de responder."
    }
  ],
  "negocios": [
    {
      title: "Matriz SWOT e Análise de Risco Estratégico para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Elabore uma análise de matriz SWOT detalhada (Forças, Fraquezas, Oportunidades, Ameaças) focada especificamente em lançar um novo modelo de negócio para [Value]. Identifique 3 risks críticos de mercado e suas respectivas mitigações."
    },
    {
      title: "Plano de Ação para Definição e Acompanhamento de OKRs de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Desenvolva o planejamento estratégico de OKRs (Objectives and Key Results) para o próximo trimestre corporativo de uma empresa de [Value]. Crie 2 objetivos principais e 3 resultados-chave operacionais mensuráveis por objetivo."
    },
    {
      title: "Roteiro de Pitch Deck para Apresentação a Investidores de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Estruture o roteiro e o conteúdo slide-a-slide de uma apresentação de Pitch Deck (10 slides) focando em captar investimentos de rodada Seed para expandir nossas soluções de [Value]. Enfatize o tamanho do mercado (TAM, SAM, SOM)."
    },
    {
      title: "Precificação e Modelagem Financeira de Serviços para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Ajude-me a estruturar o modelo de precificação para serviços de [Value]. Compare os formatos de cobrança: Retentores mensais fixos (Retainer), Preço Fechado por Projeto (Fixed Price) e Precificação baseada no valor gerado (Value-based Pricing)."
    },
    {
      title: "Checklist de Due Diligence e Compliance Inicial para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Crie um checklist básico contendo as etapas regulatórias, jurídicas e operacionais mínimas de compliance necessárias para validar e operar de forma segura o modelo de negócio de [Value] no Brasil."
    }
  ],
  "codigo": [
    {
      title: "Função JavaScript com Consumo de API Restful para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva um código JavaScript (ES6 moderno) que crie uma função assíncrona para consumir dados de uma API externa e exiba um dashboard dinâmico focado em exibir métricas de [Value]. Adicione tratamento de erros robusto com try/catch."
    },
    {
      title: "Script SQL para Modelagem de Relatórios Complexos de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva uma consulta SQL compatível com PostgreSQL que realize joins em 3 tabelas diferentes (Vendas, Clientes, Produtos) para extrair o faturamento acumulado e médias mensais relacionadas às vendas de [Value]. Use Window Functions."
    },
    {
      title: "Otimização de Algoritmo de Performance e Busca para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Analise e melhore a complexidade de tempo de execução (Big O) de uma rotina escrita em Python focado em processar cadastros operacionais de [Value]. Otimize loops desnecessários e use estruturas de dados eficientes."
    },
    {
      title: "Arquivo de Configuração Dockerfile de Produção para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um arquivo de configuração Dockerfile otimizado e seguro para containerizar uma aplicação web moderna focada em rodar os serviços internos de [Value]. Use multi-stage builds para reduzir o tamanho da imagem final."
    },
    {
      title: "Setup Completo de Pipeline CI/CD (GitHub Actions) de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie um arquivo YAML de configuração para o GitHub Actions que automatize o build, execução de testes unitários e deploy automático na nuvem de uma aplicação focada em gerenciar sistemas de [Value]."
    }
  ],
  "pbi": [
    {
      title: "Criação de Medida DAX de Performance Acumulada para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva a fórmula de uma medida DAX para o Power BI que calcule o faturamento acumulado no ano atual (Year-to-Date - YTD) e realize o comparativo direto com o mesmo período do ano anterior (Prior Year) para relatórios de [Value]."
    },
    {
      title: "Estrutura de Modelagem Star Schema Otimizada para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Explique em detalhes como modelar as tabelas fato e dimensão no Power BI seguindo as melhores práticas de Star Schema de Ralph Kimball, para gerenciar métricas complexas de [Value]. Evite tabelas relacionais bidirecionais."
    },
    {
      title: "Query M (Power Query) para Limpeza e Tratamento de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva uma query M avançada para o Power Query focada em tratar um arquivo Excel bruto de vendas de [Value]. Remova colunas vazias, faça o unpivot das tabelas de meses, altere os tipos de dados e crie uma coluna condicional."
    },
    {
      title: "Medida DAX de Média Móvel de 12 Meses (LTM) para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Desenvolva uma medida DAX complexa para calcular a média móvel de faturamento dos últimos 12 meses (LTM - Last Twelve Months) focando em suavizar sazonalidades nas métricas gerenciais de [Value]."
    },
    {
      title: "Planejamento de RLS (Row-Level Security) de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie um guia estratégico de implementação de segurança a nível de linha (Row-Level Security - RLS) dinâmico no Power BI, garantindo que gestores regionais de [Value] enxerguem apenas os dados de suas respectivas filiais corporativas."
    }
  ],
  "sharepoint": [
    {
      title: "Modelagem de SharePoint Lists para Controles de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Desenvolva a estrutura de dados de uma lista do SharePoint Moderno focada em cadastrar e controlar processos internos de [Value]. Defina o nome de cada coluna, o tipo de dado adequado e quais campos devem ser obrigatórios."
    },
    {
      title: "Script para Editor Web Part Moderno (HTML/CSS/JS) no SharePoint para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva um código em HTML, CSS e JavaScript puro (Vanilla JS) que crie um componente interativo de controle de dados corporativos sobre [Value], projetado para rodar nativamente dentro de um Modern Script Editor no SharePoint Online."
    },
    {
      title: "Mapeamento de Fluxo de Aprovação no SharePoint via Power Automate para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Desenvolva o escopo lógico passo-a-passo de um fluxo do Power Automate integrado a uma SharePoint List de [Value]. O fluxo deve enviar e-mails de aprovação condicional aos diretores de área quando novos itens forem criados."
    },
    {
      title: "Estrutura de Governança e Permissões de Site SharePoint para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um guia de configuração de níveis de acessos e segurança (Proprietários, Membros e Visitantes) para gerenciar o controle de arquivos críticos e relatórios operacionais relacionados aos dados de [Value]."
    },
    {
      title: "Customização Avançada de Formulários do SharePoint com JSON para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie um esquema de configuração JSON pronto para aplicar na visualização de formulário nativo (List Form Customization) do SharePoint, organizando as colunas de cadastro de [Value] em blocos visuais e seções modernas."
    }
  ],
  "automacao": [
    {
      title: "Fluxo de Integração de Lead entre Facebook Lead Ads e CRM para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Explique como configurar passo-a-passo no Make (antigo Integromat) uma automação conectando anúncios de leads a uma ferramenta de CRM para prospecção de [Value]. Inclua as etapas de roteamento de e-mails automáticos."
    },
    {
      title: "Automação Completa de Emissão de Propostas com IA Builder e Flow de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie o blueprint de automação do Power Automate que: 1. Monitora uma pasta do SharePoint. 2. Lê dados de faturas brutos usando IA Builder. 3. Preenche um template Word corporativo de [Value]. 4. Salva em PDF e envia para o e-mail do cliente."
    },
    {
      title: "Script Google Apps Script para Enviar Lembretes de Cobrança de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Escreva um script para Google Apps Script que leia dados de uma planilha do Google Sheets contendo datas de vencimento de contratos de [Value] e envie e-mails de notificação automática de cobrança 3 dias antes do vencimento."
    },
    {
      title: "Automatização de Notificações de Vendas no Microsoft Teams para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Explique como integrar um webhook de vendas com o canal oficial do Teams para notificar toda a equipe comercial sempre que uma nova conversão do produto/serviço de [Value] for faturada no gateway de pagamento."
    },
    {
      title: "Fluxo no Make.com para Monitoramento de Menções Sociais de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva a lógica para criar um cenário no Make.com que capture menções ou reclamações sobre marcas concorrentes de [Value] no Twitter/Instagram, analise o sentimento do texto com IA e adicione os leads qualificados em uma planilha."
    }
  ],
  "educacao": [
    {
      title: "Plano de Aula Dinâmico com Metodologia Ativa de 4 Semanas para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Crie a ementa didática e cronograma semanal detalhado para um treinamento corporativo prático focado em capacitar colaboradores na adoção de [Value]. Divida as aulas em 4 blocos de teoria e prática integradas."
    },
    {
      title: "Gerador de Quizzes e Testes Avaliativos Dinâmicos para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um quiz completo contendo 10 perguntas de múltipla escolha com respostas detalhadas e justificadas para testar o nível de conhecimento técnico básico de uma equipe que está aprendendo sobre [Value]."
    },
    {
      title: "Estrutura de Roteiro e Slides para Curso de E-learning de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva a estrutura de tópicos de uma aula teórica em vídeo de 20 minutos sobre [Value]. Inclua os bullet points dos slides visuais, ganchos didáticos para reter o estudante e exemplos práticos baseados em analogias do cotidiano."
    },
    {
      title: "Simulação de Estudo de Caso Prático e Real para Exercício de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Desenvolva um problema de negócios fictício simulando uma empresa em crise e peça ao estudante para propor uma solução estruturada utilizando ferramentas de [Value]. Forneça as bases de dados iniciais sugeridas."
    },
    {
      title: "Guia Rápido de Atalhos e Manual de Bolso para Iniciantes em [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva um guia prático de referência rápida de 1 página resumindo os principais comandos, conceitos essenciais e fluxos lógicos fundamentais para quem está começando a estudar [Value] do absoluto zero."
    }
  ],
  "marketing": [
    {
      title: "Estratégia Completa de Lançamento de Infoproduto/Serviço em [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie a estratégia completa de marketing digital passo-a-passo de 3 fases (Pré-lançamento, Lançamento e Pós-venda) para comercializar e validar no mercado nacional uma solução premium focada em [Value]."
    },
    {
      title: "Planejamento Estratégico de Tráfego Pago e Distribuição para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Desenvolva a estrutura de distribuição de orçamento mensal entre campanhas de Google Ads, Meta Ads e LinkedIn Ads para obter leads qualificados interessados em contratar os serviços profissionais de [Value]."
    },
    {
      title: "Roteiro e Roteirização de Reels Promocional de Alta Conversão de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva o script completo e diretrizes de áudio/vídeo para um Reels estratégico de 30 segundos. O objetivo do vídeo é que o espectador digite uma palavra-chave específica nos comentários para receber um link sobre [Value]."
    },
    {
      title: "Criação de Ímãs de Lead (E-books e Iscas) Atraentes para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Gere 5 ideias detalhadas de materiais ricos gratuitos (iscas digitais) focadas em atrair a atenção de diretores e decisores de compras que sofrem com o problema que a nossa solução de [Value] resolve."
    },
    {
      title: "Script de Roteiro de Webinar ao Vivo de Vendas de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Escreva la pauta completa e estruturada de uma apresentação ao vivo de 45 minutos. O objetivo é engajar a audiência ensinando um conteúdo prático sobre [Value] e fechar com uma oferta irresistível no final."
    }
  ],
  "rh": [
    {
      title: "Roteiro de Entrevista Técnica e Perguntas Chave para Vagas de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Crie um roteiro de entrevista com 8 perguntas técnicas específicas e 4 de soft skills para qualificar candidatos concorrendo a uma vaga de especialista júnior/pleno responsável por gerenciar dados de [Value]."
    },
    {
      title: "Template de Vaga Otimizado para LinkedIn Recruitment de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva a descrição de cargo e atribuições (Job Description) atraente para publicar no LinkedIn recrutando profissionais de [Value]. Inclua competências necessárias, diferenciais desejados e o modelo de cultura corporativa."
    },
    {
      title: "Planejamento Lógico de Programa de Onboarding de 30 dias para [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Desenvolva o plano estratégico detalhado de integração de 30 dias para novos colaboradores que trabalharão em áreas que lidam diretamente com o controle e manutenção de sistemas de [Value]. Defina metas semanais claras."
    },
    {
      title: "Guia de Avaliação de Desempenho e Metas Individuais (PDI) em [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Crie uma matriz estruturada para Planos de Desenvolvimento Individual (PDI) focada em acelerar as habilidades técnicas de funcionários que necessitam dominar ferramentas operacionais voltadas para [Value]."
    },
    {
      title: "Política Interna de Uso e Segurança de Ferramentas de IA e Dados em [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Gere um modelo de termos de conduta e diretrizes internas corporativas de segurança da informação que regulamente o uso aceitável de dados e o manuseio de relatórios confidenciais relacionados aos processos de [Value]."
    }
  ],
  "suporte": [
    {
      title: "Script para Chatbots Corporativos de Atendimento de [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Intermediário",
      prompt: "Desenvolva o fluxo de conversação inteligente (árvore de decisão de FAQ) para um chatbot que responde aos clientes com dúvidas e solicitações sobre suporte técnico e contratação de serviços de [Value]."
    },
    {
      title: "Modelos de Resposta Rápida para Clientes Insatisfeitos sobre [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Escreva 3 templates de e-mails de atendimento ao cliente focados em responder reclamações ou atrasos de implantações operacionais de [Value] de forma empática, profissional, acalmando o cliente e propondo resolução imediata."
    },
    {
      title: "Checklist de Atendimento e Triagem de Incidentes Técnicos de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Crie um documento padrão de procedimentos operacionais (SOP) para que analistas de suporte façam a triagem rápida de erros e bugs reportados por usuários em sistemas corporativos que rodam soluções de [Value]."
    },
    {
      title: "Template de FAQ Completo e Respostas Curtas para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Iniciante",
      prompt: "Gere uma lista de 10 perguntas e respostas objetivas contendo as maiores dúvidas que clientes em potencial têm sobre implementação, prazos de entrega, segurança dos dados e manutenções periódicas de [Value]."
    },
    {
      title: "Guia de Treinamento e Empatia para Times de Helpdesk de [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Intermediário",
      prompt: "Escreva um guia com princípios de comunicação não-violenta e de escuta ativa adaptados para atendentes de suporte que lidam diariamente com usuários frustrados com erros operacionais em softwares de [Value]."
    }
  ],
  "avancado": [
    {
      title: "Mega-Prompt de Persona Especialista Interativa para [Niche]",
      aiModel: "ChatGPT / Gemini",
      difficulty: "Avançado",
      prompt: "Você atuará como um consultor sênior de altíssimo nível especializado em implantar e escalar soluções operacionais de [Value]. Seu objetivo é analisar minhas dores de negócio, me fazer perguntas de diagnóstico e estruturar o plano ideal. Só responda me fazendo a primeira pergunta técnica."
    },
    {
      title: "Prompt Baseado em Framework de Prompt Avançado 'CARE' para [Niche]",
      aiModel: "ChatGPT / Gemini",
      difficulty: "Avançado",
      prompt: "Context: Estou desenvolvendo e implementando o modelo operacional de [Value] em uma empresa tradicional de 150 funcionários.\nAction: Desenhe o plano de migração lógica e mapeamento de dados.\nRules: Responda em tópicos claros, evite jargões teóricos e separe em 3 etapas de 15 dias.\nExample: Enfatize o ROI de pelo menos 18% ao ano."
    },
    {
      title: "Prompt de Poucos Exemplos (Few-Shot Prompting) Otimizado para [Niche]",
      aiModel: "ChatGPT",
      difficulty: "Avançado",
      prompt: "Analise o padrão de escrita e complete o próximo item seguindo a mesma estrutura operacional de decisão:\n\nExemplo 1: Empresa de logística que precisava rastrear cargas de [Value]. Solução: Usamos Power Apps integrado no SharePoint. Impacto: Redução de 22% nas perdas de rotas.\n\nExemplo 2: Empresa de varejo que queria controlar estoques de [Value]. Solução: Usamos Power BI + Power Automate. Impacto: Redução de R$ 45k ao ano em excedentes.\n\nExemplo 3 (Gere a Solução e o Impacto baseado no seu nicho real): Empresa de [Value] precisava..."
    },
    {
      title: "Prompt de Cadeia de Pensamento (Chain-of-Thought) para Diagnóstico em [Niche]",
      aiModel: "Gemini 1.5 Pro",
      difficulty: "Avançado",
      prompt: "Resolva o desafio de otimização de faturamento de uma empresa de [Value] pensando passo-a-passo. Descreva seu raciocínio preliminar de custos fixos, análise a alocação de mão de obra direta, identifique gargalos operacionais ocultos e somente no final forneça o plano consolidado de ações."
    },
    {
      title: "Prompt de Refinamento Iterativo de Ideias de Negócio em [Niche]",
      aiModel: "ChatGPT / Gemini",
      difficulty: "Intermediário",
      prompt: "Analise a minha proposta de valor inicial para [Value] e atue como o meu crítico mais severo. Encontre 5 vulnerabilidades lógicas no meu pitch de vendas, identifique objeções de preço e me force a justificar as margens de lucro propostas."
    }
  ]
};

// Generates exactly 2700 unique prompts by matching 20 categories * 5 templates * 27 niches
function generatePromptsDatabase() {
  const database = [];
  const categoriesList = Object.keys(PROMPT_CATEGORIES);

  categoriesList.forEach(category => {
    const templates = BASE_TEMPLATES[category];
    if (!templates) return;

    templates.forEach((template, tIndex) => {
      PROMPT_NICHES.forEach((niche, nIndex) => {
        // Create unique ID
        const id = `${category}-${tIndex}-${nIndex}`;
        
        // Dynamically replace [Niche] and [Value] placeholder tags
        const title = template.title.replace("[Niche]", niche.name);
        const promptText = template.prompt
          .replace(/\[Niche\]/g, niche.name)
          .replace(/\[Value\]/g, niche.value);

        // Tags to help search engine
        const tags = [
          category,
          niche.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
          template.aiModel.toLowerCase().split(" ")[0],
          template.difficulty.toLowerCase()
        ];

        database.push({
          id: id,
          category: category,
          title: title,
          prompt: promptText,
          aiModel: template.aiModel,
          difficulty: template.difficulty,
          tags: tags
        });
      });
    });
  });

  return database;
}

// Global variable containing the 2700 structured prompts
export const PROMPTS_DATABASE = generatePromptsDatabase();

console.log(`NSNexus database initialized with ${PROMPTS_DATABASE.length} prompts.`);
